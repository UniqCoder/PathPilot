type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
};

const normalizeMessage = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : "";

export const isSupabaseSchemaCacheMissingTableError = (
  error: unknown,
  table?: string
) => {
  const candidate = (error ?? {}) as SupabaseLikeError;
  const message = normalizeMessage(candidate.message);
  const byCode = candidate.code === "PGRST205";
  const byText = message.includes("could not find the table") && message.includes("schema cache");

  if (!byCode && !byText) {
    return false;
  }

  if (!table) {
    return true;
  }

  return message.includes(`public.${table.toLowerCase()}`);
};

export const supabaseSchemaBootstrapMessage =
  "Supabase database schema is not initialized for this project. Run the SQL in supabase/migrations/001_init.sql in your Supabase SQL Editor, then refresh.";
