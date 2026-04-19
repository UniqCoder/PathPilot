"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient, getMissingSupabaseBrowserEnv } from "@/lib/supabase";
import styles from "./page.module.css";

type AuthMode = "signin" | "signup";

type FormState = {
  fullName: string;
  college: string;
  branch: string;
  email: string;
  password: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  fullName: "",
  college: "",
  branch: "",
  email: "",
  password: "",
};

const emailRegex = /.+@.+\..+/;

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [envChecked, setEnvChecked] = useState(false);
  const [missingSupabaseEnv, setMissingSupabaseEnv] = useState<string[]>([]);

  useEffect(() => {
    // Run env checks only after mount to avoid server/client hydration drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMissingSupabaseEnv(getMissingSupabaseBrowserEnv());
    setEnvChecked(true);
  }, []);

  const hasSupabaseConfig = envChecked && missingSupabaseEnv.length === 0;

  const [mode, setMode] = useState<AuthMode>("signin");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/intake";

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!emailRegex.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.password.trim().length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (mode === "signup") {
      if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!form.college.trim()) nextErrors.college = "College is required.";
      if (!form.branch.trim()) nextErrors.branch = "Branch is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!envChecked || !hasSupabaseConfig) {
      setStatusIsError(true);
      setStatus(
        `Missing Supabase configuration: ${(missingSupabaseEnv.length > 0 ? missingSupabaseEnv : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]).join(", ")}. Add values in .env.local and restart the dev server.`
      );
      return;
    }

    const email = form.email.trim();
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Enter email first to reset password." }));
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      setStatusIsError(true);
      setStatus(error.message || "Unable to send reset email.");
      return;
    }

    setStatusIsError(false);
    setStatus("Password reset email sent. Check your inbox.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!envChecked || !hasSupabaseConfig) {
      setStatusIsError(true);
      setStatus(
        `Missing Supabase configuration: ${(missingSupabaseEnv.length > 0 ? missingSupabaseEnv : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]).join(", ")}. Add values in .env.local and restart the dev server.`
      );
      return;
    }

    if (!validate()) return;

    setStatus("");
    setStatusIsError(false);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          setStatusIsError(true);
          setStatus(error.message || "Sign in failed.");
          return;
        }

        router.push(nextPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            college: form.college.trim(),
            branch: form.branch.trim(),
          },
        },
      });

      if (error) {
        setStatusIsError(true);
        setStatus(error.message || "Sign up failed.");
        return;
      }

      // Welcome email trigger (best effort).
      fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          email: form.email.trim(),
          fullName: form.fullName.trim(),
        }),
      }).catch(() => undefined);

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setStatusIsError(false);
      setStatus("Account created. Verify your email, then sign in.");
      setMode("signin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.head}>
          <p className={styles.badge}>PathPilot Access</p>
          <h1>{mode === "signin" ? "Sign In" : "Create Account"}</h1>
          <p className={styles.helper}>
            {mode === "signin"
              ? "Continue your career survival roadmap."
              : "Set up your account to save reports and unlock premium roadmap features."}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {envChecked && !hasSupabaseConfig && (
            <div className={styles.configWarn} role="alert">
              <p>Supabase is not configured for browser auth.</p>
              <p>
                Add these keys in <strong>.env.local</strong>: {missingSupabaseEnv.join(", ")}.
              </p>
              <p>After updating env values, restart the dev server.</p>
            </div>
          )}

          {mode === "signup" && (
            <>
              <div className={styles.row}>
                <label className={styles.label} htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  className={styles.input}
                  value={form.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  autoComplete="name"
                />
                {errors.fullName && <p className={styles.error}>{errors.fullName}</p>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="college">College</label>
                <input
                  id="college"
                  className={styles.input}
                  value={form.college}
                  onChange={(event) => setField("college", event.target.value)}
                  autoComplete="organization"
                />
                {errors.college && <p className={styles.error}>{errors.college}</p>}
              </div>

              <div className={styles.row}>
                <label className={styles.label} htmlFor="branch">Branch</label>
                <input
                  id="branch"
                  className={styles.input}
                  value={form.branch}
                  onChange={(event) => setField("branch", event.target.value)}
                />
                {errors.branch && <p className={styles.error}>{errors.branch}</p>}
              </div>
            </>
          )}

          <div className={styles.row}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              autoComplete="email"
            />
            {errors.email && <p className={styles.error}>{errors.email}</p>}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {errors.password && <p className={styles.error}>{errors.password}</p>}
          </div>

          <button className={`button primary ${styles.submit}`} type="submit" disabled={!envChecked || !hasSupabaseConfig || isSubmitting}>
            {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <button
            type="button"
            className={styles.forgot}
            onClick={handleForgotPassword}
            disabled={!envChecked || !hasSupabaseConfig || isSubmitting}
          >
            Forgot password?
          </button>

          <p className={styles.toggle}>
            {mode === "signin" ? "New here?" : "Already have an account?"}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setMode((prev) => (prev === "signin" ? "signup" : "signin"));
                setErrors({});
                setStatus("");
              }}
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>

        {status && (
          <p className={`${styles.status} ${statusIsError ? styles.statusError : styles.statusOk}`}>
            {status}
          </p>
        )}
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className={styles.page}><section className={styles.shell}><p>Loading auth...</p></section></div>}>
      <AuthPageContent />
    </Suspense>
  );
}
