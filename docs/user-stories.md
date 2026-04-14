# MiniMax Studio — User Stories

**Product Vision**: "想到即看见，看见即得到" — AI-powered idea-to-visual app
**Version**: 1.0
**Date**: 2026-04-09
**Status**: Draft for Sprint 1 Planning

---

## Prioritization Overview

| # | User Story | Priority | Estimate | Primary Persona |
|---|---|---|---|---|
| US-01 | Text to Multiple Visual Interpretations | P0 | XL | Creative Professional |
| US-02 | Iterate & Refine Visuals with Follow-up Prompts | P0 | M | Power User |
| US-03 | Collect & Prioritize Ideas with Emails | P1 | M | Product Manager |
| US-04 | Generate Visual Mockups from Campaign Ideas | P1 | M | Marketing Team Member |
| US-05 | Capture Photo, AI Transform, Visualize | P2 | L | Mobile User |
| US-06 | Engagement Metrics Dashboard | P2 | L | CEO / Founder |

---

## US-01: Text to Multiple Visual Interpretations

**User Type**: Creative Professional (Designer / Artist)

### Persona

Maya is a senior UX designer at a mid-size tech company. She works across multiple projects and often needs to explore visual directions quickly before committing to a design. She is familiar with AI tools but values quality and creative control. Her pain point is the time it takes to go from a text description to a tangible visual — even a rough sketch takes 30-60 minutes she does not have.

### Goal & Motivation

Maya inputs a text description of a design concept and receives multiple distinct visual interpretations in seconds. This allows her to evaluate different creative directions, share early mockups with stakeholders, and narrow down the right path faster. Her motivation is speed-to-visual without sacrificing quality or creative nuance.

### Acceptance Criteria

- [ ] User enters a text prompt (e.g., "a minimalist mobile banking app with a teal accent, dark mode")
- [ ] System generates at least 3 visually distinct interpretations within 10 seconds
- [ ] Each interpretation is displayed as a separate visual card with a title
- [ ] User can click any card to view the full-resolution output
- [ ] User can download any individual interpretation as PNG/JPEG
- [ ] User can regenerate any single interpretation with a new seed
- [ ] System supports prompts up to 500 characters
- [ ] If the prompt is empty or too short, the system displays a helpful validation message
- [ ] If generation fails, the user sees an error state with a retry option
- [ ] Mobile-responsive layout: cards stack vertically on screens < 768px

### Priority

P0 — Core product loop; enables all downstream features

### Estimate

XL — Involves AI model integration, multi-result orchestration, caching, and CDN delivery

---

## US-02: Iterate & Refine Visuals with Follow-up Prompts

**User Type**: Power User

### Persona

David is a freelance illustrator who uses MiniMax Studio as part of his creative workflow. He generates an initial visual, then iterates with precise follow-up instructions — "make the sky darker", "change the character to a woman in her 30s", "add a watermark in the bottom-right corner". He expects the system to remember context across turns.

### Goal & Motivation

David wants to refine generated visuals through natural-language follow-up prompts, treating the interaction like a conversation with an art director. His motivation is achieving an exact creative vision without regenerating from scratch each time.

### Acceptance Criteria

- [ ] After generating an initial visual, user can select it and enter a follow-up prompt
- [ ] The system preserves the original visual as a reference alongside the new iteration
- [ ] User can view a history timeline showing all iterations of a given visual
- [ ] User can revert to any previous version in the history
- [ ] Each follow-up generation completes within 15 seconds
- [ ] The iteration count is displayed (e.g., "v3 of 5")
- [ ] User can compare any two versions side-by-side
- [ ] The system retains context for up to 10 iterations per visual
- [ ] Prompts can reference the previous version (e.g., "undo that change") and the system responds correctly
- [ ] Version history persists across sessions (logged-in users)

### Priority

P0 — Differentiating feature; directly supports "看见即得到"

### Estimate

M — Backend state management for version trees + UI for history/comparison

---

## US-03: Collect & Prioritize Ideas with Email Integration

**User Type**: Product Manager

### Persona

Sarah is a product manager at a B2B SaaS company. She runs quarterly ideation campaigns where customers submit feature ideas via email. She needs a way to aggregate incoming ideas, tag them by theme, prioritize them, and follow up with submitters — all without leaving MiniMax Studio.

### Goal & Motivation

Sarah connects a shared inbox or forwards emails into the platform. Each idea becomes a visual concept card that she can score, tag, and rank. Her motivation is closing the loop between customer feedback and concrete visual prototypes, while maintaining attribution and follow-up capability.

### Acceptance Criteria

- [ ] User can forward or paste email content into the platform
- [ ] The system extracts the idea description and sender email automatically
- [ ] Each idea is stored as a card with: title, description, sender email, timestamp, tags, priority score
- [ ] User can add custom tags (e.g., "mobile", "billing", "urgent") to any idea card
- [ ] User can assign a priority score (1-5) to each idea card
- [ ] User can sort and filter idea cards by tag, priority, or date
- [ ] User can click "Follow Up" on any card to open an email compose dialog pre-filled with the sender's address
- [ ] The system displays the aggregate count of ideas per tag as a summary
- [ ] Bulk export to CSV is available with all fields
- [ ] Ideas are persisted and accessible across sessions

### Priority

P1 — Important for B2B/team use cases; enables collaborative workflows

### Estimate

M — Email parsing logic, data model for ideas, CRUD UI, tagging/filtering, export

