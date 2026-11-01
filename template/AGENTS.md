### MUST
load @PROJECTS.md
load .specific/constitution.yaml

### SHOULD
 - before run `speckit-specify`, `speckit-plan`, `speckit-task`, should read @.specific/project.yaml
 - after `speckit-implement`, run `speckit-review-spec` and keep @LOGS.md current via `speckit-log`
