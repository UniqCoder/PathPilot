import { buildPrompt } from "./prompt";
import { marketSignals } from "./marketSignals";
import { sampleReport } from "./reportDefaults";
import type { FormPayload, ReportData, RiskBreakdownItem, WeekPlanItem } from "./types";

const GEMINI_MODEL = "gemini-2.0-flash";
const COMPANY_LOOKBACK_DAYS = 45;
const DAY_SECONDS = 24 * 60 * 60;

const COMPANY_FEEDS: CompanyFeed[] = [
  {
    company: "Google",
    source: "Google Developers Blog",
    url: "https://blog.google/technology/developers/rss/",
  },
  {
    company: "Meta",
    source: "Meta Engineering",
    url: "https://engineering.fb.com/feed/",
  },
  {
    company: "Netflix",
    source: "Netflix TechBlog",
    url: "https://netflixtechblog.com/feed",
  },
  {
    company: "AWS",
    source: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
  },
  {
    company: "Microsoft",
    source: "Microsoft Azure AI Blog",
    url: "https://techcommunity.microsoft.com/t5/ai-azure-ai-services-blog/bg-p/AzureAIBlog/rss",
  },
  {
    company: "OpenAI",
    source: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
  },
];

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "AI / LLM Applications": ["ai", "llm", "agents", "copilot", "prompt", "foundation model"],
  "Full Stack Web": ["web", "frontend", "backend", "api", "javascript", "react", "typescript"],
  "Mobile Apps": ["mobile", "android", "ios", "react native", "flutter"],
  "Data Engineering": ["data", "pipeline", "etl", "lakehouse", "warehouse", "spark"],
  "Machine Learning": ["machine learning", "model", "training", "inference", "mlops"],
  "Computer Vision": ["vision", "image", "video", "detection", "segmentation"],
  Cybersecurity: ["security", "threat", "vulnerability", "identity", "auth"],
  "Cloud / DevOps": ["cloud", "kubernetes", "docker", "devops", "infra", "deployment"],
  FinTech: ["payments", "banking", "risk", "fraud", "fintech"],
  HealthTech: ["health", "medical", "ehr", "clinical"],
  EdTech: ["learning", "education", "assessment", "classroom"],
  "E-commerce": ["commerce", "checkout", "catalog", "conversion"],
  "SaaS Productivity": ["productivity", "saas", "workflow", "automation"],
  "Developer Tools": ["developer", "tooling", "sdk", "platform", "compiler"],
  "Blockchain / Web3": ["blockchain", "web3", "wallet", "smart contract"],
  "IoT / Embedded": ["iot", "embedded", "firmware", "sensor"],
  "AR / VR": ["ar", "vr", "spatial", "immersive"],
  Gaming: ["gaming", "game", "engine", "rendering"],
  "Automation / RPA": ["automation", "rpa", "robotic process"],
  "Climate / Energy Tech": ["climate", "energy", "sustainability", "grid"],
};

type MarketSignals = {
  rising_skills: string[];
  decaying_skills: string[];
  city_hiring: Record<string, string>;
  automation_risk: Record<string, number>;
};

type LiveSkillSignal = {
  skill: string;
  company_moves_45d: number;
  headlines: string[];
  momentum: "high" | "steady" | "low";
};

type LiveMarketSnapshot = {
  captured_at: string;
  lookback_days: number;
  skills: LiveSkillSignal[];
  companies_observed: string[];
  summary_lines: string[];
};

type CompanyFeed = {
  company: string;
  source: string;
  url: string;
};

type CompanyRadarItem = {
  company: string;
  source: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
};

type MarketStanding = "below median" | "mid-band" | "above median";

type RiskComputation = {
  score: number;
  cityState: string;
  avgSkillRisk: number;
  tierDelta: number;
  yearDelta: number;
  goalDelta: number;
  cityDelta: number;
  projectDelta: number;
  scalabilityDelta: number;
  projectScalabilityScore: number;
  projectScalabilitySummary: string;
  decayingHits: string[];
  risingHits: string[];
  standing: MarketStanding;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toSafeNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatIndianDateTime = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const parseReport = (text: string): ReportData => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const sliced = start >= 0 && end >= 0 ? candidate.slice(start, end + 1) : candidate;
  const cleaned = sliced.replace(/\uFEFF/g, "").replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned) as ReportData;
};

const QUALIFIER_TOKENS = new Set([
  "basic",
  "junior",
  "entry",
  "manual",
  "queries",
  "query",
  "crud",
  "role",
  "roles",
]);

const STACKOVERFLOW_TAG_OVERRIDES: Record<string, string> = {
  react: "reactjs",
  "node js": "node.js",
  "node.js": "node.js",
  "c++": "c++",
  ml: "machine-learning",
  "data analysis": "pandas",
  aws: "amazon-web-services",
  cybersecurity: "security",
};

