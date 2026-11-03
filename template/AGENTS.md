
### MUST
- At the start of every task, load `@PROJECTS.md` and `@.specific/constitution.yaml`.

### SHOULD
- Before running `speckit-specify`, `speckit-plan`, or `speckit-tasks`, read `@.specific/project.yaml`.
- After running `speckit-implement`, run `speckit-review-spec`, then record the change in `@LOGS.md` via `speckit-log`.
- While running `speckit-implement`, if the work diverges from `spec.md` or `plan.md`, update those documents first, then run `speckit-tasks` to re-synchronize `tasks.md`.

### SHOULD NOT
- assume requirements. If something is unclear, ask the user.
- leave open questions unresolved. Try suggest a solution and/or a fallback plan.
