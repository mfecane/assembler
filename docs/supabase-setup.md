# Supabase setup runbook

The application code and database schema are checked in. Complete these external steps before
testing the cloud workflow.

## 1. Create the Supabase schema

1. Create a Supabase project.
2. Open its SQL Editor and run
   [`supabase/schema.sql`](../supabase/schema.sql).
3. In Project Settings, copy the project URL and publishable key. Do not use a secret or
   service-role key.
4. Create `.env.local` from `.env.example` and fill in:

   ```text
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

## 2. Configure Google OAuth

1. In Google Cloud, create a Web OAuth client.
2. Add these Authorized JavaScript origins:
   - `http://localhost:5175`
   - `https://mfecane.github.io`
3. In Supabase Authentication > Providers > Google, copy the displayed Supabase callback URL.
4. Add that Supabase callback URL as an Authorized redirect URI in the Google OAuth client.
5. Enable the Google provider in Supabase and enter the Google client ID and secret.

The Google client secret stays in Supabase provider configuration and must not be added to this
repository.

## 3. Configure Supabase return URLs

In Supabase Authentication > URL Configuration:

- set Site URL to `https://mfecane.github.io/assembler/`;
- add `http://localhost:5175/assembler/` to Redirect URLs;
- add `https://mfecane.github.io/assembler/` to Redirect URLs.

If the GitHub Pages deployment uses a custom domain, replace the production origin above with that
domain while retaining `/assembler/`.

## 4. Configure GitHub Pages builds

In GitHub repository Settings > Secrets and variables > Actions > Variables, add:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Both are public browser configuration values. The deployment workflow passes them to Vite.

## 5. Rebuild the production application database

Use this procedure immediately before a production deployment when the checked-in schema must
replace the current production application schema and no existing project data needs to survive.
It rebuilds the application-owned objects in the existing Supabase project. It does **not** change
the project URL, API keys, Google provider configuration, return URLs, or Supabase-managed Auth
users.

Do not run `supabase db reset --linked` for this repository. The repository deliberately has no
`supabase/migrations/` history, so the CLI would have no migration from which to reconstruct the
application schema. The authoritative schema is
[`supabase/schema.sql`](../supabase/schema.sql).

1. Confirm that the Supabase dashboard is open on the intended production project.
2. Open the SQL Editor and create a new query.
3. Put the following reset statements at the beginning of the query:

   ```sql
   begin;

   drop table if exists public.projects cascade;
   drop function if exists public.set_updated_at() cascade;
   ```

4. Paste the complete, current contents of `supabase/schema.sql` after those statements.
5. Put `commit;` at the end and run the entire query as one operation:

   ```sql
   commit;
   ```

The transaction deletes all rows in `public.projects`, then recreates the table, index, update
trigger, RLS policies, and grants from the current source tree. If any schema statement fails,
the transaction is rolled back instead of leaving a partially rebuilt application schema.

Do not run [`scripts/seed-local-supabase.mjs`](../scripts/seed-local-supabase.mjs) against
production. It is local-development tooling that creates a fixed developer account and seeded
project.

After the query succeeds, check the Table Editor for an empty `public.projects` table and confirm
that RLS is enabled. Existing users may then sign in through the already configured Google
provider and create projects against the clean schema.

Deleting and recreating the Supabase project is not part of this procedure because doing so would
replace the project URL and keys and require the OAuth and deployment configuration to be entered
again.

## 6. Verify

Open the deployed GitHub Pages site, sign in, create a project, edit it, Save, refresh, and reopen it.
Then verify RLS with two separate Google users:

- each user sees projects created by both users, including the creator email;
- user A can open, update, rename, and delete user B's project;
- anonymous requests cannot read `public.projects`.

Do not release until the two-user RLS checks pass.
