import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase-types";

const browserSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const browserSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const getMissingSupabaseBrowserEnv = () =>
  [
    ...(browserSupabaseUrl ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
    ...(browserSupabaseAnonKey ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
  ];

export const isSupabaseBrowserConfigured = () =>
  getMissingSupabaseBrowserEnv().length === 0;

const createMissingBrowserClient = (missingKeys: string[]) => {
  const message =
    missingKeys.length > 0
      ? `Supabase browser env is missing: ${missingKeys.join(", ")}. Add these values to .env.local and restart the dev server.`
      : "Supabase browser env is missing.";

  const missing = async () => ({ error: new Error(message) });

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
      signOut: missing,
      signInWithPassword: missing,
      signUp: missing,
      resetPasswordForEmail: missing,
    },
  } as unknown as SupabaseClient<Database>;
};

export const createSupabaseBrowserClient = () => {
  const url = browserSupabaseUrl;
  const anonKey = browserSupabaseAnonKey;

  if (!url || !anonKey) {
    return createMissingBrowserClient(getMissingSupabaseBrowserEnv());
  }

  return createBrowserClient<Database>(url, anonKey);
};
