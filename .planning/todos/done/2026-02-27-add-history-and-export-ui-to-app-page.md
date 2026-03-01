---
created: 2026-02-27T15:47:58.248Z
title: Add history and export UI to app page
area: ui
files:
  - src/app/app/*
---

## Problem

After logging in, the app page does not display any history UI or export UI. Users have no way to view their previous graph generations or export their graphs. These features are either missing from the implementation or not rendering on the authenticated app page.

## Solution

- Investigate the app page component to determine if history/export components exist but aren't rendered, or if they need to be built
- Add a history section showing previous graph generations with timestamps and previews
- Add export functionality (e.g., PNG, SVG, JSON export of graphs)
- Ensure both sections are visible and accessible after login
