import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BattleProfile, BattleRoom, BattleWinner, FormPayload, ReportData } from "./types";

const makeId = () => `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const buildWinnerStatement = (
  winner: BattleWinner,
  playerOneName: string,
  playerTwoName: string
) => {
  if (winner === "player_one") {
    return `${playerOneName} wins this battle and currently survives the AI era ⚔️`;
  }
  if (winner === "player_two") {
    return `${playerTwoName} wins this battle and currently survives the AI era ⚔️`;
  }
  return "Both fighters are tied right now. The next 90 days decide who survives ⚔️";
};

export const evaluateBattleWinner = (
  playerOneReport: ReportData,
  playerTwoReport: ReportData
): BattleWinner => {
  if (playerOneReport.risk_score < playerTwoReport.risk_score) {
    return "player_one";
  }
  if (playerTwoReport.risk_score < playerOneReport.risk_score) {
    return "player_two";
  }

  if (playerOneReport.dead_skills.length < playerTwoReport.dead_skills.length) {
    return "player_one";
  }
  if (playerTwoReport.dead_skills.length < playerOneReport.dead_skills.length) {
    return "player_two";
  }

  return "tie";
};

type BattleRow = {
  id: string;
  battle_id: string;
  creator_profile: BattleProfile | null;
  joiner_profile: BattleProfile | null;
  creator_report: ReportData | null;
  joiner_report: ReportData | null;
  winner: BattleWinner | null;
  status: "waiting" | "completed";
  created_at: string;
};

const mapRowToRoom = (row: BattleRow): BattleRoom => {
  const playerOne = row.creator_profile ?? {
    name: "Player One",
    branch: "",
    year: "",
    tier: "",
    skills: [],
    goal: "",
    city: "",
  };
  const playerTwo = row.joiner_profile;

  return {
    id: row.battle_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    playerOne,
    playerTwo,
    playerOneReport: row.creator_report,
    playerTwoReport: row.joiner_report,
    winner: row.winner,
    winnerStatement:
      row.winner && playerTwo
        ? buildWinnerStatement(row.winner, playerOne.name, playerTwo.name)
        : null,
  };
};

export const createBattleRoom = async (playerOne: BattleProfile) => {
  const battleId = makeId();

  const { data, error } = await supabaseAdmin
    .from("battles")
    .insert({
      battle_id: battleId,
      creator_profile: playerOne,
      status: "waiting",
    })
    .select(
      "id,battle_id,creator_profile,joiner_profile,creator_report,joiner_report,winner,status,created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create battle room");
  }

  return mapRowToRoom(data as BattleRow);
};

export const getBattleRoom = async (battleId: string) => {
  const { data, error } = await supabaseAdmin
    .from("battles")
    .select(
      "id,battle_id,creator_profile,joiner_profile,creator_report,joiner_report,winner,status,created_at"
    )
    .eq("battle_id", battleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to fetch battle room");
  }

  return data ? mapRowToRoom(data as BattleRow) : null;
};

export const completeBattleRoom = async (
  battleId: string,
  playerTwo: BattleProfile,
  playerOneReport: ReportData,
  playerTwoReport: ReportData
) => {
  const existing = await getBattleRoom(battleId);
  if (!existing) {
    return null;
  }

  const winner = evaluateBattleWinner(playerOneReport, playerTwoReport);

  const { data, error } = await supabaseAdmin
    .from("battles")
    .update({
      joiner_profile: playerTwo,
      creator_report: playerOneReport,
      joiner_report: playerTwoReport,
      winner,
      status: "completed",
    })
    .eq("battle_id", battleId)
    .select(
      "id,battle_id,creator_profile,joiner_profile,creator_report,joiner_report,winner,status,created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to complete battle room");
  }

  return mapRowToRoom(data as BattleRow);
};

export const battleProfileToFormPayload = (profile: BattleProfile): FormPayload => {
  const safeName = profile.name.trim().toLowerCase().replace(/\s+/g, ".") || "student";

  return {
    branch: profile.branch,
    year: profile.year,
    tier: profile.tier,
    skills: profile.skills,
    goal: profile.goal,
    city: profile.city,
    timeline: "6 months",
    email: `${safeName}@pathpilot.local`,
    projectsCount: 1,
    projectDomain: "Full Stack Web",
    projectProblem: "Build a real workflow product that saves measurable time for users.",
  };
};
