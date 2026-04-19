import { createBattleRoom } from "@/lib/battleStore";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/ratelimit";
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
    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const rateLimit = await checkRateLimit("battle-create", user.id, 5);
    if (!rateLimit.allowed) {
      return apiError(rateLimit.message || "Too many requests", 429);
    }

    const body = (await request.json()) as CreateBattleBody;

    if (!isValidProfile(body.playerOne)) {
      return apiError("Invalid Player 1 profile", 400);
    }

    const room = await createBattleRoom(body.playerOne!);

    return apiSuccess({
      battleId: room.id,
      joinLink: `/battle/join/${room.id}`,
      resultLink: `/battle/results/${room.id}?viewer=you`,
      status: room.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create battle";
    return apiError(message, 500);
  }
}
