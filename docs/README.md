# Docs Index

Documentation for this repository lives under `docs/`.

## Layout

- `plans/` - design and implementation plans

## Architecture Notes

- Current source layout follows layered modules: `app / features / core / state / shared`.
- Large refactors should preserve dependency direction and avoid re-introducing flat `components/services/stores` coupling.

## Conventions

- Keep root `README.md` focused on project overview and quick start.
- Put detailed design or implementation notes in `docs/plans/`.
- Prefer file names like `YYYY-MM-DD-topic.md`.
