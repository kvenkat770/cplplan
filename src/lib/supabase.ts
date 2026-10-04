import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Built on first use, not at module scope.
 *
 * Next evaluates route modules while collecting page data during `next build`,
 * so anything that throws up here fails the build rather than the request —
 * which is exactly what happened on the first Vercel deploy, before the
 * environment variables were set. A missing variable should be a clear 500 at
 * request time instead.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set both in .env.local locally, or in Vercel under Settings → Environment Variables."
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
