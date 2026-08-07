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
REST paths. The seed job creates the local user and upserts a **Seeded MaxShelf configurator**
project from `src/data/defaultGraph.json`, so the seeded project and newly created
projects start from the same checked-in graph.

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
