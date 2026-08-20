Do not run application. Do not modify docker in the runtime. User will run and verify and report issues. Only static analysis is allowed - lint, read logs, inspect code.

Commiting, PR's and any other modification of git history is not allowed. Only working tree changes. Reads from history are allowed.

One shot MVP mode

- application will never be shipped as real product
- performance has low priority
- security has low priority
- no database schema migration, wipe and rebuild from scratch
- no versioning of project schema
- no legacy compatibility

Quick iteration

- Minimal configs, if default value works it stays.
- No values set just to maybe be configured later. No such lazy future proofing.

Do not use editor-architecture skill for already powered by react flow parts of the application. This would be stupid.

# UI

- error messages displayed in the ui or in the console, have to bear absolute maximum possible context for faster localization problems
- Use idiomatic tailwind + shadcn + lucide icons.
- Least possible deviation from default idimatic configuration.

# React

- Mark key React elements with data-id. This is needed to help inspection via browser dev tools.

# Data folder

- Notify user about no-backwards compatible changes in schema. Await for explicit permission before processing.
- Keep graphs in /scripts/data folders up to date with current schema, just parse it and modify alongside schema modification, update seed script too seed new defaultGraph No automatic migration is needed, but this graphs shape should persist in the process of schema modification. It may not survive schema change 100% correctly, but maximum effort should be put to keep it as is.
- Do not replace seeded data with synthesised trivial graphs.

Stop leaking prompt spec details into the UI labels and text!

Do not use tables in ansers.
