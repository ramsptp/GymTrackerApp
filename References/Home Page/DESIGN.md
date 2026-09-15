---
name: Kinetic Precision
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#c2c6d8'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#8c90a1'
  outline-variant: '#424656'
  surface-tint: '#b3c5ff'
  primary: '#b3c5ff'
  on-primary: '#002b75'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#0054d6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#abd600'
  on-tertiary: '#283500'
  tertiary-container: '#617b00'
  on-tertiary-container: '#f0ffbe'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#c3f400'
  tertiary-fixed-dim: '#abd600'
  on-tertiary-fixed: '#161e00'
  on-tertiary-fixed-variant: '#3c4d00'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  metric-display:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  label-micro:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-regular:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies precision athletic engineering: an uncompromising, instrument-grade interface built for performance tracking under intense physical focus. Drawing inspiration from aerospace telemetry, race engineering, and high-performance weightlifting consoles, the style fuses dark-mode minimalism with razor-sharp mechanical feedback.

The target audience consists of dedicated strength athletes, lifters, and performance coaches who demand speed, dense legibility, and distraction-free operation. The interface must evoke authority, mechanical precision, and immediate confidence. Interactions deliver instantaneous, tangible visual responses designed to feel like tactile toggles on premium gym equipment.

## Colors

The palette operates on calibrated low-reflectance surfaces contrasted with high-voltage operational signals:

- **Surface Neutral (`#0C0E12`)**: The void baseline canvas. It reduces ocular strain in low-light gym environments and creates absolute depth.
- **Card Surface (`#161920`)**: Elevated structural layer for modular telemetry tiles, set rows, and workout cards.
- **Stroke / Separator (`#232733`)**: High-tensile, low-contrast structural perimeter ensuring container edge isolation without clutter.
- **Primary Accent (`#0066FF`)**: Electric Cobalt. Denotes operational primaries: session initiation, timer execution, and dynamic kinetic states.
- **Secondary Accent (`#10B981`)**: Precision Emerald. Assigned strictly to completion, verified sets, personal records (PRs), and positive deltas.
- **Tertiary Accent (`#CCFF00`)**: High-visibility Neon Lime. Reserved for immediate alerts, rest clock warnings, and active intervals.
- **Typography Base (`#FFFFFF`)**: High-contrast, unmuted white for primary numerical readouts, supported by `#8E95A5` for sub-labels and metadata.

## Typography

Typography functions as visual instrumentation. Powered by Geist across all hierarchies, glyphs leverage tabular figures (`font-feature-settings: 'tnum' on, 'cv05' on`) to eliminate layout twitching during active rest timers and real-time biometric tracking.

- **Metric Display & Headlines**: Raw, condensed tracking with heavy weights for rapid glancing during mid-effort fatigue.
- **Body Text**: Neutral, legible, and unadorned for workout notes and muscle group descriptions.
- **Micro-Labels**: Always capitalized with loose tracking (`0.08em`) to guarantee immediate visual classification of data columns (e.g., `SET`, `LBS`, `REPS`, `RPE`).

## Layout & Spacing

The layout is built on a tight, 4px/8px incremental base grid configured for single-hand mobile utility and rapid scanning.

- **Mobile Rhythm**: Strict 16px (`1rem`) outer canvas margins with an internal fluid single-column stack. Vertical rhythm enforces large tap safe-zones with a hard floor of 56px touch heights.
- **Data Grids**: Set loggers use 4-column structured metric distributions (`SET` | `PREVIOUS` | `LBS` | `REPS` | `STATUS`) separated by minimal 8px gutters to maximize tap target boundaries.
- **Desktop / Tablet Expansion**: Adapts to a 12-column modular grid anchored inside a maximum 1080px container, anchoring real-time timers and telemetry sidebars while preserving direct mechanical alignment.

## Elevation & Depth

Elevation rejects diffuse blurs and soft shadows in favor of hard-edged structural stratification, eliminating visual haze:

- **Tier 0 (Canvas)**: `#0C0E12` base environment.
- **Tier 1 (Surface Module)**: `#161920` enclosed within a solid 1px border of `#232733`. No box shadow; physical separation is defined purely by perimeter contrast.
- **Tier 2 (Interactive Floating / Active State)**: `#1E232D` with a crisp 1px stroke of `#32384A` and an optional ambient micro-glow: `0 0 0 1px #0066FF` when an active set input is engaged.
- **Tier 3 (Modals & Overlays)**: `#161920` with a sharp mechanical drop `0 12px 24px -4px rgba(0, 0, 0, 0.75)` and a rigid perimeter border.

## Shapes

The design uses soft, razor-precise micro-radii (`roundedness: 1`). 

- Default elements (input boxes, set rows, badges, buttons) utilize a disciplined `0.25rem` (4px) corner radius.
- Cards, modal containers, and workout grouping shells apply `0.5rem` (8px) corner geometry (`rounded-lg`).
- Continuous circular curves (`rounded-full`) are reserved exclusively for completion checkboxes, state toggles, and status pips to instantly distinguish interactive triggers from static data housings.

## Components

### Buttons & Quick-Action Triggers
- **Primary Execution Button**: Minimum 56px height, full-width or structural block. Background `#0066FF`, typography `label-regular` in solid `#FFFFFF`. Active state shifts to `#0052CC` with an instantaneous 100ms scale down (`transform: scale(0.98)`).
- **Secondary Utility Trigger**: 56px height, surface `#161920`, border `1px solid #232733`, text `#FFFFFF`.
- **Set Completion Toggle**: 56px × 56px minimum target containing a 28px circular indicator. Incomplete: `#232733` hollow boundary; Complete: `#10B981` solid fill with sharp white checkmark.

### Set Log Rows & Input Fields
- **Data Table Row**: Minimum height 56px, alternate row tinting using `#161920` and transparent canvas. 
- **Metric Inputs**: Fixed-width tabular fields, background `#0C0E12`, border `1px solid #232733`, text color `#FFFFFF` with `metric-display` sizing scaled to inputs (20px bold). Active focus state triggers an immediate electric cobalt outline (`1px solid #0066FF`).

### Modular Telemetry Cards
- Encapsulates exercise groups with a 1px `#232733` border and `#161920` body.
- Exercise title positioned in `headline-md`, accompanied by uppercase micro-labels for exercise sequence and volume tally.

### Timers & Interval Chips
- Compact HUD pill containing rest countdowns. Background `#0C0E12`, border `1px solid #0066FF`, active time digits rendered in `#CCFF00` or `#FFFFFF` with tabular lining numbers.

### Notification Pips & Delta Badges
- Micro status badges (PR, RPE, Dropset) rendered with 4px border-radius, dense uppercase text (`label-micro`), and strict contextual accents (e.g., `#10B981` background at 15% opacity with solid `#10B981` text).