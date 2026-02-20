# NeuroGuard System — Design System

## 1. Project Identity

- **Name:** NeuroGuard System
- **Tagline:** Detect Burnout Before It Hits
- **Tone:** Clinical precision meets modern tech — trustworthy, intelligent, premium
- **Domain:** Healthcare / Biotech / AI Monitoring

---

## 2. Color Palette (Dark Medical-Tech Theme)

| Token             | Value                                     | Usage                              |
|-------------------|-------------------------------------------|------------------------------------|
| Background        | `#0a0e1a`                                 | Main page background (deep navy)   |
| Surface           | `#111827`                                 | Cards, panels, containers          |
| Elevated          | `#1a2235`                                 | Modals, hovers, active states      |
| Border            | `rgba(255,255,255,0.06)`                  | Subtle dividers and card borders   |
| Text Primary      | `#f1f5f9`                                 | Headings, main content             |
| Text Secondary    | `#94a3b8`                                 | Labels, descriptions, captions     |
| Accent Green      | `#22c55e`                                 | Normal / Healthy state             |
| Accent Yellow     | `#eab308`                                 | High Stress state                  |
| Accent Red        | `#ef4444`                                 | Burnout Risk / Critical alerts     |
| Accent Blue       | `#3b82f6`                                 | ECG waveform, primary CTAs         |
| Accent Purple     | `#a855f7`                                 | EMG waveform, secondary highlights |
| Gradient Glow     | `linear-gradient(135deg, #3b82f6, #a855f7)` | Hero CTAs, feature highlights    |

---

## 3. Typography

| Element    | Font            | Size     | Weight |
|------------|-----------------|----------|--------|
| H1         | Space Grotesk   | 2.5rem   | 700    |
| H2         | Space Grotesk   | 1.75rem  | 600    |
| H3         | Space Grotesk   | 1.25rem  | 600    |
| Body       | Inter           | 0.938rem | 400    |
| Label      | Inter           | 0.75rem  | 500    |
| Data/Mono  | JetBrains Mono  | 0.875rem | 500    |

---

## 4. Component Patterns

- **Cards:** Dark surface background (`#111827`), 1px border (`rgba(255,255,255,0.06)`), `border-radius: 16px`, subtle shadow
- **Buttons — Primary:** Gradient background (blue→purple), white text, `border-radius: 12px`, glow shadow on hover
- **Buttons — Secondary:** Transparent with 1px border, text in accent color
- **Inputs:** Dark background (`#1a2235`), subtle border, focus glow ring in accent blue
- **Status Badges:** Pill-shaped, color-coded — Green "Normal", Yellow "High Stress", Red "Burnout Risk"
- **Gauges:** Semi-circular arc, gradient from green→yellow→red, animated needle
- **Waveform Charts:** Dark grid background, ECG in blue (`#3b82f6`), EMG in purple (`#a855f7`), smooth streaming animation
- **Stat Cards:** Icon + label (secondary text) + large value (monospace font) + sparkline mini-chart + trend arrow

---

## 5. Layout Principles

- **Dashboard:** Fixed sidebar (left, collapsible) + scrollable main content
- **Sidebar:** Dark background, icon + text nav items, active state with accent blue left border + subtle background highlight
- **Grid:** CSS Grid — 3-column max on desktop, 2-column on tablet, 1-column on mobile
- **Spacing:** 8px base unit, consistent padding (16px cards, 24px sections, 32px page margins)
- **Card radius:** 16px, button radius: 12px

---

## 6. Design System Notes for Stitch Generation

**CRITICAL — Include this block in every Stitch prompt:**

```
DESIGN SYSTEM RULES:
- Dark theme: background #0a0e1a, cards #111827, elevated #1a2235
- Text: primary #f1f5f9, secondary #94a3b8
- Accent colors: blue #3b82f6 (ECG/primary), purple #a855f7 (EMG), green #22c55e (Normal), yellow #eab308 (High Stress), red #ef4444 (Burnout Risk)
- Fonts: Space Grotesk for headings (bold), Inter for body, JetBrains Mono for data values
- Cards: dark surface with subtle 1px border, 16px radius, subtle shadow
- Buttons: gradient blue-to-purple for primary, 12px radius
- Status badges: pill-shaped, color-coded (green/yellow/red)
- Grid layout, 8px spacing base, generous whitespace
- Micro-animations: fade-in cards, hover glow, pulse on alerts
- Premium, clinical, modern tech aesthetic — NOT flat or minimal
- All charts on dark grid backgrounds with vibrant colored lines
```
