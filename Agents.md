# BoardScore Engineering Guidelines

This repository follows the Global Codex Cost and Context Policy. This file defines only BoardScore-specific execution rules. Product requirements and architecture live in `PROJECTSPEC.md`.

## Before Each Task

1. Identify the requested milestone or issue.
2. Read only the relevant sections of `PROJECTSPEC.md`.
3. Inspect the smallest affected code path.
4. Explain any conflict with the specification before changing code.

## Scope

- Implement only the requested milestone or fix.
- Do not add unrelated features, refactors, dependencies, or documentation.
- Preserve user changes and existing working behavior.
- Prefer existing project patterns over new abstractions.

## Architecture Rules

- Keep business rules in framework-independent TypeScript engines.
- Keep React components focused on presentation and interaction.
- Represent score changes as immutable `ScoreEvent` records.
- Derive totals through `ScoreEngine`; never persist or mutate totals directly.
- Define game behavior through templates instead of game-name conditionals.
- Access persistence through the storage abstraction; engines must not depend on Local Storage.

## Folder Responsibilities

- `components/`: reusable presentation components
- `pages/`: route-level screens
- `engine/`: business logic
- `stores/`: Zustand state orchestration
- `services/`: persistence and infrastructure
- `models/`: domain types
- `templates/`: built-in game templates
- `utils/`: pure shared utilities

Do not place business rules in `components/`, `pages/`, or storage services.

## Implementation Standards

- Use strict TypeScript and functional React components.
- Avoid `any`, duplicated rules, magic values, unnecessary dependencies, and deeply nested UI logic.
- Keep functions and files focused.
- Design touch interactions for a shared phone or tablet: large targets, minimal typing, fast score entry, and clear contrast.

## Testing

- Add or update unit tests for changed engine behavior.
- Prioritize scoring, winner calculation, undo, session recovery, and template validation.
- Run targeted checks first; broaden only when justified by the change.
- Do not claim builds or tests passed unless they were executed.

## Git Workflow

- Never commit directly to `main`.
- Use a focused branch such as `feature/<name>`, `fix/<name>`, or `refactor/<name>`.
- Keep commits limited to the requested work.
- Do not push, create a pull request, merge, or deploy unless explicitly requested.
- When authorized to create a pull request, target `main` and include the change summary, validation performed, UI screenshots when relevant, and known limitations.

## Completion

A task is complete when the requested behavior is implemented, applicable tests and checks have passed or limitations are reported, the architecture remains compliant, and no known material defect remains.
