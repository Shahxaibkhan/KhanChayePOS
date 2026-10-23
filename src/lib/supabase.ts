import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
      "Set them in .env.local (dev) or your Vercel project settings (production)."
  );
}

// Server-only client using the service-role key. This must never be
// imported from a Client Component — the `server-only` import above makes
// that a build error if it ever happens by mistake.
export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
