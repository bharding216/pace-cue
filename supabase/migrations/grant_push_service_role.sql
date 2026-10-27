-- The service role bypasses RLS but still needs table privileges.
grant select, insert, update, delete on table public.push_tokens to service_role;
grant select, insert, update, delete on table public.push_sends to service_role;
