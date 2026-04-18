import { NextResponse } from "next/server";
import { getBattleRoom } from "@/lib/battleStore";

export async function GET(
  request: Request,
  context: { params: Promise<{ battleId: string }> }
) {
  try {
    const { battleId } = await context.params;
    const room = await getBattleRoom(battleId);

    if (!room) {
      return NextResponse.json({ error: "Battle room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch battle room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
