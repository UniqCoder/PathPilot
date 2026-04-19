import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase-types";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createMissingConfigProxy = () =>
  new Proxy(
    {},
    {
      get() {
        throw new Error("Missing Supabase admin configuration");
      },
    }
  ) as SupabaseClient<Database>;

export const supabaseAdmin: SupabaseClient<Database> =
  supabaseUrl && serviceRoleKey
    ? createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : createMissingConfigProxy();
