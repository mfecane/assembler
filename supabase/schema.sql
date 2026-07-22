create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  name text not null check (char_length(name) between 1 and 120),
  graph_document jsonb not null
    check (
      jsonb_typeof(graph_document) = 'object'
      and graph_document ? 'entryGraphId'
      and graph_document ? 'entryInputValues'
      and graph_document ? 'graphs'
      and graph_document ? 'configurationPanel'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_updated_idx
  on public.projects (updated_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "Authenticated users can read all projects"
on public.projects for select
to authenticated
using (true);

create policy "Users can create their projects"
on public.projects for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select auth.jwt() ->> 'email') = user_email
);

create policy "Authenticated users can update all projects"
on public.projects for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete all projects"
on public.projects for delete
to authenticated
using (true);

grant usage on schema public to authenticated, service_role;
grant select, insert, delete on table public.projects to authenticated;
grant update (name, graph_document) on table public.projects to authenticated;
grant select, insert, update, delete on table public.projects to service_role;
