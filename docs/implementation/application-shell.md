# Application shell

## Routing

The authenticated application uses React Router's hash router. Hash routing keeps navigation
under Vite's `/assembler/` deployment path and supports direct refreshes on GitHub Pages without
a server-side SPA fallback.

- `#/` redirects to `#/projects`.
- `#/projects` displays the project dashboard.
- `#/projects/:projectId` loads the identified project in the editor.
- `#/models` opens the current client's model editor and selects its first available model.
- `#/models/:modelId` opens a particular model in the current client's catalog.
- Unknown hash paths redirect to `#/projects`.

Project open, dashboard return, and the destination after **Save as** use router navigation. The
project ID therefore survives refreshes and can be deep-linked. Unauthenticated users see the
sign-in screen at the requested path; a completed OAuth callback returns to the application base
URL and then redirects a signed-in user to the dashboard.

The projects header contains the active client selector. Its value determines which checked-in
default graph is used when a project is created and persists in the `assembler.selected-client`
local-storage entry. MaxShelf is selected when no supported stored value exists.

The project editor header owns only project-level concerns: project navigation and identity, editor
selection, save actions, whole-project JSON import/export, and the authenticated user menu. Graph
selection and graph actions stay inside the Graph Editor workspace.

`HashRouter` is mounted inside the Supabase configuration check and outside the auth-aware
application. Dashboard, project-editor, and model-editor components remain unaware of URL parsing.

## Authenticated user menu

The user menu displays the Supabase `avatar_url` through the shadcn Avatar primitive and falls
back to initials derived from the user's name or email. The circular avatar is the only header
trigger; it opens an account menu containing the user's name, email, and sign-out action.

## Component conventions

The root `components.json` configures shadcn for the local TypeScript/Vite application with New
York style, Radix primitives, Tailwind CSS v4 variables, Lucide icons, and the existing `@/*`
alias. Add shadcn components through its CLI so dependencies and local component files remain in
sync.

The local set includes `ButtonGroup`, `ButtonGroupText`, and `ButtonGroupSeparator` for related
horizontal or vertical actions. Button groups compose with the local `Button` and `Separator`
primitives.
