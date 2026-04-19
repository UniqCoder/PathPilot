"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import BattleProfileForm, {
  emptyBattleProfile,
  isBattleProfileValid,
} from "@/components/BattleProfileForm";
import { trackEvent } from "@/lib/analytics";
import type { BattleRoom, BattleProfile } from "@/lib/types";

type CreateBattleResponse = {
  success: boolean;
  data?: {
    battleId: string;
    joinLink: string;
    resultLink: string;
    status: string;
  };
  error?: string;
};

type InviteData = {
  battleId: string;
  joinLink: string;
  resultLink: string;
  status: string;
};

export default function BattleModeForm() {
  const [playerOne, setPlayerOne] = useState<BattleProfile>(emptyBattleProfile);
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [battleRoom, setBattleRoom] = useState<BattleRoom | null>(null);

  const canCreate = useMemo(() => isBattleProfileValid(playerOne) && !isCreating, [playerOne, isCreating]);
  const joinUrl = invite ? `${window.location.origin}${invite.joinLink}` : "";

  useEffect(() => {
    if (!invite?.battleId) return;

    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const schedulePoll = (delayMs: number) => {
      if (disposed) return;
      pollTimer = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    const poll = async () => {
      if (disposed) return;

      if (document.hidden) {
        schedulePoll(9000);
        return;
      }

      try {
        const response = await fetch(`/api/battle/${invite.battleId}`, { cache: "no-store" });
        if (!response.ok) {
          schedulePoll(7000);
          return;
        }

        const room = (await response.json()) as BattleRoom;
        setBattleRoom(room);

        if (room.status !== "completed") {
          schedulePoll(4500);
        }
      } catch {
        // Polling failures should not break UI.
        schedulePoll(7000);
      }
    };

    const handleVisibility = () => {
      if (disposed || document.hidden) return;
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      void poll();
    };

    void poll();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [invite?.battleId]);

  const handleCreate = async () => {
    if (!canCreate) {
      setError("Complete all Player 1 fields before generating a battle link.");
      return;
    }

    setError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/battle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerOne }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to create battle");
      }

      const payload = (await response.json()) as CreateBattleResponse;
      if (!payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to create battle");
      }

      setInvite(payload.data);
      trackEvent("battle_created", { battleId: payload.data.battleId, mode: "invite" });
      toast.success("Battle invite generated.");
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Could not create battle link. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!invite) return;

    try {
      await navigator.clipboard.writeText(joinUrl);
      setIsCopied(true);
      toast.success("Battle link copied.");
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setError("Copy failed. Please copy the link manually.");
      toast.error("Copy failed. Please copy the link manually.");
    }
  };

  if (invite) {
    return (
      <div className="card battle-invite-card">
        <p className="hero-eyebrow">Battle Invite Ready</p>
        <h2>Player 1 locked in. Send this link to your friend.</h2>
        <p className="helper">
          Once Player 2 submits their profile, both reports will be generated and your winner board will auto-update.
        </p>

        <div className="section" style={{ paddingTop: "18px", paddingBottom: "18px" }}>
          <input className="field" value={joinUrl} readOnly />
        </div>

        <div className="hero-actions battle-actions">
          <button className="button primary" type="button" onClick={handleCopy}>
            {isCopied ? "Copied" : "Copy Battle Link"}
          </button>
          <Link className="button ghost" href={invite.resultLink}>
            Open My Result Board
          </Link>
        </div>

        <div className="section" style={{ paddingTop: "20px", paddingBottom: "0" }}>
          <div className="card subtle">
            <p className="hero-eyebrow">Live Status</p>
            <h3>
              {battleRoom?.status === "completed"
                ? "Battle complete"
                : "Waiting for Player 2 to join..."}
            </h3>
            {battleRoom?.winnerStatement && <p>{battleRoom.winnerStatement}</p>}
            {battleRoom?.status === "completed" && (
              <div className="hero-actions" style={{ marginTop: "14px" }}>
                <Link className="button primary" href={invite.resultLink}>
                  View Final Winner Statement
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BattleProfileForm
        title="Player 1: Your Profile"
        subtitle="Set your profile first. Then PathPilot generates a join link for your friend."
        profile={playerOne}
        onChange={setPlayerOne}
      />

      <div className="hero-actions battle-actions">
        <button className="button primary" type="button" onClick={handleCreate}>
          {isCreating ? "Creating..." : "Generate Battle Link"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
