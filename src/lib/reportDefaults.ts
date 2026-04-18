import type { ReportData } from "./types";

export const sampleReport: ReportData = {
  risk_score: 74,
  risk_reason:
    "Your stack leans on oversupplied junior roles and low-signal projects. Without a pivot into AI-ready execution, your odds of landing interviews drop fast in the next 6 months.",
  risk_breakdown: [
    {
      key: "skill_exposure",
      label: "Skill-Market Fit",
      impact: 11,
      detail: "Current stack has partial overlap with high-competition entry-level role patterns.",
    },
    {
      key: "college_year_pressure",
      label: "College + Year Pressure",
      impact: 6,
      detail: "Final-year hiring timelines and tier competition are increasing shortlist pressure.",
    },
    {
      key: "project_evidence",
      label: "Project Evidence",
      impact: -5,
      detail: "Shipped projects with measurable outputs are reducing risk.",
    },
    {
      key: "project_scalability",
      label: "Project Scalability",
      impact: 5,
      detail: "Current project scope looks narrow versus high-growth market demand and platform-level scale expectations.",
    },
    {
      key: "city_hiring",
      label: "City Hiring Climate",
      impact: 3,
      detail: "Local hiring demand is moderate, which increases competition for generic profiles.",
    },
    {
      key: "trend_alignment",
      label: "Trend Alignment",
      impact: -3,
      detail: "Part of your skill set is aligned with currently rising market demand.",
    },
  ],
  dead_skills: ["Basic SQL queries", "Manual testing", "Junior Java dev roles"],
  safe_skills: ["System Design", "Cloud (AWS/GCP)", "MLOps"],
  pivot_1: {
    title: "AI-Enabled Product Engineer",
    why: "Indian startups are hiring builders who can ship AI features, not just run models.",
    first_step: "Ship a GenAI workflow using a real API and deploy it on Vercel.",
  },
  pivot_2: {
    title: "Cloud + Security Analyst",
    why: "Mid-size Indian IT firms are investing in cloud security faster than they can hire.",
    first_step: "Finish the AWS Cloud Practitioner course and document a security lab.",
  },
  week_plan: [
    {
      week: 1,
      action:
        "Audit your current projects and remove anything low-signal. Keep 1-2 strong projects that show impact, and write down what outcomes they achieved.",
    },
    {
      week: 2,
      action:
        "Learn prompt engineering basics and build a simple AI workflow. Document your assumptions, experiments, and final outcome in a short note.",
    },
    {
      week: 3,
      action:
        "Start an AI-enabled side project with a clear README that explains what it does, who it helps, and why it matters.",
    },
    {
      week: 4,
      action:
        "Study system design for one high-scale feature. Summarize the trade-offs in a one-page doc you can show in interviews.",
    },
    {
      week: 5,
      action:
        "Add monitoring and logging to your project. Capture errors, performance metrics, and user actions to prove production readiness.",
    },
    {
      week: 6,
      action:
        "Push your project to GitHub, write a case study, and include screenshots with measurable outcomes.",
    },
    {
      week: 7,
      action:
        "Network with 5 people in your target role. Ask for feedback on your project and what skills they hire for right now.",
    },
    {
      week: 8,
      action:
        "Build a second project focused on business outcomes. Make it measurable: time saved, cost reduced, or revenue impact.",
    },
    {
      week: 9,
      action:
        "Prepare a targeted resume and portfolio. Highlight AI-ready skills, real outcomes, and the top 2 projects.",
    },
    {
      week: 10,
      action:
        "Apply to 15 high-fit roles and track responses. Adjust your resume based on which roles respond fastest.",
    },
    {
      week: 11,
      action:
        "Run mock interviews focused on real project trade-offs. Practice explaining why you made specific design choices.",
    },
    {
      week: 12,
      action:
        "Refine the plan based on interview feedback. Improve weak sections and ship a final polish release of your best project.",
    },
  ],
  projects: [
    {
      name: "AI Resume Screener",
      stack: "Next.js, Gemini API, Supabase",
      why_it_matters: "Shows hiring teams you can deliver a production AI workflow.",
    },
    {
      name: "Campus Placement Risk Dashboard",
      stack: "React, Node.js, Postgres",
      why_it_matters: "Proves you can translate data into executive-level insight.",
    },
    {
      name: "Skill Decay Tracker",
      stack: "TypeScript, Chart.js, API integration",
      why_it_matters: "Demonstrates product thinking around AI disruption.",
    },
  ],
  communities: [
    "Pesto Alumni Network",
    "Blr Devs",
    "AWS User Group Bangalore",
    "Product Folks Slack",
  ],
  peer_benchmark:
    "You are ahead of 42% of peers in your city, but behind in project depth and AI-ready skills.",
  market_snapshot: [
    "React: Meta and Google continue to ship interaction-heavy product surfaces, keeping frontend performance and experimentation skills highly relevant.",
    "Java backend roles are active in enterprise systems, but teams are prioritizing platform-scale ownership over CRUD-only implementation.",
    "Cloud and system design depth are repeatedly visible in major-company engineering updates, improving shortlist conversion for India hiring tracks.",
  ],
};