const RESOURCE_HINTS: Record<string, string> = {
  react: "https://react.dev/learn",
  java: "https://spring.io/guides",
  python: "https://docs.python.org/3/tutorial/",
  "node.js": "https://nodejs.org/en/learn",
  sql: "https://www.postgresql.org/docs/current/tutorial-sql.html",
  aws: "https://docs.aws.amazon.com/",
  docker: "https://docs.docker.com/get-started/",
  "data analysis": "https://pandas.pydata.org/docs/getting_started/index.html",
  ml: "https://scikit-learn.org/stable/tutorial/index.html",
  cybersecurity: "https://owasp.org/www-project-top-ten/",
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();

const tokenize = (value: string) => normalizeText(value).split(/\s+/).filter(Boolean);

const hasQualifier = (tokens: string[]) => tokens.some((token) => QUALIFIER_TOKENS.has(token));

const isSkillMatch = (skill: string, signal: string) => {
  const skillNorm = normalizeText(skill);
  const signalNorm = normalizeText(signal);

  if (!skillNorm || !signalNorm) return false;
  if (skillNorm === signalNorm) return true;

  const skillTokens = tokenize(skill);
  const signalTokens = tokenize(signal);

  if (skillTokens.length === 1 && signalTokens.length === 1) {
    return skillTokens[0] === signalTokens[0];
  }

  const signalHasQualifier = hasQualifier(signalTokens);
  const skillHasQualifier = hasQualifier(skillTokens);

  // Prevent over-penalizing broad skills (for example Java vs "Junior Java dev roles").
  if (skillTokens.length === 1 && signalTokens.length > 1 && signalHasQualifier && !skillHasQualifier) {
    return false;
  }

  const overlap = skillTokens.filter((token) => signalTokens.includes(token)).length;
  if (overlap === 0) return false;

  const smaller = Math.min(skillTokens.length, signalTokens.length);
  return overlap / smaller >= 0.6;
};

const skillRiskFromSignals = (skill: string, automationRisk: Record<string, number>) => {
  const entries = Object.entries(automationRisk);
  for (const [key, value] of entries) {
    if (isSkillMatch(skill, key)) {
      return value;
    }
  }
  return 54;
};

const dedupeNormalized = (values: string[]) =>
  values.filter(
    (value, index, all) =>
      all.findIndex((candidate) => normalizeText(candidate) === normalizeText(value)) === index
  );

const nonEmptyString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const nonEmptyStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => nonEmptyString(item)).filter(Boolean)
    : [];

const removeVideoInstruction = (value: string) => {
  if (!/video/i.test(value)) {
    return value;
  }

  return "Write a concise implementation note with screenshots, architecture decisions, and measurable outcomes.";
};

const fetchTextWithTimeout = async (url: string, timeoutMs = 4200): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const decodeEntities = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();

const extractXmlTag = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
};

const parseRssItems = (xml: string, feed: CompanyFeed): CompanyRadarItem[] => {
  const chunks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return chunks
    .map((chunk) => {
      const title = extractXmlTag(chunk, "title");
      const link = extractXmlTag(chunk, "link");
      const summary = extractXmlTag(chunk, "description") || extractXmlTag(chunk, "content:encoded");
      const pubDate = extractXmlTag(chunk, "pubDate");

      return {
        company: feed.company,
        source: feed.source,
        title,
        link,
        summary,
        publishedAt: pubDate || null,
      };
    })
    .filter((item) => item.title && item.link);
};

const isItemRecent = (item: CompanyRadarItem, lookbackDays: number) => {
  if (!item.publishedAt) {
    return true;
  }

  const publishedMs = new Date(item.publishedAt).getTime();
  if (Number.isNaN(publishedMs)) {
    return true;
  }

  return Date.now() - publishedMs <= lookbackDays * DAY_SECONDS * 1000;
};

const matchesAnyKeyword = (text: string, keywords: string[]) => {
  const normalizedText = normalizeText(text);
  return keywords.some((keyword) => normalizedText.includes(normalizeText(keyword)));
};

const classifyMomentum = (companyMoveCount: number) => {
  const score = companyMoveCount;

  if (score >= 7) {
    return "high" as const;
  }

  if (score >= 3) {
    return "steady" as const;
  }

  return "low" as const;
};

