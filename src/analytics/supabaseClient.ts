/**
 * Supabase client for anonymous analytics.
 *
 * The anon key is safe to embed in client code — Supabase is designed
 * this way.  Row Level Security on the `events` table restricts the
 * client to INSERT-only; it cannot read, update, or delete rows.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oakhqqrxsavmoeqlzcny.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ha2hxcXJ4c2F2bW9lcWx6Y255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTgyMDYsImV4cCI6MjEwNjg3NDIwNn0.kLmkWC2SgnSfaGY20s4WXo2n1BauLboEZZQDYbrKs4M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