---

## US-04: Generate Visual Mockups from Campaign Ideas

**User Type**: Marketing Team Member

### Persona

Jessica is a marketing manager at a consumer brand. She plans quarterly campaigns and needs to present visual mockups to stakeholders before creative agencies are engaged. She works with brief text descriptions of campaign concepts and needs polished visuals that can be embedded in presentation decks.

### Goal & Motivation

Jessica inputs a campaign tagline, theme description, and brand guidelines (colors, fonts) and receives on-brand visual mockups ready for stakeholder review. Her motivation is compressing the time between campaign brief and visual-ready presentation from days to minutes.

### Acceptance Criteria

- [ ] User can input a campaign name, tagline, target audience description, and theme keywords
- [ ] User can optionally upload a brand guidelines file (colors, fonts, logo) or enter hex codes and font names
- [ ] The system generates 1-3 campaign-ready visual mockups incorporating brand elements
- [ ] Generated mockups include text overlays for the tagline
- [ ] User can resize any mockup to common presentation dimensions (16:9, 1:1, 9:16)
- [ ] User can download all mockups as a ZIP file
- [ ] Each mockup includes a small "Generated by MiniMax Studio" watermark (toggleable)
- [ ] User can add mockups to a campaign board that groups related visuals
- [ ] Brand guidelines are remembered across sessions for the team
- [ ] If brand colors conflict with visual composition, the system warns the user

### Priority

P1 — Key for marketing vertical; directly supports "想到即看见"

### Estimate

M — Brand customization layer, multi-format export, campaign board UI

---

## US-05: Capture Photo, AI Transform, Visualize

**User Type**: Mobile User

### Persona

Leo is a 28-year-old architect who uses his phone to photograph interesting buildings, interiors, and urban details during his commute. He wants to transform these real-world observations into stylized visuals — sketch renderings, watercolor interpretations, or mood-board collages — to use in client presentations or personal inspiration boards.

### Goal & Motivation

Leo opens the mobile app, points the camera at something inspiring, and within seconds sees multiple AI-powered transformations of the photo. His motivation is turning passive observation into actionable creative assets without needing desktop software or design skills.

### Acceptance Criteria

- [ ] User can take a photo directly within the app or upload from the device gallery
- [ ] The system supports images up to 12MP and 20MB in size
- [ ] Before transformation, user selects a style preset (e.g., "watercolor", "pencil sketch", "neon", "architectural line drawing", "mood board")
- [ ] The system generates at least 2 transformed visuals within 15 seconds
- [ ] User can compare the original photo and the transformation side-by-side
- [ ] User can share transformed images directly to Instagram, WhatsApp, or save to gallery
- [ ] The app works offline for viewing previously generated transformations (regeneration requires connectivity)
- [ ] Mobile layout is fully functional on screens 375px to 428px wide
- [ ] The app uses progressive enhancement: core features work on 3G, optimized on 4G+
- [ ] If camera permission is denied, the app shows a clear guide to enable it

### Priority

P2 — Expands addressable market to mobile-first users; supports viral sharing loop

### Estimate

L — Mobile camera/gallery integration, image processing pipeline, style transfer models, sharing SDK

---

## US-06: Engagement Metrics Dashboard

**User Type**: CEO / Founder

### Persona

Alex is the co-founder and CEO of a startup using MiniMax Studio as a customer-facing ideation tool on their platform. She needs to measure product-market fit by tracking how many ideas are submitted, how quickly they are converted to visuals, and the overall success rate of the pipeline. She reviews metrics weekly in leadership meetings.

### Goal & Motivation

Alex accesses a real-time dashboard showing key engagement and pipeline metrics. Her motivation is making data-driven decisions about product direction, team sizing, and go-to-market focus without needing to pull raw data or ask an analyst.

### Acceptance Criteria

- [ ] Dashboard displays: total ideas submitted, total visuals generated, average time-to-first-visual (in minutes)
- [ ] Dashboard displays: 7-day and 30-day trend lines for each metric
- [ ] Dashboard displays: top 5 most-used prompt keywords (word cloud or ranked list)
- [ ] Dashboard displays: success rate (% of prompts that produced a satisfactory visual, based on user rating)
- [ ] User can filter metrics by date range (last 7, 30, 90 days, custom)
- [ ] User can export dashboard data as a PDF report
- [ ] Dashboard loads within 3 seconds; charts render without visible flicker
- [ ] If data is unavailable (e.g., analytics not connected), the dashboard shows a clear empty state with setup instructions
- [ ] Metrics are read-only; no editing capability on the dashboard
- [ ] Dashboard is accessible at `/dashboard` and protected by authentication

### Priority

P2 — Supports executive decision-making; not blocking for core product use

### Estimate

L — Analytics data model, chart rendering (e.g., Recharts), PDF export, auth-protected route

---

## Appendix: Story Sizing Scale

| Size | Description | Relative Effort |
|---|---|---|
| S | 1-2 days | Single-component change, no new data model |
| M | 3-5 days | New UI surface, simple data model, minor API work |
| L | 1-2 weeks | Multiple new screens, external integration, queue/async processing |
| XL | 2-4 weeks | AI model integration, distributed systems, new architecture |

## Appendix: Priority Definitions

| Priority | Meaning |
|---|---|
| P0 | Must have for launch; core product loop |
| P1 | Should have; significant user value, can defer one sprint |
| P2 | Nice to have; polish, expansion, or executive visibility |
