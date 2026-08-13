# GitHub repository state audit

Audit date: 2026-08-01  
Remote: `https://github.com/GYASH28/LERNIOAI.git`

## Branch state checked

- GitHub default branch: `origin/main` at `286eb3d` (`docs: add YouTube lesson-video research and implementation brief`).
- Experience-redesign branch: `origin/fix/learning-os-experience-redesign` at `50991e5`.
- Implementation worktree branch: `codex/final-experience-upgrade`, based on the experience-redesign branch and two commits ahead before this audit pass.
- Other active remote branches visible during the audit: `feat/student-learning-os-expansion` and `repair/student-experience-overhaul`.

The experience-redesign history and `main` are divergent: the implementation branch contains the large redesign history, while `main` contains a later documentation commit. This work therefore stays on the existing implementation branch rather than silently rewriting or merging the default branch.

## Repository risks found

1. The default branch, repair branch, expansion branch, and experience-redesign branch represent overlapping product work. Merging by feature area is safer than choosing files solely by recency.
2. Student navigation is duplicated across the canonical route registry, top bar, sidebar, and mobile dock. This caused obsolete destinations to survive earlier redesigns.
3. Curriculum content has three layers—canonical manifests, reviewed lesson-note packs, and runtime fallbacks—but the old fallback could invent generic units when detail was missing.
4. Video data also has three layers—CWIT source links, candidate mappings, and approved catalog entries. Previous ordered fallback logic blurred those boundaries.
5. Generated Next.js route types can remain after deleting a page; a clean build/type generation is required when route files are removed.

## Integration rule

The changes in this audit should be reviewed and merged as a coherent experience/content change. Do not copy only the UI deletions without the redirects, help/nav cleanup, curriculum fallback, video publication guard, and tests.
