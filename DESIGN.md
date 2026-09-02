# DESIGN.md

Recur is a training instrument, not a product. Every screen exists to make one person recall
LeetCode solutions better and faster. This file is the direction the whole build is held to.
Nothing below gets restyled piecemeal at the end.

## Design read

Dense personal product UI (a queue, tables, a review card), used every morning on a Mac and a
phone by one engineer. Register: calm, disciplined, information-rich. References for tone:
Linear (density, hairlines), Things 3 (quiet type, air inside lists), Raycast (keyboard first,
command palette), Anki (a grade bar that shows intervals), Vercel's dashboard tables.
We borrow their restraint, not their branding. There is no hero, no marketing copy, no onboarding.

Consulted: the taste-skill and Anthropic frontend-design rules (in force for the whole build) and
the ui-ux-pro-max design database. The database proposed "Claymorphism, study purple, Varela
Round" for a study tool. Rejected: chunky and playful contradicts the brief. Its accessibility
checklist (4.5:1 contrast, 44 px targets, visible focus, reduced motion) is adopted as is.

## Direction: notebook and instrument

Two layers, two voices.

- The instrument (navigation, tables, controls, counters, charts) is set in Geist, small,
  tabular, hairline-bordered and almost colorless.
- The material (what I wrote for myself: problem titles, my restatement of the prompt, the key
  insight) is set in Newsreader, a text serif with optical sizes. On the card back the key
  insight is the first thing shown, large, in Newsreader italic, like a line underlined in a
  textbook.

That contrast is the signature. Everything around the insight stays quiet so the insight is the
loudest thing on the screen. The 3D flip is the only theatrical motion in the app, and it carries
meaning: front is the question, back is the answer.

## Type

| Role | Face | Sizes (px / line) | Notes |
| --- | --- | --- | --- |
| Material / display | Newsreader (variable, opsz 6-72, italic) | 24/32 page titles, 28/36 card title, 32/40 to 40/48 key insight | wght 400-500, tracking -0.01em at 24 px and above. Never on buttons, labels or tables. |
| UI / body | Geist (variable) | 12/16 captions, 13/18 tables, 14/20 default, 16/26 notes and phone inputs | wght 400/500/600 only. Tabular figures everywhere (`tnum`). |
| Code | JetBrains Mono | 13/20 | Ligatures off (`liga 0, calt 0`), tab-size 4, `white-space: pre`. |

Micro labels (11 px, +0.04em tracking) are allowed on table headers and form labels only. No
eyebrow above every heading. Numbers are never set in the display face.

## Color

Tokens are OKLCH so the three palettes share hue and chroma logic and differ in lightness.
One accent, used only for interaction: primary button, links, focus ring, selected state,
active navigation. All other color in the interface is information.

| Token | Light (paper) | Dim (lamp) | Dark (true) |
| --- | --- | --- | --- |
| bg | oklch(0.985 0.003 90) | oklch(0.255 0.009 65) | oklch(0.14 0.005 260) |
| surface | oklch(1 0 0) | oklch(0.29 0.010 65) | oklch(0.175 0.006 260) |
| sunken | oklch(0.962 0.004 90) | oklch(0.232 0.009 65) | oklch(0.115 0.005 260) |
| fg | oklch(0.21 0.010 260) | oklch(0.86 0.012 75) | oklch(0.93 0.004 260) |
| fg-muted | oklch(0.50 0.012 260) | oklch(0.68 0.014 70) | oklch(0.70 0.010 260) |
| fg-subtle | oklch(0.62 0.010 260) | oklch(0.56 0.012 70) | oklch(0.55 0.010 260) |
| border | oklch(0.905 0.006 80) | oklch(0.34 0.010 65) | oklch(0.24 0.006 260) |
| border-strong | oklch(0.84 0.008 80) | oklch(0.42 0.012 65) | oklch(0.32 0.008 260) |
| accent (cobalt) | oklch(0.52 0.16 262) | oklch(0.74 0.11 262) | oklch(0.76 0.13 262) |

Dim is a real third palette: warm near-black grey, foreground softened to about 10:1 (muted text
about 5.5:1, still AA), muted accent, tuned for a long session under a lamp. Dark is a true dark
with a cool cast. Light is paper, not white and not cream.

Semantic hues (each defined per theme so they read on paper and on dark):

- Ratings follow Anki so muscle memory carries over: Again red (hue 22), Hard amber (hue 70),
  Good green (hue 150), Easy teal (hue 195).
- Difficulty follows LeetCode: easy teal (hue 175), medium amber (hue 80), hard rose (hue 10).
- Tag colors: a fixed set of twelve designed hues at matched lightness, never arbitrary hex.
- Retrievability has no hue of its own; heat uses alpha steps of the accent.

Rule: if a color is not one of the above, it does not appear.

## Space and shape

- 4 px base, 8 pt rhythm: 4, 8, 12, 16, 24, 32, 48, 64.
- Shape lock: 4 px for badges and kbd, 6 px for controls and menu items, 10 px for panels,
  dialogs and the card. No pills. The only circle is the user avatar.
- Borders are 1 px hairlines. Shadows only on floating layers (menus, dialogs, palette), tinted
  to the background. Cards on the page have no shadow.
- Layout: sidebar 232 px at 1024 px and up; content max 1120 px; reading column 680 px for the
  card and problem detail. Phone: top bar 52 px, bottom tab bar 56 px plus safe area.
- Table rows 40 px on desktop; list rows and every touch target 44 px on phones.

## Motion

Only where it carries meaning, 150 to 350 ms, easing `cubic-bezier(0.2, 0.7, 0.2, 1)`.

- Flip: rotateY, 350 ms, perspective 1400 px; the container height eases to the back's height.
- Next card: 200 ms, 24 px slide plus fade.
- Grade feedback: the chosen button fills for 150 ms; an aria-live region says what was scheduled.
- Menus and dialogs: 150 ms fade with a 0.98 to 1 scale.
- Hover changes color only. Active presses translate 1 px down. Nothing scales on hover.
- `prefers-reduced-motion`: the flip becomes a 150 ms crossfade, slides become fades, the rest is instant.

## Copy

Sentence case. Verbs on buttons: Start session, Mark as solved, Add to backlog, Save. No
exclamation marks, no praise, no confetti. Errors say what happened and what to do next. Empty
states tell you the one action that fills them. No em dashes in interface text.

## Components

shadcn primitives are the starting point only. Buttons: 32 px default, 36 px comfortable, 44 px
on touch; primary is accent with white text, secondary is surface plus hairline, ghost is text.
Inputs: 36 px, hairline, focus ring 2 px accent. Badges: 20 px, tinted background plus colored
text. Segmented controls: sunken track, surface thumb with a hairline. Tables: horizontal hairlines
only, 12 px muted header, no zebra striping. Kbd: mono 11 px, 4 px radius.

Icons: Phosphor, regular weight, 16 px inline and 20 px in navigation. One family, no emoji.

## Not in this app

Gradients, glass blur, floating blobs, sparkle icons, emoji in chrome, hover scale, confetti,
purple, hero copy, marketing tone, eyebrows on every section, decorative dots, section numbering,
rounded-2xl shadow-lg card grids, em dashes.
