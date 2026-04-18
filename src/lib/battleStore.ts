import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { BattleProfile, BattleRoom, BattleWinner, FormPayload, ReportData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const BATTLE_FILE = path.join(DATA_DIR, "battle_rooms.json");

const ensureFile = async () => {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(BATTLE_FILE, "utf8");
  } catch (error) {
    await writeFile(BATTLE_FILE, "[]", "utf8");
  }
};

const readRooms = async () => {
  await ensureFile();
  const raw = await readFile(BATTLE_FILE, "utf8");
  try {
    return JSON.parse(raw) as BattleRoom[];
  } catch (error) {
    return [];
  }
};

const writeRooms = async (rooms: BattleRoom[]) => {
  await ensureFile();
  await writeFile(BATTLE_FILE, JSON.stringify(rooms, null, 2), "utf8");
};

const makeId = () => `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const createBattleRoom = async (playerOne: BattleProfile) => {
  const now = new Date().toISOString();
  const room: BattleRoom = {
    id: makeId(),
    status: "waiting",
    createdAt: now,
    updatedAt: now,
    playerOne,
    playerTwo: null,
    playerOneReport: null,
    playerTwoReport: null,
    winner: null,
    winnerStatement: null,
  };

  const rooms = await readRooms();
  rooms.push(room);
  await writeRooms(rooms);
  return room;
};

export const getBattleRoom = async (battleId: string) => {
  const rooms = await readRooms();
  return rooms.find((room) => room.id === battleId) ?? null;
};

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
  return `Both fighters are tied right now. The next 90 days decide who survives ⚔️`;
};

const evaluateWinner = (playerOneReport: ReportData, playerTwoReport: ReportData): BattleWinner => {
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

export const completeBattleRoom = async (
  battleId: string,
  playerTwo: BattleProfile,
  playerOneReport: ReportData,
  playerTwoReport: ReportData
) => {
  const rooms = await readRooms();
  const index = rooms.findIndex((room) => room.id === battleId);
  if (index === -1) {
    return null;
  }

  const winner = evaluateWinner(playerOneReport, playerTwoReport);
  const room = rooms[index];
  const updated: BattleRoom = {
    ...room,
    status: "completed",
    updatedAt: new Date().toISOString(),
    playerTwo,
    playerOneReport,
    playerTwoReport,
    winner,
    winnerStatement: buildWinnerStatement(winner, room.playerOne.name, playerTwo.name),
  };

  rooms[index] = updated;
  await writeRooms(rooms);
  return updated;
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
