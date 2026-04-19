"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { trackEvent } from "@/lib/analytics";
import type { FormPayload } from "@/lib/types";

const branchOptions = ["CS", "IT", "ECE", "Mechanical", "Civil", "MBA", "BBA", "Other"];
const yearOptions = ["1st year", "2nd year", "3rd year", "4th year"];
const tierOptions = [
  "IIT",
  "NIT",
  "State Govt",
  "Private Tier 1",
  "Private Tier 2",
];
const skillOptions = [
  "Python",
  "Java",
  "SQL",
  "React",
  "ML",
  "Excel",
  "CAD",
  "C++",
  "Node.js",
  "Data Analysis",
  "AWS",
  "Docker",
  "Figma",
  "Cybersecurity",
];
const branchSkillOptions: Record<string, string[]> = {
  CS: [
    "Python",
    "Java",
    "C++",
    "SQL",
    "React",
    "Node.js",
    "Data Analysis",
    "ML",
    "AWS",
    "Docker",
    "Cybersecurity",
  ],
  IT: [
    "Python",
    "Java",
    "C++",
    "SQL",
    "React",
    "Node.js",
    "Data Analysis",
    "AWS",
    "Docker",
    "Cybersecurity",
  ],
  ECE: [
    "C++",
    "Python",
    "Java",
    "ML",
    "Data Analysis",
    "AWS",
    "Node.js",
  ],
  Mechanical: [
    "CAD",
    "Python",
    "C++",
    "Data Analysis",
    "Excel",
  ],
  Civil: [
    "CAD",
    "Excel",
    "Data Analysis",
    "Python",
  ],
  MBA: [
    "Excel",
    "SQL",
    "Data Analysis",
    "Figma",
  ],
  BBA: [
    "Excel",
    "Data Analysis",
    "Figma",
    "SQL",
  ],
  Other: skillOptions,
};
const branchesWithoutProjectTrack = new Set(["Mechanical", "Civil", "MBA", "BBA"]);
const goalOptions = ["Job", "Startup", "Freelance", "Abroad", "Higher Studies"];
const cityOptions = [
  "Bangalore",
  "Pune",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Delhi",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Tier 2 City",
];
const timelineOptions = ["3 months", "6 months", "1 year"];
const projectsCountOptions = Array.from({ length: 16 }, (_, index) => String(index));
const projectDomainOptions = [
  "AI / LLM Applications",
  "Full Stack Web",
  "Mobile Apps",
  "Data Engineering",
  "Machine Learning",
  "Computer Vision",
  "Cybersecurity",
  "Cloud / DevOps",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-commerce",
  "SaaS Productivity",
  "Developer Tools",
  "Blockchain / Web3",
  "IoT / Embedded",
  "AR / VR",
  "Gaming",
  "Automation / RPA",
  "Climate / Energy Tech",
];

const emailRegex = /.+@.+\..+/;

