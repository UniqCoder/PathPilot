import { NextResponse } from "next/server";
import { createBattleRoom } from "@/lib/battleStore";
import type { BattleProfile } from "@/lib/types";

type CreateBattleBody = {
  playerOne?: BattleProfile;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBattleBody;

    if (!isValidProfile(body.playerOne)) {
      return NextResponse.json({ error: "Invalid Player 1 profile" }, { status: 400 });
    }

    const room = await createBattleRoom(body.playerOne!);

    return NextResponse.json({
      battleId: room.id,
      joinLink: `/battle/join/${room.id}`,
      resultLink: `/battle/results/${room.id}?viewer=you`,
      status: room.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create battle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
