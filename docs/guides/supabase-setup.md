# Hosted Supabase setup

[`supabase/schema.sql`](../../supabase/schema.sql) is the authoritative application schema. Use
this guide for the hosted Supabase project; local setup is documented in
[`local-development.md`](./local-development.md).

## 1. Create the Supabase schema

1. Create a Supabase project.
2. In the SQL Editor, run the complete contents of
   [`supabase/schema.sql`](../../supabase/schema.sql).
3. From Project Settings, copy the project URL and publishable key. Do not use a secret or
   service-role key in the frontend.
4. Copy `.env.example` to `.env.local` and set:

   ```text
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

## 2. Configure Google sign-in

1. In Google Cloud, create a Web OAuth client.
2. Add these Authorized JavaScript origins:
   - `http://localhost:5175`
   - `https://mfecane.github.io`
3. In Supabase **Authentication > Providers > Google**, copy the displayed callback URL.
4. Add that Supabase callback URL as an Authorized redirect URI in the Google OAuth client.
5. Enable Google in Supabase and enter the client ID and secret.

The Google client secret stays in Supabase provider configuration and must not be added to this
repository.

## 3. Configure Supabase return URLs

In Supabase **Authentication > URL Configuration**:

- set Site URL to `https://mfecane.github.io/assembler/`;
- add `http://localhost:5175/assembler/` to Redirect URLs;
- add `https://mfecane.github.io/assembler/` to Redirect URLs.

If the GitHub Pages deployment uses a custom domain, replace the production origin above with that
domain while retaining `/assembler/`.

## 4. Configure GitHub Pages builds

In GitHub **Settings > Secrets and variables > Actions > Variables**, add:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Both are public browser configuration values. The deployment workflow passes them to Vite.

## 5. Wipe and rebuild the application schema

This procedure deletes every object and row in the `public` schema. It preserves Supabase-managed
schemas such as `auth` and `storage`, including Auth users, as well as project settings such as
URLs, keys, and providers. Confirm that nothing outside this application uses `public` before
continuing.

Do not run `supabase db reset --linked` for this repository. The repository deliberately has no
`supabase/migrations/` history, so the CLI would have no migration from which to reconstruct the
application schema. The authoritative schema is
[`supabase/schema.sql`](../../supabase/schema.sql).

1. Confirm that the SQL Editor is open on the intended Supabase project.
2. Run this full application wipe as a standalone query:

   ```sql
   begin;

   drop schema if exists public cascade;
   create schema public authorization postgres;

   grant usage on schema public to postgres, anon, authenticated, service_role;
   grant all on schema public to postgres, service_role;

   commit;
   ```

3. Wait for the wipe query to succeed. Do not continue if it reports an error.
4. Create a new SQL Editor query and paste the complete contents of
   [`supabase/schema.sql`](../../supabase/schema.sql).
5. Run the schema query once.

Both queries are transactional. A failed wipe restores the previous `public` schema. A failed
schema execution leaves the successfully wiped `public` schema empty instead of partially created.
After both queries succeed, `public.projects`, its index, update trigger, RLS policies, and grants
match the checked-in schema.

The current `graph_document` constraint accepts only the root-graph document shape: top-level
`rootGraphs`, `enums`, and `graphs` arrays are required. The former singular `entryGraphId`,
`entryInputValues`, and top-level `configurationPanel` shape is intentionally unsupported.

Do not run [`scripts/seed-local-supabase.mjs`](../../scripts/seed-local-supabase.mjs) against the
hosted project. It creates a fixed local developer account and seeded project.

## 6. Verify

1. In the Table Editor, confirm that `public.projects` is empty and RLS is enabled.
2. Open the deployed site, sign in, create a project, edit it, save, refresh, and reopen it.
3. With two separate Google users, verify that:

   - each user sees projects created by both users, including the creator email;
   - one user can open, update, rename, and delete the other user's project;
   - anonymous requests cannot read `public.projects`.

Do not release until the two-user RLS checks pass.
