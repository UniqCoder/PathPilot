import posthog from "posthog-js";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export const trackEvent = (eventName: string, props?: EventProps) => {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  try {
    posthog.capture(eventName, props);
  } catch {
    // Analytics should never block user flows.
  }
};
