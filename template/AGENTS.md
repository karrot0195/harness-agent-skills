
### MUST
- At the start of every task, load `@PROJECTS.md` and `@.specific/constitution.yaml` and wiki/*.yaml.

### SHOULD
- Before running `speckit-specify`, `speckit-plan`, or `speckit-tasks`, read `@.specific/project.yaml`.
- After running `speckit-implement` or `speckit-analyze`, run `speckit-review`, then record the change in `@LOGS.md` via `speckit-log` and update / optimize wiki/* document if necessary.
- While running `speckit-implement`, if the work diverges from `spec.md` or `plan.md`, update those documents first, then run `speckit-tasks` to re-synchronize `tasks.md`.
- when executing a skill, load `.specific/{skillName}.md` to read its experience
- improve that skill's experience every time you execute it
- secret information, personal information, etc., should be stored in `@.personal.` folder

### SHOULD NOT
- assume requirements. If something is unclear, ask the user.
- leave open questions unresolved. Try suggest a solution and/or a fallback plan.

## SKILLS
 - before start skill should read from .specific/{skillName}.md to load the skill's experience
 - after finish skill should update .specific/{skillName}.md with new experience

## HOOKS

### speckit-plan — UI detection
- After running `speckit-plan`, check whether the generated `plan.md` or `spec.md` mentions UI-related terms (`interface`, `component`, `page`, `form`, `dashboard`, `frontend`, `style`, `css`, `html`, `react`, `vue`, `svelte`, `ui`, `design`, `layout`, `button`, `input`, `modal`).
- If any UI term is detected, run `speckit-design` before proceeding to implementation.
- If no UI terms are found, skip design and proceed normally.

### speckit-tasks → speckit-implement → browser-check
- After running `speckit-tasks`, expect it to generate/update `.specific/browser-feature.yaml`.
- After running `speckit-implement`, verify code via `browser-check` skill for `.specific/browser-feature.yaml`.
