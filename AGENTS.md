# Opencode Agent Instructions

## Tool & Package Manager

- Use `pnpm` for all package operations.
- Do not use `npm` or `yarn`.

## Lint / Typecheck / Test

After completing code changes, run these commands and fix any failures:

- `pnpm lint` (prettier + eslint)
- `pnpm check` (svelte-check with TypeScript)
- `pnpm test` (vitest)

## Project Conventions

- Svelte 5 with TypeScript.
- Prefer editing existing files over creating new ones.
- Do not add comments unless requested.
- Do not commit changes unless explicitly asked by the user.

## Style

- Keep CLI output concise.
- Reference source locations as `file_path:line_number` when relevant.
