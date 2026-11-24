
### MUST
- At the start of every task, load `@PROJECTS.md` and `@.specific/constitution.yaml`.

### SHOULD
- Before running `speckit-specify`, `speckit-plan`, or `speckit-tasks`, read `@.specific/project.yaml`.
- After running `speckit-implement` or `speckit-analyze`, run `speckit-review`, then record the change in `@LOGS.md` via `speckit-log`.
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
