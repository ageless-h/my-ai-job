# Docs Index

Documentation for this repository lives under `docs/`.

## Layout

- `plans/` - design and implementation plans
- `DOCS-INDEX.md` - full categorized document index
- `无效会话清理逻辑与参数汇报.md` - cleaner strategy and parameter report
- `链接.md` - provider invite links source list

## Architecture Notes

- Current source layout follows layered modules: `app / features / core / state / shared`.
- Large refactors should preserve dependency direction and avoid re-introducing flat `components/services/stores` coupling.

## Conventions

- Keep root `README.md` focused on project overview and quick start.
- Put detailed design or implementation notes in `docs/plans/`.
- Prefer clear, descriptive file names (English or Chinese are both acceptable).
