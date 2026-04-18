export type FormPayload = {
  branch: string;
  year: string;
  tier: string;
  skills: string[];
  goal: string;
  city: string;
  timeline: string;
  email: string;
  projectsCount: number;
  projectDomain: string;
  projectProblem: string;
};

export type Pivot = {
  title: string;
  why: string;
  first_step: string;
};

export type WeekPlanItem = {
  week: number;
  action: string;
  title?: string;
  focus?: string;
  tasks?: string[];
  deliverable?: string;
  weekly_report?: string;
  market_signal?: string;
  differentiation?: string;
  resources?: string[];
};

export type ProjectIdea = {
  name: string;
  stack: string;
  why_it_matters: string;
};

export type RiskBreakdownItem = {
  key: string;
  label: string;
  impact: number;
  detail: string;
};

export type ReportData = {
  risk_score: number;
  risk_reason: string;
  risk_breakdown?: RiskBreakdownItem[];
  dead_skills: string[];
  safe_skills: string[];
  pivot_1: Pivot;
  pivot_2: Pivot;
  week_plan: WeekPlanItem[];
  projects: ProjectIdea[];
  communities: string[];
  peer_benchmark: string;
  market_snapshot?: string[];
};

export type BattleProfile = {
  name: string;
  branch: string;
  year: string;
  tier: string;
  skills: string[];
  goal: string;
  city: string;
};

export type BattleSession = {
  you: BattleProfile;
  friend: BattleProfile;
  yourReport: ReportData;
  friendReport: ReportData;
  generatedAt: string;
};

export type BattleWinner = "player_one" | "player_two" | "tie";

export type BattleRoom = {
  id: string;
  status: "waiting" | "completed";
  createdAt: string;
  updatedAt: string;
  playerOne: BattleProfile;
  playerTwo: BattleProfile | null;
  playerOneReport: ReportData | null;
  playerTwoReport: ReportData | null;
  winner: BattleWinner | null;
  winnerStatement: string | null;
};
