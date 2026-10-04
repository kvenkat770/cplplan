import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.");
}

/**
 * Server-only. These are deliberately not NEXT_PUBLIC_, so the key never ends
 * up in the browser bundle — the app talks to Supabase through /api routes
 * that sit behind the login.
 */
export const supabase = createClient(url, key, { auth: { persistSession: false } });
