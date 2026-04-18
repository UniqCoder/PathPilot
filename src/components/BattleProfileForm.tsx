"use client";

import type { BattleProfile } from "@/lib/types";

const branchOptions = ["CS", "IT", "ECE", "Mechanical", "Civil", "MBA", "BBA", "Other"];
const yearOptions = ["1st year", "2nd year", "3rd year", "4th year"];
const tierOptions = ["IIT", "NIT", "State Govt", "Private Tier 1", "Private Tier 2"];
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

type BattleProfileFormProps = {
  title: string;
  subtitle?: string;
  profile: BattleProfile;
  onChange: (next: BattleProfile) => void;
  readOnly?: boolean;
};

export const isBattleProfileValid = (profile: BattleProfile) => {
  return Boolean(
    profile.name.trim() &&
      profile.branch &&
      profile.year &&
      profile.tier &&
      profile.skills.length > 0 &&
      profile.goal &&
      profile.city
  );
};

export const emptyBattleProfile: BattleProfile = {
  name: "",
  branch: "",
  year: "",
  tier: "",
  skills: [],
  goal: "",
  city: "",
};

export default function BattleProfileForm({
  title,
  subtitle,
  profile,
  onChange,
  readOnly = false,
}: BattleProfileFormProps) {
  const toggleSkill = (skill: string) => {
    if (readOnly) return;
    const nextSkills = profile.skills.includes(skill)
      ? profile.skills.filter((item) => item !== skill)
      : [...profile.skills, skill];
    onChange({ ...profile, skills: nextSkills });
  };

  return (
    <div className="card battle-panel">
      <h2>{title}</h2>
      <p className="helper">{subtitle ?? "Fill all fields to continue the challenge."}</p>

      <div className="section" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
        <input
          className="field"
          placeholder="Name"
          value={profile.name}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, name: event.target.value })}
        />
      </div>

      <div className="grid-2">
        <select
          className="field"
          value={profile.branch}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, branch: event.target.value })}
        >
          <option value="">Branch</option>
          {branchOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={profile.year}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, year: event.target.value })}
        >
          <option value="">Year</option>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="section" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
        <select
          className="field"
          value={profile.tier}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, tier: event.target.value })}
        >
          <option value="">College Tier</option>
          {tierOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="tag-row">
        {skillOptions.map((skill) => (
          <button
            key={skill}
            type="button"
            className={`tag ${profile.skills.includes(skill) ? "selected" : ""}`}
            onClick={() => toggleSkill(skill)}
            disabled={readOnly}
          >
            {skill}
          </button>
        ))}
      </div>

      <div className="grid-2 section" style={{ paddingTop: "20px", paddingBottom: 0 }}>
        <select
          className="field"
          value={profile.goal}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, goal: event.target.value })}
        >
          <option value="">Goal</option>
          {goalOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={profile.city}
          disabled={readOnly}
          onChange={(event) => onChange({ ...profile, city: event.target.value })}
        >
          <option value="">City</option>
          {cityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
