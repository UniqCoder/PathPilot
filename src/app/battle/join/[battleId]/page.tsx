"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import toast from "react-hot-toast";
import BattleProfileForm, {
  emptyBattleProfile,
  isBattleProfileValid,
} from "@/components/BattleProfileForm";
import { trackEvent } from "@/lib/analytics";
import type { BattleProfile, BattleRoom } from "@/lib/types";

type JoinResponse = {
  resultLinkForPlayerTwo: string;
};

export default function BattleJoinPage() {
  const params = useParams<{ battleId: string }>();
  const router = useRouter();
  const battleId = params.battleId;

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [playerTwo, setPlayerTwo] = useState<BattleProfile>(emptyBattleProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  const canSubmit = useMemo(() => isBattleProfileValid(playerTwo) && !isSubmitting, [playerTwo, isSubmitting]);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const response = await fetch(`/api/battle/${battleId}`);
        if (!response.ok) {
          throw new Error("Battle room missing");
        }
        const payload = (await response.json()) as BattleRoom;
        setRoom(payload);
      } catch {
        setError("This battle link is invalid or expired.");
      }
    };

    loadRoom();
  }, [battleId]);

  useEffect(() => {
    if (!isSubmitting) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 850);

    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleJoin = async () => {
    if (!canSubmit) {
      setError("Complete your profile before joining the battle.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    setCountdown(5);

    try {
      const response = await fetch(`/api/battle/${battleId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerTwo }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to join battle");
      }

      const payload = (await response.json()) as JoinResponse;
      trackEvent("battle_started", { battleId, role: "player_two" });
      toast.success("Battle started. Calculating winner...");
      router.push(payload.resultLinkForPlayerTwo);
    } catch {
      setIsSubmitting(false);
      setError("Could not finish battle generation. Please retry.");
      toast.error("Could not finish battle generation. Please retry.");
    }
  };

  if (isSubmitting) {
    return (
      <div className="page">
        <main className="container">
          <div className="battle-loading card">
            <p className="hero-eyebrow">Battle Mode</p>
            <h1>AI is calculating who survives...</h1>
            <p className="helper">Running detailed profile analysis for both players.</p>
            <div className="countdown-ring">
              <span>{countdown}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page">
        <main className="container">
          <div className="card">
            <h1>Preparing battle room...</h1>
            {error && <p className="error">{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  if (room.status === "completed") {
    return (
      <div className="page">
        <main className="container">
          <div className="card">
            <h1>This battle is already completed.</h1>
            <p>{room.winnerStatement}</p>
            <div className="hero-actions">
              <a className="button primary" href={`/battle/results/${room.id}?viewer=friend`}>
                View Battle Result
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="container">
        <div className="reveal" style={{ "--delay": "0.05s" } as CSSProperties}>
          <p className="hero-eyebrow">Battle Join</p>
          <h1>Player 2 joined the arena.</h1>
          <p>Submit your profile to complete the face-off and reveal who survives.</p>
        </div>

        <section className="section battle-grid">
          <div className="battle-slot battle-player-one">
            <BattleProfileForm
              title="Player 1 Profile"
              subtitle="Locked by the invite creator"
              profile={room.playerOne}
              onChange={() => {}}
              readOnly
            />
          </div>

          <div className="battle-divider" aria-hidden="true">
            <span>VS</span>
            <strong>🔥⚔️🔥</strong>
          </div>

          <div className="battle-slot battle-player-two">
            <BattleProfileForm
              title="Player 2: Your Profile"
              subtitle="Fill this card to join. Player 1 is read-only."
              profile={playerTwo}
              onChange={setPlayerTwo}
            />
          </div>
        </section>

        <div className="hero-actions battle-actions">
          <button className="button primary" type="button" onClick={handleJoin}>
            Start Battle Analysis
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}
