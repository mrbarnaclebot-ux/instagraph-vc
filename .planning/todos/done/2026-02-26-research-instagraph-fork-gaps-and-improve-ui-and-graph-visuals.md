---
created: 2026-02-26T18:09:46.092Z
title: Research instagraph fork gaps and improve UI and graph visuals
area: ui
files:
  - apps/web/src/components/HeroSection.tsx
  - apps/web/src/components/GraphCanvas.tsx
---

## Problem

The instagraph-vc project is a fork of the original instagraph repo. There may be gaps, bugs, or divergences between the fork and the upstream that haven't been addressed. Additionally, the frontend UI and graph visualization could benefit from a significant visual overhaul to make them more polished and production-grade.

Two distinct sub-tasks:
1. **Research & fix**: Deep dive into the forked instagraph repo — compare against upstream, identify missing features, bugs, regressions, or architectural gaps, then fix/improve them.
2. **UI redesign**: Use the `frontend-design` skill to improve the visual quality of the frontend (landing page, graph UI, overall aesthetics). The graph canvas in particular should look distinctive and high-quality.

## Solution

1. Start with `/gsd:map-codebase` or an Explore agent to diff the fork against the upstream instagraph repo.
2. Identify gaps: missing endpoints, broken features, outdated dependencies, diverged logic.
3. Fix issues and improve code quality.
4. Then invoke the `frontend-design` skill focused on:
   - Landing page / hero section visual polish
   - GraphCanvas component — richer node/edge styles, animations, interactivity
   - Overall color palette, typography, and layout consistency