export default function IntakeForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectsCountSelection, setProjectsCountSelection] = useState("");
  const [form, setForm] = useState<FormPayload>({
    branch: "",
    year: "",
    tier: "",
    skills: [],
    goal: "",
    city: "",
    timeline: "",
    email: "",
    projectsCount: 0,
    projectDomain: "",
    projectProblem: "",
  });

  const isProjectStepEnabled = useMemo(
    () => !branchesWithoutProjectTrack.has(form.branch),
    [form.branch]
  );

  const availableSkillOptions = useMemo(
    () => branchSkillOptions[form.branch] ?? skillOptions,
    [form.branch]
  );

  const stepTitles = useMemo(
    () => {
      const baseSteps = [
        "Which branch are you in?",
        "What year and college tier are you in?",
        "Which skills do you already have?",
        "What is your goal and city?",
        "What timeline should we plan for?",
      ];

      return isProjectStepEnabled
        ? [...baseSteps, "Tell us about your current project track"]
        : baseSteps;
    },
    [isProjectStepEnabled]
  );

  const lastStep = stepTitles.length - 1;

  useEffect(() => {
    if (!isProjectStepEnabled && step > lastStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(lastStep);
    }
  }, [isProjectStepEnabled, lastStep, step]);

  const getStepMissingFields = (targetStep: number) => {
    const missing: string[] = [];

    if (targetStep === 0) {
      if (!form.branch) missing.push("Branch");
      return missing;
    }

    if (targetStep === 1) {
      if (!form.year) missing.push("Year");
      if (!form.tier) missing.push("College Tier");
      return missing;
    }

    if (targetStep === 2) {
      if (form.skills.length === 0) missing.push("At least one Skill");
      return missing;
    }

    if (targetStep === 3) {
      if (!form.goal) missing.push("Goal");
      if (!form.city) missing.push("City");
      return missing;
    }

    if (targetStep === 4) {
      if (!form.timeline) missing.push("Timeline");
      if (!emailRegex.test(form.email.trim())) missing.push("Valid Email");
      return missing;
    }

    if (targetStep === 5 && isProjectStepEnabled) {
      if (!projectsCountSelection) missing.push("Projects Completed");
      if (!form.projectDomain.trim()) missing.push("Project Domain");
      if (form.projectProblem.trim().length < 12) missing.push("Project Problem (min 12 chars)");
      return missing;
    }

    return missing;
  };

  const getAllMissingFields = () => {
    const byStep = Array.from({ length: stepTitles.length }, (_, index) => getStepMissingFields(index));
    return Array.from(new Set(byStep.flat()));
  };

  const handleNext = () => {
    const missingFields = getStepMissingFields(step);

    if (missingFields.length > 0) {
      setError(`Please complete: ${missingFields.join(", ")}.`);
      return;
    }

    setError("");
    setStep((prev) => Math.min(prev + 1, lastStep));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((item) => item !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async () => {
    const missingFields = getAllMissingFields();

    if (missingFields.length > 0) {
      setError(`Complete all required fields: ${missingFields.join(", ")}.`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim(),
          projectProblem: form.projectProblem.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to generate report");
      }

      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          report: unknown;
          reportId: string;
        };
        error?: string;
      };

      if (!payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to generate report");
      }

      sessionStorage.setItem("pathpilot_report", JSON.stringify(payload.data.report));
      sessionStorage.setItem("pathpilot_report_id", payload.data.reportId);
      sessionStorage.setItem("pathpilot_profile", JSON.stringify(form));
      trackEvent("report_generated", {
        branch: form.branch,
        goal: form.goal,
        timeline: form.timeline,
        reportId: payload.data.reportId,
      });
      toast.success("Report generated successfully.");
      router.push("/report");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="stepper" aria-hidden="true">
        {Array.from({ length: stepTitles.length }).map((_, index) => (
          <div
            key={`step-${index}`}
            className={`step-pill ${index <= step ? "active" : ""}`}
          />
        ))}
      </div>
      <h2>Step {step + 1} of {stepTitles.length}</h2>
      <p className="helper">{stepTitles[step]}</p>

      {step === 0 && (
        <div className="section">
          <select
            className="field"
            value={form.branch}
            onChange={(event) => {
              const nextBranch = event.target.value;
              const nextSkills = branchSkillOptions[nextBranch] ?? skillOptions;
              const shouldHideProjectStep = branchesWithoutProjectTrack.has(nextBranch);

              setForm((prev) => ({
                ...prev,
                branch: nextBranch,
                skills: prev.skills.filter((skill) => nextSkills.includes(skill)),
                ...(shouldHideProjectStep
                  ? {
                      projectsCount: 0,
                      projectDomain: "",
                      projectProblem: "",
                    }
                  : {}),
              }));

              if (shouldHideProjectStep) {
                setProjectsCountSelection("");
              }
            }}
          >
            <option value="">Select your branch</option>
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="section">
          <div className="grid-2">
            <select
              className="field"
              value={form.year}
              onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
            >
              <option value="">Select year</option>
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={form.tier}
              onChange={(event) => setForm((prev) => ({ ...prev, tier: event.target.value }))}
            >
              <option value="">Select college tier</option>
              {tierOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="section">
          <div className="tag-row">
            {availableSkillOptions.map((skill) => (
              <button
                key={skill}
                type="button"
                className={`tag ${form.skills.includes(skill) ? "selected" : ""}`}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>
          <p className="helper">
            Pick at least one. Showing skills aligned to {form.branch || "your selected branch"}.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="section">
          <div className="grid-2">
            <select
              className="field"
              value={form.goal}
              onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
            >
              <option value="">Select goal</option>
              {goalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            >
              <option value="">Select city</option>
              {cityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="section">
          <div className="grid-2">
            <select
              className="field"
              value={form.timeline}
              onChange={(event) => setForm((prev) => ({ ...prev, timeline: event.target.value }))}
            >
              <option value="">Select timeline</option>
              {timelineOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              className="field"
              type="email"
              placeholder="Email for report delivery"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <p className="helper">We only use your email to send the PDF report.</p>
        </div>
      )}

      {step === 5 && isProjectStepEnabled && (
        <div className="section">
          <div className="grid-2">
            <select
              className="field"
              value={projectsCountSelection}
              onChange={(event) => {
                const nextValue = event.target.value;
                setProjectsCountSelection(nextValue);
                setForm((prev) => ({
                  ...prev,
                  projectsCount: nextValue === "" ? 0 : Number(nextValue),
                }));
              }}
            >
              <option value="">Select completed projects</option>
              {projectsCountOptions.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={form.projectDomain}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  projectDomain: event.target.value,
                }))
              }
            >
              <option value="">Select your primary project domain</option>
              {projectDomainOptions.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="field"
            style={{ marginTop: "12px", minHeight: "120px", resize: "vertical" }}
            placeholder="Project title + problem statement (example: Campus Interview Copilot - helps students convert JD requirements into weekly preparation actions with measurable progress tracking)."
            value={form.projectProblem}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                projectProblem: event.target.value,
              }))
            }
          />
          <p className="helper">We use this to estimate project scalability and include it directly in your risk score breakdown.</p>
        </div>
      )}

      <div className="hero-actions">
        {step > 0 && (
          <button className="button ghost" type="button" onClick={handleBack}>
            Back
          </button>
        )}
        {step < lastStep && (
          <button className="button primary" type="button" onClick={handleNext}>
            Continue
          </button>
        )}
        {step === lastStep && (
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Generating..." : "Generate My Report"}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
