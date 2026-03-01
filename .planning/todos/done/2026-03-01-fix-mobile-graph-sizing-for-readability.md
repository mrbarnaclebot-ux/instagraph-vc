---
created: 2026-03-01T04:40:37.535Z
title: Fix mobile graph sizing for readability
area: ui
files:
  - src/components/graph-view (likely)
---

## Problem

Users on mobile report that generated graphs appear blurry and too small to read without zooming in. The current graph rendering likely uses fixed dimensions or desktop-oriented sizing that doesn't adapt well to smaller viewports. This makes the core output of the app — the knowledge graph — unusable on mobile without manual pinch-to-zoom.

Key issues:
- Graph canvas/SVG may be rendered at a fixed size that's too small on mobile
- Text labels on nodes/edges are likely too small at mobile scale
- The graph may be getting scaled down to fit the container rather than being laid out for mobile
- Possible resolution/DPI issues causing blurriness on high-density mobile screens

## Solution

- Investigate current graph rendering dimensions and how they adapt to viewport size
- Implement responsive sizing that detects mobile viewports and adjusts graph dimensions accordingly
- Consider: larger default node sizes on mobile, bigger font sizes for labels, appropriate canvas/SVG dimensions for mobile screens
- Ensure proper devicePixelRatio handling to prevent blurriness on retina/high-DPI mobile displays
- May need a different layout algorithm or spacing for mobile to keep graphs readable without zooming
