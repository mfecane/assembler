# Local development

The `kodx` service is the persistent Codex workspace and is independent from the application
services.

Start the complete application:

```bash
docker compose up --build
```

Open `http://localhost:5175/assembler/` and choose **Continue as local developer**.

- Email: `developer@assembler.local`
- Password: `assembler-local`

The stack contains only the services the application uses: PostgreSQL, Auth, PostgREST, the
one-shot schema and seed jobs, and the Vite frontend. Vite proxies the local Auth and
REST paths. The seed job creates the local user, any optional per-model metadata present in each
checked-in metadata document, and one seeded project for each client. Selectable assets come from the
runtime mesh registrar, not database catalog rows.
To persist Kitchen metadata in fresh local rebuilds, replace `scripts/data/kitchen/metadata.json` with
the Kitchen model-editor export before seeding.

Connection pins are disabled by default. To enable creating a pin when an output connection is
dropped on empty graph canvas, set `VITE_ENABLE_GRAPH_CONNECTION_PINS=true` for the frontend.

Remove the containers and temporary database:

```bash
docker compose down
```

The next `docker compose up --build` creates the database and schema from scratch. The
`kodx_home` volume preserves the Codex login across `docker compose down`.

Inspect a startup failure with:

```bash
docker compose ps -a
docker compose logs db auth schema rest frontend seed
```