const fetchCompanyRadarItems = async (): Promise<CompanyRadarItem[]> => {
  const settled = await Promise.allSettled(
    COMPANY_FEEDS.map(async (feed) => {
      const rawXml = await fetchTextWithTimeout(feed.url, 4800);
      if (!rawXml) {
        return [] as CompanyRadarItem[];
      }

      return parseRssItems(rawXml, feed);
    })
  );

  return settled
    .filter((result): result is PromiseFulfilledResult<CompanyRadarItem[]> => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .filter((item) => isItemRecent(item, COMPANY_LOOKBACK_DAYS));
};

const findSkillKeywords = (skill: string) => {
  const normalized = normalizeText(skill);
  const override = STACKOVERFLOW_TAG_OVERRIDES[normalized];
  const tokens = dedupeNormalized([skill, ...(override ? [override] : []), ...tokenize(skill)]);
  return tokens.filter(Boolean);
};

const buildLiveSignalForSkill = (
  skill: string,
  radarItems: CompanyRadarItem[],
  fallbackItems: CompanyRadarItem[]
): LiveSkillSignal => {
  const keywords = findSkillKeywords(skill);
  const relevant = radarItems.filter((item) => matchesAnyKeyword(`${item.title} ${item.summary}`, keywords));

  const directMoves = dedupeNormalized(
    relevant.map((item) => `${item.company}: ${item.title} (${item.link})`)
  ).slice(0, 3);

  const fallbackMoves = dedupeNormalized(
    fallbackItems.map((item) => `${item.company}: ${item.title} (${item.link})`)
  ).slice(0, 2);

  const topMoves = directMoves.length > 0 ? directMoves : fallbackMoves;

  return {
    skill,
    company_moves_45d: relevant.length,
    headlines: topMoves,
    momentum: classifyMomentum(relevant.length),
  };
};

const buildLiveMarketSnapshot = async (profile: FormPayload): Promise<LiveMarketSnapshot | null> => {
  const selectedSkills = dedupeNormalized(profile.skills).slice(0, 4);

  if (selectedSkills.length === 0) {
    return null;
  }

  const radarItems = await fetchCompanyRadarItems();
  if (radarItems.length === 0) {
    return null;
  }

  const domainKeywords = getProjectDomainKeywords(profile.projectDomain);
  const domainFallbackItems = radarItems.filter((item) =>
    matchesAnyKeyword(`${item.title} ${item.summary}`, domainKeywords)
  );
  const fallbackItems = domainFallbackItems.length > 0 ? domainFallbackItems : radarItems;

  const signals = selectedSkills.map((skill) =>
    buildLiveSignalForSkill(skill, radarItems, fallbackItems)
  );

  if (signals.length === 0) {
    return null;
  }

  const summaryLines = signals.map((signal) => {
    const latestMove = signal.headlines[0]
      ? `Latest major move: ${signal.headlines[0]}`
      : "No direct major-company move mapped for this skill in the current window.";

    return `${signal.skill}: ${signal.company_moves_45d} direct major-company updates in ${COMPANY_LOOKBACK_DAYS} days; momentum ${signal.momentum}. ${latestMove}`;
  });

  return {
    captured_at: new Date().toISOString(),
    lookback_days: COMPANY_LOOKBACK_DAYS,
    skills: signals,
    companies_observed: dedupeNormalized(radarItems.map((item) => item.company)),
    summary_lines: summaryLines,
  };
};

const getMarketSignalLine = (
  week: number,
  profile: FormPayload,
  liveSnapshot: LiveMarketSnapshot | null,
  fallbackSkill: string
) => {
  const signal = liveSnapshot?.skills[(week - 1) % (liveSnapshot?.skills.length || 1)];

  if (signal) {
    const latestHeadline = signal.headlines[0]
      ? `Latest company update: ${signal.headlines[0]}`
      : "Direct major-company update unavailable in the current window.";

    return `${signal.skill} market pulse: ${signal.company_moves_45d} major-company updates in ${COMPANY_LOOKBACK_DAYS} days; momentum ${signal.momentum}. ${latestHeadline}.`;
  }

  return `${fallbackSkill} demand remains relevant in ${profile.city}. Track major company platform moves each week and align deliverables accordingly.`;
};

const getGoalFitLine = (profile: FormPayload) => {
  if (profile.goal === "Startup") {
    return "Focus on user conversations and shipping speed before adding extra features.";
  }

  if (profile.goal === "Abroad") {
    return "Document architecture decisions in clear English to improve global interview readiness.";
  }

  if (profile.goal === "Freelance") {
    return "Optimize for portfolio proof and client-facing outcomes each week.";
  }

  return "Optimize for hiring signal depth: outcomes, quality, and repeatable execution.";
};

const WEEK_TITLES = [
  "Baseline Audit and Targeting",
  "Skill Signal Sprint",
  "Flagship Project Architecture",
  "Production Foundation",
  "Data and Metrics Layer",
  "Case Study and Storytelling",
  "Network and Referral Sprint",
  "Second Project for Portfolio Breadth",
  "Interview Asset Packaging",
  "Application and Iteration Engine",
  "Advanced Interview Readiness",
  "Final Positioning and Relaunch",
];

const buildWeekTasks = (
  week: number,
  profile: FormPayload,
  primarySkill: string,
  secondarySkill: string
) => {
  switch (week) {
    case 1:
      return [
        `Review 20 current job posts in ${profile.city} and capture top 15 recurring requirements in a tracker.`,
        "Rewrite resume bullets into impact format: action, metric, business result (minimum 8 bullets).",
        "Clean GitHub: archive weak repos and pin exactly 4 high-signal projects with clear READMEs.",
        "Record baseline metrics: interview calls, profile views, coding speed, and weekly deep-work hours.",
      ];
    case 2:
      return [
        `Build one narrowly scoped feature using ${primarySkill} that solves one real workflow.`,
        "Write tests for 5 core flows and enforce linting and formatting before each commit.",
        "Write a technical implementation note with screenshots, architecture choices, and before-after metrics.",
        "Collect feedback from at least 3 seniors or practitioners and log requested changes.",
      ];
    case 3:
      return [
        "Write a one-page PRD with user segment, core problem, and measurable value metric.",
        `Create a technical architecture draft combining ${primarySkill} and ${secondarySkill}.`,
        "Break implementation into 3 milestones with acceptance criteria.",
        "Prepare a risk register for data quality, performance, and deployment failure modes.",
      ];
    case 4:
      return [
        "Set up auth and role-based access for at least 2 user roles.",
        "Add structured logs, request tracing, and error capture for critical endpoints.",
        "Create a CI pipeline with automated checks for build, lint, and tests.",
        "Deploy staging and production environments with rollback notes.",
      ];
    case 5:
      return [
        "Define 5 north-star and health metrics: activation, retention, success rate, latency, failure rate.",
        "Implement analytics events for critical user actions.",
        "Create one weekly metrics report template with trend comments.",
        "Set alert thresholds for latency and error spikes.",
      ];
    case 6:
      return [
        "Write a case study with context, decisions, trade-offs, and measurable outcome.",
        "Create a one-page architecture review sheet with alternatives you rejected and why.",
        "Run a peer code review session and resolve at least 5 actionable review comments.",
        "Build a short interview preparation note from your project decisions and failures.",
      ];
    case 7:
      return [
        "Reach out to 15 professionals with personalized notes tied to their recent work.",
        "Request 5 short calls focused on hiring patterns and portfolio feedback.",
        "Share one targeted artifact before each call: code sample, case study, or architecture note.",
        "Log objections and convert them into next-week improvement tasks.",
      ];
    case 8:
      return [
        `Build project #2 around a distinct workflow from your flagship project using ${secondarySkill}.`,
        "Keep scope strict: complete MVP in 5 days and polish in 2 days.",
        "Publish benchmark comparison between project #1 and project #2 use-cases.",
        "Document reuse opportunities and technical debt list.",
      ];
    case 9:
      return [
        "Prepare 3 resume variants mapped to backend, product, and AI-enabled role tracks.",
        "Create a one-page project summary PDF for each flagship project.",
        "Draft 15 STAR stories from real project incidents and decisions.",
        "Set up a mock interview panel with 2 peers and 1 senior reviewer.",
      ];
    case 10:
      return [
        "Submit 20 high-fit applications with customized opening lines and project links.",
        "Track response funnel: sent, viewed, replied, interview, shortlist.",
        "A/B test 2 resume headers and 2 project-order formats.",
        "Send follow-ups at day 4 and day 8 with concise value updates.",
      ];
    case 11:
      return [
        "Run 3 timed technical mock interviews with whiteboard-style trade-off questions.",
        "Prepare failure stories and turnaround stories backed by project evidence.",
        "Rehearse architecture explanation in 2 formats: 2-minute and 8-minute versions.",
        "Build a rapid revision sheet for recurring weak topics.",
      ];
    default:
      return [
        "Publish final portfolio update and pin your two strongest case studies.",
        "Rewrite elevator pitch to include quantified outcomes and differentiation.",
        "Create a 30-day follow-up plan for continuous shipping and networking.",
        "Review all metrics from week 1 to week 12 and document growth proof.",
      ];
  }
};

const makeWeekBlueprint = (
  week: number,
  profile: FormPayload,
  liveSnapshot: LiveMarketSnapshot | null
): WeekPlanItem => {
  const primarySkill = profile.skills[0] ?? "problem solving";
  const secondarySkill = profile.skills[1] ?? "communication";
  const goalFitLine = getGoalFitLine(profile);

  const title = WEEK_TITLES[week - 1] ?? `Execution Week ${week}`;
  const focus =
    week === 1
      ? `Define your target role in ${profile.city} and remove low-signal profile noise.`
      : week === 2
        ? `Ship one focused feature using ${primarySkill} with measurable output quality.`
        : week === 7
          ? `Build high-quality conversations aligned with ${profile.goal.toLowerCase()} opportunities.`
          : `Execute a high-signal outcome around ${primarySkill} and ${secondarySkill}.`;

  const action =
    week === 1
      ? `Audit profile quality and set measurable baseline metrics for ${profile.goal.toLowerCase()} outcomes.`
      : week === 2
        ? "Complete a 7-day build sprint and document what you learned with measurable quality checks."
        : week === 3
          ? "Convert project idea into architecture, backlog, and milestone plan."
          : week === 10
            ? "Apply with quality control and optimize based on conversion metrics."
            : "Execute focused tasks and capture measurable outcomes every week.";

  const resources = [
    RESOURCE_HINTS[normalizeText(primarySkill)] ?? "https://roadmap.sh/",
    "https://www.linkedin.com/",
    "https://github.com/",
  ].slice(0, 3);

  return {
    week,
    title,
    focus: `${focus} ${goalFitLine}`,
    action,
    tasks: buildWeekTasks(week, profile, primarySkill, secondarySkill),
    deliverable: `Week ${week} output package with visible evidence and quality notes.`,
    weekly_report:
      "Report: tasks completed, measurable outcomes, blocker removal, and one improvement decision for next week.",
    market_signal: getMarketSignalLine(week, profile, liveSnapshot, primarySkill),
    differentiation:
      "Most peers stay generic. You are building proof-of-work, metrics, and decision clarity each week.",
    resources,
  };
};

const normalizeWeekPlan = (
  weekPlan: WeekPlanItem[],
  profile: FormPayload,
  liveSnapshot: LiveMarketSnapshot | null
): WeekPlanItem[] => {
  const planByWeek = new Map<number, WeekPlanItem>();

  weekPlan.forEach((item) => {
    if (typeof item.week !== "number") {
      return;
    }
    const safeWeek = Math.min(12, Math.max(1, Math.floor(item.week)));
    planByWeek.set(safeWeek, item);
  });

  const normalized = Array.from({ length: 12 }, (_, index) => {
    const week = index + 1;
    const base = makeWeekBlueprint(week, profile, liveSnapshot);
    const candidate = planByWeek.get(week);
    const candidateTasks = nonEmptyStringArray(candidate?.tasks);
    const candidateResources = nonEmptyStringArray(candidate?.resources);
    const baseTasks = base.tasks ?? [base.action];
    const baseWeeklyReport =
      base.weekly_report ??
      "Report: tasks completed, measurable outcomes, blocker removal, and one improvement decision for next week.";

    return {
      week,
      title: nonEmptyString(candidate?.title) || base.title,
      focus:
        nonEmptyString(candidate?.focus).split(" ").length >= 10
          ? nonEmptyString(candidate?.focus)
          : base.focus,
      action: removeVideoInstruction(
        nonEmptyString(candidate?.action).split(" ").length >= 10
          ? nonEmptyString(candidate?.action)
          : base.action
      ),
      tasks:
        (candidateTasks.length >= 4 && candidateTasks.every((task) => task.split(" ").length >= 8)
          ? candidateTasks.slice(0, 4)
          : baseTasks)?.map((task) => removeVideoInstruction(task)),
      deliverable:
        nonEmptyString(candidate?.deliverable).split(" ").length >= 4
          ? nonEmptyString(candidate?.deliverable)
          : base.deliverable,
      weekly_report: removeVideoInstruction(
        nonEmptyString(candidate?.weekly_report).split(" ").length >= 8
          ? nonEmptyString(candidate?.weekly_report)
          : baseWeeklyReport
      ),
      market_signal:
        nonEmptyString(candidate?.market_signal).split(" ").length >= 5
          ? nonEmptyString(candidate?.market_signal)
          : base.market_signal,
      differentiation:
        nonEmptyString(candidate?.differentiation).split(" ").length >= 8
          ? nonEmptyString(candidate?.differentiation)
          : base.differentiation,
      resources: candidateResources.length > 0 ? candidateResources.slice(0, 3) : base.resources,
    };
  });

  return normalized;
};

const getProjectDomainKeywords = (projectDomain: string) => {
  const normalizedDomain = nonEmptyString(projectDomain);
  if (!normalizedDomain) {
    return ["software", "product"];
  }

  const mapped = DOMAIN_KEYWORDS[normalizedDomain] ?? [];
  const fallback = tokenize(normalizedDomain);
  return dedupeNormalized([...mapped, ...fallback]).filter(Boolean);
};

const analyzeProjectScalability = (
  profile: FormPayload,
  liveSnapshot: LiveMarketSnapshot | null
) => {
  const projectDomain = nonEmptyString(profile.projectDomain) || "General Software";
  const projectProblem = nonEmptyString(profile.projectProblem);
  const domainKeywords = getProjectDomainKeywords(projectDomain);

  const baseByDomain: Record<string, number> = {
    "AI / LLM Applications": 72,
    "Developer Tools": 70,
    "Cloud / DevOps": 68,
    "Data Engineering": 67,
    "Machine Learning": 67,
    "Cybersecurity": 66,
    FinTech: 64,
    "SaaS Productivity": 62,
    "Full Stack Web": 60,
    "Automation / RPA": 60,
    "Mobile Apps": 58,
    "E-commerce": 57,
    HealthTech: 56,
    EdTech: 55,
    Gaming: 52,
    "Blockchain / Web3": 50,
    "AR / VR": 49,
    "IoT / Embedded": 53,
    "Climate / Energy Tech": 59,
  };

  const base = baseByDomain[projectDomain] ?? 56;
  const problemWordCount = projectProblem.split(/\s+/).filter(Boolean).length;
  const outcomeSignal = /(save|reduce|increase|improve|faster|cost|revenue|users|time|latency|accuracy|conversion)/i.test(
    projectProblem
  );
  const scaleSignal = /(api|pipeline|real-time|queue|cache|multi-tenant|distributed|kubernetes|autoscale|fault)/i.test(
    projectProblem
  );

  const companyMovesForDomain = (liveSnapshot?.skills ?? []).reduce((sum, signal) => {
    const skillMatch = matchesAnyKeyword(signal.skill, domainKeywords);
    const headlineMatchCount = signal.headlines.filter((headline) =>
      matchesAnyKeyword(headline, domainKeywords)
    ).length;
    return sum + (skillMatch ? signal.company_moves_45d : headlineMatchCount);
  }, 0);

  const companyMomentumDelta =
    companyMovesForDomain >= 12 ? 8 : companyMovesForDomain >= 6 ? 4 : companyMovesForDomain >= 3 ? 1 : -3;
  const scopeClarityDelta =
    problemWordCount >= 22 ? 8 : problemWordCount >= 14 ? 4 : problemWordCount >= 8 ? 1 : -6;
  const outcomeDelta = outcomeSignal ? 5 : -4;
  const scaleDelta = scaleSignal ? 5 : -2;

  const score = Math.round(
    clamp(base + companyMomentumDelta + scopeClarityDelta + outcomeDelta + scaleDelta, 22, 94)
  );

  const summary =
    companyMovesForDomain > 0
      ? `${companyMovesForDomain} recent major-company signals map to your project domain.`
      : "No strong major-company signal matched your project domain in the current window.";

  return {
    score,
    summary,
  };
};

const computeRiskComputation = (
  profile: FormPayload,
  market: MarketSignals,
  liveSnapshot: LiveMarketSnapshot | null
): RiskComputation => {
  const tierImpact: Record<string, number> = {
    IIT: -12,
    NIT: -8,
    "State Govt": -2,
    "Private Tier 1": 4,
    "Private Tier 2": 9,
  };

  const yearImpact: Record<string, number> = {
    "1st year": -6,
    "2nd year": -2,
    "3rd year": 4,
    "4th year": 10,
  };

  const goalImpact: Record<string, number> = {
    Job: 7,
    Startup: 2,
    Freelance: 4,
    Abroad: 5,
    "Higher Studies": 1,
  };

  const projectsCount = clamp(Math.round(toSafeNumber(profile.projectsCount, 0)), 0, 25);

  const projectDelta =
    projectsCount >= 5 ? -9 : projectsCount >= 3 ? -5 : projectsCount >= 1 ? 2 : 8;
  const scalability = analyzeProjectScalability(profile, liveSnapshot);
  const scalabilityDelta =
    scalability.score >= 78 ? -9 : scalability.score >= 62 ? -4 : scalability.score >= 48 ? 2 : 8;

  const cityState =
    market.city_hiring[profile.city] ??
    (profile.city.toLowerCase().includes("tier") ? market.city_hiring.Tier2 : "moderate");
  const cityDelta = cityState === "hot" ? -7 : cityState === "moderate" ? 2 : 9;

  const skillRisks = profile.skills.map((skill) => skillRiskFromSignals(skill, market.automation_risk));
  const avgSkillRisk = skillRisks.length
    ? skillRisks.reduce((sum, value) => sum + value, 0) / skillRisks.length
    : 58;

  const decayingHits = profile.skills.filter((skill) =>
    market.decaying_skills.some((decay) => isSkillMatch(skill, decay))
  );

  const risingHits = profile.skills.filter((skill) =>
    market.rising_skills.some((rise) => isSkillMatch(skill, rise))
  );

  const rawRisk =
    24 +
    avgSkillRisk * 0.42 +
    (tierImpact[profile.tier] ?? 6) +
    (yearImpact[profile.year] ?? 3) +
    (goalImpact[profile.goal] ?? 4) +
    cityDelta +
    projectDelta +
    scalabilityDelta +
    decayingHits.length * 3 -
    risingHits.length * 2;

  const score = Math.round(clamp(rawRisk, 16, 95));
  const standing: MarketStanding = score <= 38 ? "above median" : score <= 68 ? "mid-band" : "below median";

  return {
    score,
    cityState,
    avgSkillRisk,
    tierDelta: tierImpact[profile.tier] ?? 6,
    yearDelta: yearImpact[profile.year] ?? 3,
    goalDelta: goalImpact[profile.goal] ?? 4,
    cityDelta,
    projectDelta,
    scalabilityDelta,
    projectScalabilityScore: scalability.score,
    projectScalabilitySummary: scalability.summary,
    decayingHits,
    risingHits,
    standing,
  };
};

const buildDetailedRiskReason = (
  profile: FormPayload,
  riskScore: number,
  computation: RiskComputation,
  liveSnapshot: LiveMarketSnapshot | null
) => {
  const factorLines = [
    `Skill exposure contributes strongly (avg automation pressure ${Math.round(computation.avgSkillRisk)}/100).`,
    `Tier + year pressure contributes ${computation.tierDelta + computation.yearDelta >= 0 ? "upward" : "downward"} risk (${computation.tierDelta + computation.yearDelta >= 0 ? "+" : ""}${computation.tierDelta + computation.yearDelta}).`,
    `Execution proof currently includes ${Math.max(0, Math.round(toSafeNumber(profile.projectsCount, 0)))} completed projects.`,
    `Project scalability signal is ${computation.projectScalabilityScore}/100 for ${nonEmptyString(profile.projectDomain) || "your selected domain"}. ${computation.projectScalabilitySummary}`,
    `${profile.city} hiring climate is ${computation.cityState}.`,
  ];

  if (computation.decayingHits.length > 0) {
    factorLines.push(`Current stack overlap with decaying patterns: ${computation.decayingHits.join(", ")}.`);
  }

  if (computation.risingHits.length > 0) {
    factorLines.push(`You already have growth-aligned skills: ${computation.risingHits.join(", ")}.`);
  }

  const quickMoves: string[] = [];

  if (toSafeNumber(profile.projectsCount, 0) < 3) {
    quickMoves.push("Ship one production-style project with measurable outcomes and public documentation");
  }
  if (nonEmptyString(profile.projectProblem).split(/\s+/).filter(Boolean).length < 12) {
    quickMoves.push("Rewrite your project problem statement with users, measurable KPI, and scaling constraints");
  }
  if (computation.projectScalabilityScore < 60) {
    quickMoves.push("Refine project scope toward a higher-demand domain and architecture that can serve larger user loads");
  }

  const fallbackMove = "Prioritize one role-focused 30-day sprint with weekly metrics and recruiter-facing proof";
  const marketSignalTail =
    liveSnapshot && liveSnapshot.summary_lines.length > 0
      ? `Latest major-company stack evidence has been integrated from the last ${liveSnapshot.lookback_days} days.`
      : "Live market feeds were partially unavailable, so baseline weekly signals were used.";

  return `Your score is ${riskScore}/100. Current market standing: ${computation.standing}. ${factorLines.join(
    " "
  )} Fastest 30-day risk reduction: ${(quickMoves[0] ?? fallbackMove)}. ${marketSignalTail}`;
};

const signedFactor = (value: number) => Math.round(clamp(value, -15, 15));

const buildRiskBreakdown = (
  profile: FormPayload,
  computation: RiskComputation
): RiskBreakdownItem[] => {
  const trendImpact = computation.decayingHits.length * 3 - computation.risingHits.length * 2;
  const skillExposureImpact = signedFactor((computation.avgSkillRisk - 50) * 0.45);
  const collegeYearImpact = signedFactor(computation.tierDelta + computation.yearDelta);
  const projectEvidenceImpact = signedFactor(computation.projectDelta);
  const projectScalabilityImpact = signedFactor(computation.scalabilityDelta);
  const goalPressureImpact = signedFactor(computation.goalDelta);
  const cityImpact = signedFactor(computation.cityDelta);

  const items: RiskBreakdownItem[] = [
    {
      key: "skill_exposure",
      label: "Skill-Market Fit",
      impact: skillExposureImpact,
      detail: `Automation pressure across selected skills is ${Math.round(computation.avgSkillRisk)}/100.`,
    },
    {
      key: "college_year_pressure",
      label: "College + Year Pressure",
      impact: collegeYearImpact,
      detail: `${profile.year} in ${profile.tier} creates ${collegeYearImpact >= 0 ? "higher" : "lower"} competition pressure.`,
    },
    {
      key: "project_evidence",
      label: "Project Evidence",
      impact: projectEvidenceImpact,
      detail: `${Math.max(0, Math.round(toSafeNumber(profile.projectsCount, 0)))} completed projects currently support your execution credibility.`,
    },
    {
      key: "project_scalability",
      label: "Project Scalability",
      impact: projectScalabilityImpact,
      detail: `Scalability score ${computation.projectScalabilityScore}/100 for ${nonEmptyString(profile.projectDomain) || "selected project domain"}. ${computation.projectScalabilitySummary}`,
    },
    {
      key: "city_hiring",
      label: "City Hiring Climate",
      impact: cityImpact,
      detail: `${profile.city} hiring climate is ${computation.cityState}.`,
    },
    {
      key: "goal_track_pressure",
      label: "Goal Track Pressure",
      impact: goalPressureImpact,
      detail: `${profile.goal} track currently has ${goalPressureImpact >= 0 ? "higher" : "lower"} competitive pressure for this profile stage.`,
    },
    {
      key: "trend_alignment",
      label: "Trend Alignment",
      impact: signedFactor(trendImpact),
      detail:
        computation.risingHits.length > 0 || computation.decayingHits.length > 0
          ? `Rising overlap: ${computation.risingHits.join(", ") || "none"}; decaying overlap: ${computation.decayingHits.join(", ") || "none"}.`
          : "No strong rising or decaying overlap was detected for selected skills.",
    },
  ];

  return items;
};

const buildMarketSnapshotLines = (
  profile: FormPayload,
  market: MarketSignals,
  liveSnapshot: LiveMarketSnapshot | null
) => {
  const liveLines = liveSnapshot?.summary_lines ?? [];
  if (liveLines.length > 0 && liveSnapshot) {
    const totalCompanyMoves = liveSnapshot.skills.reduce(
      (sum, signal) => sum + signal.company_moves_45d,
      0
    );

    return dedupeNormalized([
      ...liveLines,
      `Data refreshed: ${formatIndianDateTime(liveSnapshot.captured_at)} (IST).`,
      `Major company radar: ${totalCompanyMoves} relevant updates from ${liveSnapshot.companies_observed.join(", ")} in the last ${liveSnapshot.lookback_days} days.`,
      `${profile.city} hiring climate is ${market.city_hiring[profile.city] ?? "moderate"}.`,
      "Action for you: mirror these company moves in your project architecture, metrics, and portfolio narrative.",
    ]).slice(0, 7);
  }

  return [
    `${profile.city} hiring climate is ${market.city_hiring[profile.city] ?? "moderate"}.`,
    `Top rising signals right now: ${market.rising_skills.slice(0, 3).join(", ")}.`,
    `Top decaying signals right now: ${market.decaying_skills.slice(0, 3).join(", ")}.`,
  ];
};

const isDeadSkillRelevant = (deadSkill: string, profileSkills: string[]) =>
  profileSkills.some(
    (profileSkill) =>
      isSkillMatch(profileSkill, deadSkill) ||
      isSkillMatch(deadSkill, profileSkill)
  );

const calibrateDeadSkills = (profileSkills: string[], deadSkills: string[]) => {
  const profileSkillSet = new Set(profileSkills.map((skill) => normalizeText(skill)));

  return deadSkills
    .map((skill) => {
      const normalized = normalizeText(skill);

      // Keep the message precise if the model emits an over-broad language label.
      if (normalized === "java" && profileSkillSet.has("java")) {
        return "Junior Java CRUD-only roles";
      }

      return skill;
    })
    .filter((skill) => isDeadSkillRelevant(skill, profileSkills))
    .filter((skill, index, all) => all.findIndex((item) => normalizeText(item) === normalizeText(skill)) === index);
};

const calibrateReport = (
  report: ReportData,
  profile: FormPayload,
  market: MarketSignals,
  liveSnapshot: LiveMarketSnapshot | null
): ReportData => {
  const computation = computeRiskComputation(profile, market, liveSnapshot);
  const calibratedDeadSkills = calibrateDeadSkills(profile.skills, report.dead_skills);

  const safeSkills = dedupeNormalized(report.safe_skills).filter(
    (skill) =>
      profile.skills.some((profileSkill) => isSkillMatch(profileSkill, skill) || isSkillMatch(skill, profileSkill)) ||
      skill.split(" ").length > 1
  );

  return {
    ...report,
    risk_reason: buildDetailedRiskReason(profile, report.risk_score, computation, liveSnapshot),
    risk_breakdown: buildRiskBreakdown(profile, computation),
    dead_skills: calibratedDeadSkills,
    safe_skills: safeSkills.length > 0 ? safeSkills : profile.skills.slice(0, 3),
    week_plan: normalizeWeekPlan(report.week_plan, profile, liveSnapshot),
    market_snapshot: buildMarketSnapshotLines(profile, market, liveSnapshot),
  };
};

const buildHeuristicReport = (
  profile: FormPayload,
  market: MarketSignals,
  liveSnapshot: LiveMarketSnapshot | null
): ReportData => {
  const computation = computeRiskComputation(profile, market, liveSnapshot);
  const risk = computation.score;

  const deadSkills = profile.skills.filter(
    (skill) =>
      skillRiskFromSignals(skill, market.automation_risk) >= 68 ||
      market.decaying_skills.some((decay) => isSkillMatch(skill, decay))
  );

  const safeSkills = profile.skills.filter(
    (skill) =>
      skillRiskFromSignals(skill, market.automation_risk) <= 38 ||
      market.rising_skills.some((rise) => isSkillMatch(skill, rise))
  );

  const mediumSafetySkills = profile.skills.filter(
    (skill) => skillRiskFromSignals(skill, market.automation_risk) < 60
  );

  const pivotOne =
    profile.goal === "Startup"
      ? {
          title: "AI-Native Founder Track",
          why: `In ${profile.city}, founders who build narrow AI products are attracting faster traction than service-heavy teams.`,
          first_step: "Ship a small paid MVP in 14 days and get 5 real users to pay before scaling.",
        }
      : {
          title: "AI Product Engineer",
          why: `${profile.city} hiring trends favor engineers who can build AI features end-to-end, not only write code tickets.`,
          first_step: "Build one production-style AI workflow and deploy it with monitoring.",
        };

  const pivotTwo =
    profile.goal === "Abroad"
      ? {
          title: "Cloud + Security Migration",
          why: "International hiring remains strongest in cloud security and platform engineering compared with junior feature roles.",
          first_step: "Complete one cloud-security project with architecture notes and threat controls.",
        }
      : {
          title: "Automation-Focused Analyst",
          why: `Companies in ${profile.city} are still hiring analysts who can automate operations with Python and cloud tools.`,
          first_step: "Automate one real workflow and measure time saved.",
        };

  const weekPlan = normalizeWeekPlan([], profile, liveSnapshot);

  const projects = [
    {
      name: `${profile.city} Hiring Signal Tracker`,
      stack: "Next.js, Supabase, Gemini API",
      why_it_matters: "Proves market-awareness and practical product execution.",
    },
    {
      name: "AI Interview Coach",
      stack: "TypeScript, Node.js, Prompt workflows",
      why_it_matters: "Shows you can design user-facing AI workflows with measurable value.",
    },
    {
      name: "Skill Risk Monitor",
      stack: "React, Charts, Scheduled jobs",
      why_it_matters: "Demonstrates data-driven thinking about career risk and automation.",
    },
  ];

  const benchmark =
    risk <= 40
      ? "You are currently ahead of most peers, but only if you keep shipping visible projects monthly."
      : risk <= 70
        ? "You are in the middle band: competitive, but one weak quarter can push you behind fast."
        : "You are currently behind the safer cohort; the next 90 days must focus on high-signal execution.";

  return {
    ...sampleReport,
    risk_score: risk,
    risk_reason: buildDetailedRiskReason(profile, risk, computation, liveSnapshot),
    risk_breakdown: buildRiskBreakdown(profile, computation),
    dead_skills: calibrateDeadSkills(profile.skills, deadSkills),
    safe_skills: safeSkills.length > 0 ? safeSkills : mediumSafetySkills.slice(0, 3),
    pivot_1: pivotOne,
    pivot_2: pivotTwo,
    week_plan: weekPlan,
    projects,
    communities: [
      "Product Folks",
      "Blr Devs",
      "Pesto Alumni Network",
      "Google Developer Groups",
    ],
    peer_benchmark: benchmark,
    market_snapshot: buildMarketSnapshotLines(profile, market, liveSnapshot),
  };
};

const readMarketSignals = async (): Promise<MarketSignals> => {
  return {
    rising_skills: marketSignals.rising_skills,
    decaying_skills: marketSignals.decaying_skills,
    city_hiring: marketSignals.city_hiring,
    automation_risk: marketSignals.automation_risk,
  };
};

const callGemini = async (
  profile: FormPayload,
  marketSignals: MarketSignals,
  liveSnapshot: LiveMarketSnapshot | null
) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API key missing");
  }

  const prompt = buildPrompt(
    profile,
    JSON.stringify(marketSignals),
    JSON.stringify(liveSnapshot ?? { note: "major-company live signals unavailable" })
  );

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.55 },
      }),
    }
  );

  const responseJson = await response.json();
  const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!response.ok || !text) {
    const message = responseJson?.error?.message ?? "Gemini request failed";
    throw new Error(message);
  }

  return parseReport(text);
};

export const generateReportFromProfile = async (profile: FormPayload) => {
  const marketSignals = await readMarketSignals();
  const liveSnapshot = await buildLiveMarketSnapshot(profile);

  try {
    const geminiReport = await callGemini(profile, marketSignals, liveSnapshot);

    if (
      typeof geminiReport.risk_score !== "number" ||
      !Array.isArray(geminiReport.dead_skills) ||
      !Array.isArray(geminiReport.week_plan)
    ) {
      throw new Error("Gemini returned invalid report shape");
    }

    return calibrateReport(geminiReport, profile, marketSignals, liveSnapshot);
  } catch {
    return buildHeuristicReport(profile, marketSignals, liveSnapshot);
  }
};
