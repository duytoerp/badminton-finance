# Project-specific Claude Code skills

Six skills extracted from the Badminton Finance codebase. They live under `<project>/.claude/skills/<name>/SKILL.md` so Claude Code picks them up automatically when working in `c:\Project VL`.

| Skill | When Claude should load it |
|---|---|
| [caulong-overview](caulong-overview/SKILL.md) | First, whenever working on this project. High-level map + non-negotiable conventions. |
| [caulong-add-feature](caulong-add-feature/SKILL.md) | Asked to add a new entity / domain object end-to-end. Walks the 11 files to touch. |
| [caulong-business-rules](caulong-business-rules/SKILL.md) | Touching SessionService / FundService / close / reopen / payment / audit. The rules that must not regress. |
| [caulong-frontend-responsive](caulong-frontend-responsive/SKILL.md) | Adding or editing any React page. How dual mobile / desktop rendering works. |
| [caulong-run](caulong-run/SKILL.md) | Asked to run / build / migrate / troubleshoot. Includes the "run it for me" recipe. |
| [caulong-api-conventions](caulong-api-conventions/SKILL.md) | Adding a controller / endpoint / new error code. The `ApiResponse<T>` envelope + exception mapping. |

## How they relate

```
                ┌──────────────────┐
                │ caulong-overview │  ← load first
                └────────┬─────────┘
                         │
       ┌─────────────────┼──────────────────────┐
       │                 │                      │
       ▼                 ▼                      ▼
  add-feature      business-rules      frontend-responsive
   (recipe)         (constraints)         (UI layouts)
       │                 │                      │
       └────────┬────────┴──────────┬───────────┘
                │                   │
                ▼                   ▼
        api-conventions          run
        (REST + errors)     (dev-loop + troubleshoot)
```

## Tips

- Skills are plain Markdown; edit them in place when the project changes (rename an endpoint, add an error code, change a breakpoint).
- The frontmatter `description` is what Claude uses to decide relevance — keep it specific.
- Cross-link to actual files in the repo with relative paths from the skill location, e.g. `../../../backend/...` — that's where Claude will read source when it needs concrete details.
