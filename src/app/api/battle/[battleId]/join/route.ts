import { NextResponse } from "next/server";
import { battleProfileToFormPayload, completeBattleRoom, getBattleRoom } from "@/lib/battleStore";
import { generateReportFromProfile } from "@/lib/reportEngine";
import type { BattleProfile } from "@/lib/types";

type JoinBattleBody = {
  playerTwo?: BattleProfile;
};

const isValidProfile = (profile: BattleProfile | undefined) => {
  if (!profile) return false;
  return Boolean(
    profile.name.trim() &&
      profile.branch &&
      profile.year &&
      profile.tier &&
      profile.goal &&
      profile.city &&
      profile.skills.length > 0
  );
};

export async function POST(
  request: Request,
  context: { params: Promise<{ battleId: string }> }
) {
  try {
    const { battleId } = await context.params;
    const body = (await request.json()) as JoinBattleBody;

    if (!isValidProfile(body.playerTwo)) {
      return NextResponse.json({ error: "Invalid Player 2 profile" }, { status: 400 });
    }

    const existing = await getBattleRoom(battleId);
    if (!existing) {
      return NextResponse.json({ error: "Battle room not found" }, { status: 404 });
    }

    if (existing.status === "completed") {
      return NextResponse.json({
        battleId,
        resultLinkForPlayerTwo: `/battle/results/${battleId}?viewer=friend`,
        resultLinkForPlayerOne: `/battle/results/${battleId}?viewer=you`,
        status: "completed",
        winnerStatement: existing.winnerStatement,
      });
    }

    const playerTwo = body.playerTwo!;

    const [playerOneReport, playerTwoReport] = await Promise.all([
      generateReportFromProfile(battleProfileToFormPayload(existing.playerOne)),
      generateReportFromProfile(battleProfileToFormPayload(playerTwo)),
    ]);

    const updated = await completeBattleRoom(battleId, playerTwo, playerOneReport, playerTwoReport);
    if (!updated) {
      return NextResponse.json({ error: "Failed to save battle result" }, { status: 500 });
    }

    return NextResponse.json({
      battleId,
      resultLinkForPlayerTwo: `/battle/results/${battleId}?viewer=friend`,
      resultLinkForPlayerOne: `/battle/results/${battleId}?viewer=you`,
      status: updated.status,
      winnerStatement: updated.winnerStatement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join battle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
