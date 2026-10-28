-- Public bucket of pre-generated voice cue clips, shared by all users.
-- Anyone can read by URL. Only the voice-clips edge function (service role) writes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-clips', 'voice-clips', true, 1048576, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
