create schema auth;
alter role postgres set search_path = auth, public;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
