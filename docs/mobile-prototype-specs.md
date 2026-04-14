# MiniMax Studio — Mobile Prototype Specifications

**Status**: Draft | **Version**: 1.0 | **Date**: 2026-04-09
**Design System**: Terminal Minimal Dark
**Design Philosophy**: "想到即看见，看见即得到" — Think it. See it. Get it.
**Platform Target**: iOS 15+ (primary), Android 10+ (secondary)
**Viewport**: 375x812 (iPhone target), fluid down to 320px width

---

## Table of Contents

1. [Design Tokens & Visual Foundation](#1-design-tokens--visual-foundation)
2. [Screen Flow Map](#2-screen-flow-map)
3. [Screen 1 — Splash](#3-screen-1--splash)
4. [Screen 2 — Home](#4-screen-2--home)
5. [Screen 3 — Idea Input](#5-screen-3--idea-input)
6. [Screen 4 — Processing](#6-screen-4--processing)
7. [Screen 5 — Result](#7-screen-5--result)
8. [Screen 6 — Share](#8-screen-6--share)
9. [Tab Bar Navigation](#9-tab-bar-navigation)
10. [Input Validation Specifications](#10-input-validation-specifications)
11. [Interaction Specifications](#11-interaction-specifications)
12. [Error State System](#12-error-state-system)
13. [Animation Specifications](#13-animation-specifications)
14. [Component Library Summary](#14-component-library-summary)

---

## 1. Design Tokens & Visual Foundation

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0a0e17` | Main background |
| `--bg-secondary` | `#111827` | Card / panel backgrounds |
| `--bg-tertiary` | `#1a2234` | Elevated surfaces, input fields |
| `--bg-overlay` | `rgba(10, 14, 23, 0.85)` | Modal / sheet overlays |
| `--accent-primary` | `#7c3aed` | Primary CTA buttons, active states |
| `--accent-glow` | `rgba(124, 58, 237, 0.30)` | Glow shadows, focus rings |
| `--accent-secondary` | `#a78bfa` | Secondary text, icons |
| `--accent-pink` | `#ec4899` | Gradient terminus, highlights |
| `--text-primary` | `#f1f5f9` | Headings, primary labels |
| `--text-secondary` | `#94a3b8` | Body text, descriptions |
| `--text-muted` | `#64748b` | Placeholders, captions, disabled |
| `--border-default` | `#1f2937` | Default borders |
| `--border-active` | `#334155` | Hover / focus borders |
| `--border-accent` | `#7c3aed` | Focus rings on inputs |
| `--success` | `#22c55e` | Success states |
| `--warning` | `#f59e0b` | Warning states |
| `--error` | `#ef4444` | Error states, destructive |
| `--terminal-green` | `#4ade80` | Terminal aesthetic accent |

### Typography

| Style | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| `display` | SF Pro Display | 32px | 800 | 1.1 | -0.03em |
| `h1` | SF Pro Display | 24px | 700 | 1.2 | -0.02em |
| `h2` | SF Pro Text | 20px | 600 | 1.3 | -0.01em |
| `h3` | SF Pro Text | 17px | 600 | 1.4 | 0 |
| `body` | SF Pro Text | 15px | 400 | 1.5 | 0 |
| `body-sm` | SF Pro Text | 13px | 400 | 1.5 | 0 |
| `caption` | SF Pro Text | 11px | 500 | 1.4 | 0.05em |
| `button` | SF Pro Text | 15px | 600 | 1.0 | 0 |
| `mono` | SF Mono | 13px | 400 | 1.5 | 0 |

### Spacing System (8pt Grid)

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Chips, tags |
| `--radius-md` | 10px | Inputs, small cards |
| `--radius-lg` | 16px | Cards, modals |
| `--radius-xl` | 24px | Bottom sheets |
| `--radius-full` | 9999px | Pills, avatars |

### Safe Area

- Top safe area: `env(safe-area-inset-top)` — minimum 44px on notched devices
- Bottom safe area: `env(safe-area-inset-bottom)` — minimum 34px on home indicator devices
- Tab bar height: 49px + bottom safe area
- Status bar: 20px on notched devices, 44px on Dynamic Island

### Shadows

```
--shadow-sm:   0 1px 3px rgba(0,0,0,0.4)
--shadow-md:   0 4px 12px rgba(0,0,0,0.5)
--shadow-lg:   0 8px 24px rgba(0,0,0,0.6)
--shadow-glow: 0 0 20px var(--accent-glow)
```

---

## 2. Screen Flow Map

```
[Splash]
    │
    ▼
[Home] ◄──────────────────────────────────────────┐
    │                                             │
    ├──► [Idea Input] ──► [Processing] ──► [Result] ──► [Share]
    │                        │                     │
    │                        │ (failure)           │
    │                        ▼                     │
    │                    [Error State]            │
    │                                             │
    ├──► [Explore] (tab)                          │
    ├──► [Create] (tab)                           │
    └──► [Profile] (tab) ─────────────────────────┘
                                                    (back to home)
```

### Navigation Architecture

| Navigation Type | Mechanism |
|-----------------|-----------|
| Screen to screen | React Navigation `Stack.Navigator` |
| Tab switching | React Navigation `BottomTab.Navigator` |
| Modals / sheets | `react-native-modal`, bottom sheet pattern |
| Back behavior | Hardware back + in-app back gesture |
| Deep linking | URL scheme: `minimaxstudio://` |

---

## 3. Screen 1 — Splash

### Purpose

Cold start branding moment. Establishes brand identity before transitioning to Home. Duration: 1,800ms total.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│                              │
│                              │
│         [M]                  │  <- Logo mark, 72x72px
│                              │     Animated scale-in: 0.8 → 1.0
│     MiniMax Studio           │  <- display font, centered
│                              │
│    Think it. See it.          │  <- h2, secondary text, 300ms delay
│    Get it.                    │  <- h2, secondary text, 500ms delay
│                              │
│                              │
│  [terminal cursor blink]    │  <- mono font, 100ms blink interval
│                              │
│  [safe area bottom]          │
└──────────────────────────────┘
```

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `SplashLogo` | Image / SVG | default | Scale-in animation 0ms delay, 400ms duration, ease-out |
| `SplashTitle` | Text | hidden → visible | Fade-in + translateY (20px → 0), 300ms delay, 300ms duration |
| `SplashTagline` | Text (mono) | hidden → visible | Typewriter reveal, 200ms per character, 500ms initial delay |
| `TerminalCursor` | View | blinking | Opacity toggle 0↔1 every 100ms, starts at 900ms |

### Animation Sequence

```
t=0ms:    SplashLogo appears (scale 0.8 → 1.0, opacity 0 → 1, 400ms ease-out)
t=300ms:  SplashTitle fades in (opacity 0 → 1, translateY 20px → 0, 300ms)
t=500ms:  Tagline line 1 typewriter starts (each char: 200ms)
t=900ms:  Tagline line 2 typewriter starts
t=1400ms: Terminal cursor appears and starts blinking
t=1800ms: Full transition to Home (fade-out, 300ms)
```

### Transition Out

- Full screen fade to `--bg-primary`
- Home screen fades in simultaneously
- No loading spinner — the brand moment IS the loading signal

---

## 4. Screen 2 — Home

### Purpose

Primary landing after splash. Shows user prompt history and primary CTA "立即开始". Pull-to-refresh updates the feed.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│  MiniMax Studio         [⚙️]  │  <- h3, right icon
│──────────────────────────────│
│  想到即看见，看见即得到        │  <- caption, accent-secondary
│──────────────────────────────│
│                              │
│  [Recent Ideas Feed]         │  <- ScrollView, pull-to-refresh
│  ┌────────────────────────┐  │
│  │  [Thumbnail 1]  Title   │  │
│  │  text preview...  2h ago│  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  [Thumbnail 2]  Title   │  │
│  │  text preview...  1d ago│  │
│  └────────────────────────┘  │
│  ...                         │
│                              │
│                              │
│  [+ FAB or CTA card]         │  <- Fixed bottom CTA
│                              │
│  [Home] [Explore] [+] [Profile]│ <- Tab bar
└──────────────────────────────┘
```

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `HomeHeader` | View | default | Sticky, blur background on scroll |
| `FeedCard` | TouchableOpacity | default, pressed, loading | Press: scale 0.98, 100ms. Navigate to Result |
| `PromptThumbnail` | Image | loading (skeleton), loaded, error | Skeleton shimmer until loaded |
| `FeedCardTitle` | Text (h3) | default | 2-line clamp, ellipsis overflow |
| `FeedCardMeta` | Text (caption) | default | Relative timestamp, text-muted |
| `EmptyState` | View | visible when no history | Illustration + "Start creating" copy |
| `PullToRefresh` | ScrollView | idle, refreshing | Native RefreshControl, accent color |
| `HomeCTA` | TouchableOpacity | default, pressed, disabled | Full-width, gradient fill, "立即开始" |
| `TabBar` | View | per-tab active state | Fixed bottom, safe-area aware |

### Feed Card Detail

```
┌──────────────────────────────────────┐
│ [16x9 Thumbnail Image]  80px height  │
├──────────────────────────────────────┤
│ Title of the idea           2h ago   │
│ Preview of the idea text...          │
└──────────────────────────────────────┘
```

- Card padding: `--space-3` all sides
- Thumbnail aspect ratio: 16:9, object-fit: cover
- Gap between cards: `--space-3`
- On press: subtle haptic (light), scale down 0.98, navigate to Result

### Pull-to-Refresh

- Threshold: 80px pull distance
- Spinner: iOS native UIActivityIndicator, `--accent-primary` color
- Haptic: medium impact on threshold reached
- On refresh: re-fetch idea history from local storage / API

### Empty State

```
┌──────────────────────────────┐
│                              │
│         [✨ icon]             │  <- 64px, accent-secondary
│                              │
│    No ideas yet              │  <- h2
│    Start creating to see     │  <- body-sm, text-secondary
│    your history here         │
│                              │
│    [立即开始]                 │  <- CTA button
│                              │
└──────────────────────────────┘
```

---

## 5. Screen 3 — Idea Input

### Purpose

Capture the user's creative idea via text, voice, or camera input. Primary text input with supporting input modes. Validate before proceeding.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│  [←] 输入你的创意      [📷🎤]  │  <- back btn, title, input mode toggles
│──────────────────────────────│
│                              │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │  [Text Input Area]       │ │  <- MultilineTextInput, flex: 1
│  │  placeholder:            │ │     min-height: 120px
│  │  "描述你的创意想法..."    │ │     max-height: 280px
│  │                          │ │
│  │                          │ │
│  └──────────────────────────┘ │
│  [char count]  0/500         │  <- caption, bottom of textarea
│                              │
│  ─────────────────────────── │
│                              │
│  [Format Selector]           │  <- Horizontal scroll chips
│  [1:1] [16:9] [9:16] [4:3]   │  <- Aspect ratio pills
│                              │
│  [Email (optional)]           │  <- TextInput, email keyboard
│  ┌──────────────────────────┐ │
│  │ your@email.com           │ │
│  └──────────────────────────┘ │
│                              │
│  [立即开始 →]                │  <- Primary CTA, full width
│                              │
│  [Tab bar]                   │
└──────────────────────────────┘
```

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `InputHeader` | View | default | Back chevron, title, mode toggles |
| `InputModeToggle` | View | text (active), voice, camera | Icon buttons, mutually exclusive |
| `TextInput` | TextInput | empty, typing, filled, error | Multiline, auto-grow, keyboard-aware |
| `CharCounter` | Text | valid, near-limit, over-limit | 0-5 chars: text-muted, 450-499: warning, 500: error |
| `FormatSelector` | HorizontalScrollView | default | Aspect ratio chips, single-select |
| `FormatChip` | TouchableOpacity | unselected, selected | Border toggle, accent fill when selected |
| `EmailInput` | TextInput | empty, filled, error | Single-line, email keyboard type |
| `SubmitButton` | TouchableOpacity | disabled, enabled, loading | Disabled until text >= 5 chars |

### Input Mode: Voice (Waveform)

```
┌──────────────────────────────┐
│  [←] 语音输入           [✕]  │
│──────────────────────────────│
│                              │
│         ┌──┐                  │
│       ┌─┤  ├─┐                │  <- Animated waveform bars
│     ┌─┤  │  ├─┐              │     8-12 bars, varying heights
│   ┌─┤  │  │  ├─┐            │     Height: 10px - 60px
│   │  │  │  │  │            │     Color: accent-primary
│   └─┘  └─┘  └─┘            │     Animation: subtle oscillation
│                              │
│     [按住说话]               │  <- hold-to-record button
│     Hold to record           │
│                              │
│  Duration: 0:00 / 2:00       │  <- caption timer
│                              │
│  [✓ Use Recording]           │  <- appears after recording
└──────────────────────────────┘
```

- Waveform: Canvas or SVG-based animated bars
- Recording max: 120 seconds
- Tap-and-hold to record, release to stop
- Haptic: heavy impact on start, light impact on stop
- After recording: show waveform playback with "Use Recording" CTA

### Input Mode: Camera (Preview)

```
┌──────────────────────────────┐
│  [←] 拍照输入           [↻]  │
│──────────────────────────────│
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │   [Camera Preview]       │ │  <- Live camera feed
│  │   [Photo overlay guides] │ │     Grid lines for composition
│  │                          │ │
│  │   [Focus indicator]      │ │     Square focus ring, 150ms fade
│  │                          │ │
│  └──────────────────────────┘ │
│                              │
│     [⏺ Capture]              │  <- Circular capture button
│                              │
│  Tip: Good lighting helps    │  <- caption, text-muted
│  AI understand your image     │
└──────────────────────────────┘
```

- Camera: `react-native-vision-camera` or equivalent
- Preview: square crop guide (for square output), or full-frame
- Capture: tap to take photo, tap again to retake
- After capture: enters processing directly (no text needed, optional prompt field appears below preview)

---

## 6. Screen 4 — Processing

### Purpose

In-progress state while AI generates visuals. Shows pulsing animation and progress. Users can cancel.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│  [←] 生成中...                │
│──────────────────────────────│
│                              │
│                              │
│      ┌──────────────────┐    │
│      │                  │    │
│      │  [Animated Logo]  │    │  <- Logo mark with pulse ring
│      │    ◯ ◯ ◯          │    │     Outer ring: 0 → 1 scale, 2s loop
│      │                  │    │     Middle ring: 0 → 1 scale, 2s loop, 0.3s delay
│      │                  │    │     Inner ring: 0 → 1 scale, 2s loop, 0.6s delay
│      └──────────────────┘    │
│                              │
│     Generating your vision   │  <- h3
│                              │
│     ━━━━━━━━━━░░░░░░░░░      │  <- Progress bar, indeterminate style
│     Step 2 of 4 — Styling    │  <- caption, step indicator
│                              │
│     Est. time remaining      │  <- body-sm, text-secondary
│     ~15 seconds              │  <- mono font
│                              │
│     [Cancel]                 │  <- Text button, text-muted
│                              │
│     "A futuristic cityscape  │  <- Mono font, truncated prompt
│      at sunset..."           │     2-line clamp
│                              │
│  [Tab bar — disabled]        │
└──────────────────────────────┘
```

### Processing Steps (Indeterminate Progress)

| Step | Label | Duration Estimate |
|------|-------|-------------------|
| 1 | Understanding your idea | ~3s |
| 2 | Generating visuals | ~10-25s |
| 3 | Enhancing quality | ~5s |
| 4 | Finalizing | ~2s |

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `ProcessingRing` | View (animated) | animating | 3 concentric rings, scale pulse |
| `ProcessingLogo` | Image | default | Center logo, subtle breathing animation |
| `ProgressBar` | View | indeterminate | Gradient fill, left-to-right sweep |
| `StepIndicator` | Text | per-step | Updates as processing stage changes |
| `ETAText` | Text (mono) | updating | Recalculates every 5s, shows "~Xs remaining" |
| `CancelButton` | TouchableOpacity | default, confirming | First tap: "Cancel?" with 3s auto-dismiss. Second tap: confirm cancel |
| `PromptEcho` | Text (mono) | default | Shows submitted prompt, 2-line clamp |
| `TabBar` | View | disabled | Tabs greyed out, non-interactive |

### Cancel Flow

1. User taps "Cancel"
2. Button text changes to "Cancel?" (warning color)
3. Haptic: light impact
4. 3-second auto-revert timer (shows countdown)
5. User taps again within 3s: cancel confirmed, return to Home
6. Or: timer expires, button reverts to "Cancel"

### Transition to Result

- 300ms fade-out of processing screen
- 300ms fade-in of result screen
- No jarring cuts — seamless reveal

---

## 7. Screen 5 — Result

### Purpose

Display the generated visual(s) with actions: regenerate, save, iterate, share.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│  [←] 生成结果                 │
│──────────────────────────────│
│                              │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │                          │ │
│  │   [Generated Image]      │ │  <- Full-width, aspect-preserved
│  │                          │ │     max-height: 60% of screen
│  │                          │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                              │
│  [Image Actions Bar]          │  <- Horizontal, icon buttons
│  [↺ Regenerate] [♡] [📥 Save] │
│                              │
│  ─────────────────────────── │
│                              │
│  Prompt:                     │  <- caption, text-muted
│  "A futuristic cityscape..." │  <- mono font
│                              │
│  [Refine this result]        │  <- Secondary CTA, outline style
│                              │
│  [Continue creating →]       │  <- Primary CTA, returns to Input
│                              │
│  [Tab bar]                   │
└──────────────────────────────┘
```

### Result Grid (Multi-Image State)

When 2-4 images are returned:

```
┌──────────────────────────────┐
│  [←] 生成结果 (4张)           │  <- shows count
│──────────────────────────────│
│  ┌──────────┐ ┌──────────┐   │
│  │          │ │          │   │
│  │  [Img 1] │ │  [Img 2] │   │
│  │          │ │          │   │
│  ├──────────┤ ├──────────┤   │
│  │  [♡] [↗] │ │  [♡] [↗] │   │  <- Overlay actions on each
│  └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐   │
│  │          │ │          │   │
│  │  [Img 3] │ │  [Img 4] │   │
│  │          │ │          │   │
│  ├──────────┤ ├──────────┤   │
│  │  [♡] [↗] │ │  [♡] [↗] │   │  <- Overlay actions on each
│  └──────────┘ └──────────┘   │
│                              │
│  [Save All]  [Share All]    │  <- Full-width action row
└──────────────────────────────┘
```

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `ResultImage` | Image | loading (skeleton), loaded, error | Fade-in + scale (0.95 → 1.0) on load |
| `ActionBar` | View | default | Horizontal scroll if needed |
| `ActionButton` | TouchableOpacity | default, pressed | Icon + label, scale 0.95 on press |
| `RegenerateButton` | ActionButton | default, loading | Triggers re-processing, shows inline spinner |
| `FavoriteButton` | ActionButton | inactive, active | Toggle heart fill, haptic light on toggle |
| `SaveButton` | ActionButton | default, saving, saved | Haptic medium on save, shows checkmark for 2s |
| `RefinePrompt` | Text | default | Shows original prompt, expandable |
| `RefineButton` | TouchableOpacity | default, pressed | Outline style, navigates to Input with prefilled prompt |
| `ContinueButton` | TouchableOpacity | default, pressed | Primary gradient, "继续创作 →" |
| `ImageGrid` | View | default | 2-column grid, 8px gap |
| `ImageOverlay` | View | visible (on tap) | Heart + share icons over individual grid image |

### Image Actions

| Action | Icon | Haptic | Behavior |
|--------|------|--------|----------|
| Regenerate | ↻ | Light | Re-runs generation with same prompt, replaces current |
| Favorite | ♡ / ♥ | Light | Toggles heart, saves to favorites |
| Save | ↓ | Medium | Downloads image to camera roll, shows toast |
| Share | ↗ | Light | Opens native share sheet |
| Compare | ⊟ | Light | Opens side-by-side view (original vs result) |

### Save-to-Roll Flow

1. User taps Save
2. Haptic: medium impact
3. Button shows spinner briefly
4. Image saved to camera roll
5. Button shows checkmark (✓) for 2,000ms
6. Button reverts to default
7. Toast: "Saved to Photos" at bottom of screen, auto-dismisses after 2s

---

## 8. Screen 6 — Share

### Purpose

Share the generated visual to social platforms or via link. Supports native share sheet, direct social links, and copy-link.

### Layout (375x812 target)

```
┌──────────────────────────────┐
│  [status bar]                │
│  [←] 分享你的创作             │
│──────────────────────────────│
│                              │
│  ┌──────────────────────────┐ │
│  │                          │ │
│  │   [Shareable Image]      │ │  <- Preview of the image to share
│  │                          │ │     Slightly reduced (80% width)
│  │                          │ │
│  └──────────────────────────┘ │
│                              │
│  MiniMax Studio              │  <- Watermark text below image
│  minimaxstudio.app/ide_xxxx  │  <- mono font, shareable link
│                              │
│  [Copy Link]                  │  <- Touchable, text-muted
│                              │
│  ─────────────────────────── │
│                              │
│  Share to:                   │  <- caption
│                              │
│  [IG] [TT] [WB] [X] [More]   │  <- Platform icons, horizontal scroll
│                              │
│  ─────────────────────────── │
│                              │
│  [Create another →]          │  <- Secondary CTA
│                              │
│  [Tab bar]                   │
└──────────────────────────────┘
```

### Share Platforms (Initial)

| Platform | Icon | Color | Behavior |
|----------|------|-------|----------|
| Instagram Stories | IG icon | `#E4405F` | Direct share via native SDK |
| TikTok | TT icon | `#000000` | Open TikTok composer with image |
| Weibo | WB icon | `#DF2233` | Share via Weibo SDK |
| X / Twitter | X icon | `#000000` | Open Twitter composer with image + link |
| More | + icon | `--text-muted` | Opens native system share sheet |

### Shareable Link Format

```
https://minimaxstudio.app/result/{idea_id}
```

- `idea_id`: Alphanumeric ID from the backend (e.g., `ide_01HX9K3M4N5P6Q7R8S`)
- Link is valid for 30 days (TTL)
- View-only page: shows image, prompt, and MiniMax Studio branding
- No login required to view shared links

### Components

| Component | Type | States | Behavior |
|-----------|------|--------|----------|
| `SharePreview` | Image | default | Centered, 80% width, rounded-lg |
| `ShareLink` | Text (mono) + Touchable | default, copied | Shows truncated link, tap to copy |
| `CopyLinkButton` | TouchableOpacity | default, copied | "Copy Link" → "Copied!" for 2s, then reverts |
| `PlatformGrid` | HorizontalScrollView | default | Platform share buttons |
| `PlatformButton` | TouchableOpacity | default, pressed | Icon + platform name, scale 0.95 |
| `CreateAnotherButton` | TouchableOpacity | default, pressed | Outline style, returns to Input |

### Copy Link Flow

1. User taps "Copy Link"
2. Haptic: light impact
3. Link copied to clipboard
4. Button text: "Copied!" (success color) for 2,000ms
5. Button text reverts to "Copy Link"
6. Toast: "Link copied to clipboard" at bottom, auto-dismisses 2s

### Native Share Sheet

When user taps "More":

```
┌──────────────────────────────┐
│  [system share sheet]        │
│  ─────────────────────────── │
│  Copy Link                   │
│  Message...                  │
│  ─────────────────────────── │
│  [App 1] [App 2] [App 3] ... │
│  ─────────────────────────── │
│  AirDrop                     │
│  ─────────────────────────── │
│  Cancel                      │
└──────────────────────────────┘
```

---

## 9. Tab Bar Navigation

### Layout

```
┌──────────────────────────────┐
│  [Home]  [Explore]  [Create]  [Profile] │
│  [icon]  [icon]    [icon]   [icon]     │
└──────────────────────────────┘
```

### Tab Items

| Tab | Icon (inactive) | Icon (active) | Label | Badge |
|-----|-----------------|---------------|-------|-------|
| Home | 🏠 | 🏠 (filled) | 首页 | — |
| Explore | 🔍 | 🔍 (filled) | 发现 | — |
| Create | ✚ | ✚ (filled) | 创作 | — |
| Profile | 👤 | 👤 (filled) | 我的 | Optional |

### Tab Bar Specification

- Height: 49px + bottom safe area (`env(safe-area-inset-bottom)`)
- Background: `--bg-primary` with top border `--border-default`
- Tab item width: 25% of screen width each (4 tabs)
- Icon size: 24x24px
- Label font: `caption` style (11px, 500 weight)
- Active state: icon and label in `--accent-primary`
- Inactive state: icon and label in `--text-muted`
- Create tab: center position, larger icon (28x28px), circular accent background when active
- Badge on Profile: small dot (6px circle) in `--error` color if new notifications

### Tab Bar Transitions

- Tab switch: instant (no animation) — fast navigation is priority
- Active tab: underline indicator slides from previous to new (300ms ease-in-out)
- Haptic: selection impact on every tab switch

### Back Behavior

| Context | Behavior |
|---------|----------|
| From Result to Home | Stack pop, fade transition 250ms |
| From Share to Result | Stack pop, no special animation |
| From Processing to Input | Confirm dialog: "Cancel generation?" Yes/No |
| Hardware back (Android) | Same as above, respects dialogs |
| Swipe back (iOS) | Native gesture, 300ms transition |

### Modal / Bottom Sheet

Used for: Settings, Filter panels, Share platform sheet.

```
┌──────────────────────────────┐
│  ┌──────────────────────────┐ │  <- Drag handle: 36x4px, radius-full
│  │  ━━━━━━━                  │ │     Centered, --border-active color
│  └──────────────────────────┘ │
│                              │
│  [Sheet Title]         [✕]  │  <- h2, close button
│                              │
│  [Sheet Content]             │  <- Scrollable
│                              │
└──────────────────────────────┘
     ↖ Draggable from handle
```

- Background: `--bg-secondary`
- Top radius: `--radius-xl` (24px)
- Backdrop: `--bg-overlay`, tap to dismiss
- Drag: pan gesture on handle, snap to 0.25, 0.5, 0.75, 1.0 of screen height
- Dismiss: swipe down past 0.5 threshold, or tap backdrop

---

## 10. Input Validation Specifications

### Text Input Validation

| Rule | Constraint | Error Message | Trigger |
|------|------------|---------------|---------|
| Minimum length | >= 5 characters | "请至少输入5个字符" | On submit or live after 3 chars typed |
| Maximum length | <= 500 characters | "内容不能超过500字" | On reaching 500 chars, prevent further input |
| Not empty | Non-whitespace | "请输入你的创意想法" | On submit with empty field |
| Trimmed | Leading/trailing whitespace stripped | — | On submit |

### Character Counter States

| Count | Color | Counter Text |
|-------|-------|--------------|
| 0-449 | `--text-muted` | `{count}/500` |
| 450-499 | `--warning` | `{count}/500` |
| 500 | `--error` | `500/500` (stops incrementing) |

### Email Validation

| Rule | Constraint | Error Message | Trigger |
|------|------------|---------------|---------|
| Format | RFC 5322 compliant | "邮箱格式不正确" | On blur or submit |
| Not required | Optional field | N/A | Never blocks submission |
| Trimmed | Leading/trailing whitespace stripped | — | On submit |

### Voice Input Validation

| Rule | Constraint | Error Message | Behavior |
|------|------------|---------------|---------|
| Minimum duration | >= 1 second | "录音太短了" | Toast on too-short recording |
| Maximum duration | <= 120 seconds | Auto-stop at 120s | Haptic + visual feedback |
| No audio permission | Permission denied | "请允许麦克风权限" | Show permission prompt |
| Empty | No recording made | — | Cannot submit without recording |

### Camera Input Validation

| Rule | Constraint | Error Message | Behavior |
|------|------------|---------------|---------|
| Image too small | < 256px on any edge | "图片尺寸太小" | Toast + retake prompt |
| Image too dark | Luminance < threshold | "图片太暗，请改善光线" | Show hint overlay |
| Image too blurry | Sharpness < threshold | "图片模糊，请保持稳定" | Show hint overlay |
| No camera permission | Permission denied | "请允许相机权限" | Show permission prompt |
| Storage full | Cannot save | "存储空间不足" | Alert + settings link |

### Validation UX

- Inline error messages appear below the relevant input
- Error state: input border turns `--error`, 2px solid
- Error text: body-sm, `--error` color
- Error appearance: fade-in + translateY (8px → 0), 200ms
- Error clearance: auto-clears when user starts typing / recording
- Focus while error: border becomes `--border-accent` (accent color), overriding error

---

## 11. Interaction Specifications

### Button Tap Flow (Primary CTA)

```
User taps CTA
    │
    ├──► Haptic: medium impact
    ├──► Visual: scale 0.97 for 100ms, then back to 1.0
    ├──► State: disabled (prevent double-tap)
    └──► Action: navigate / submit

Success path:
    └──► Navigate to next screen (300ms fade transition)

Failure path:
    └──► Re-enable button, show error state
```

### Swipe Gestures

| Gesture | Direction | Context | Behavior |
|---------|-----------|---------|----------|
| Swipe back | Right (iOS) | All screens except Home | Native back navigation |
| Swipe down | Down on modal handle | Bottom sheets | Dismiss sheet |
| Swipe on card | Horizontal | Feed cards | Reveal quick actions (Delete, Share) |
| Long press | On image | Result screen | Enter selection mode (multi-select) |

### Pull-to-Refresh

- Pull distance threshold: 80px
- Visual feedback: spinner appears at threshold
- Haptic: medium impact when threshold reached
- Spinner: `--accent-primary` color
- Animation: native iOS RefreshControl
- On release: fetch completes → smooth scroll back to top

### Haptic Feedback Map

| Event | Haptic Type | Priority |
|-------|-------------|----------|
| Tab switch | Selection impact (light) | Low |
| Button tap (primary CTA) | Impact (medium) | Medium |
| Button tap (secondary) | Impact (light) | Low |
| Pull-to-refresh threshold | Impact (medium) | Medium |
| Save to camera roll | Impact (medium) | Medium |
| Toggle favorite | Impact (light) | Low |
| Error toast | Notification error | High |
| Success toast | Notification success | Medium |
| Voice recording start | Impact (heavy) | High |
| Voice recording stop | Impact (light) | Low |
| Cancel confirmation | Notification warning | High |
| Image loaded | None | — |

---

## 12. Error State System

### Error State Types

#### 1. Validation Error

```
┌──────────────────────────────┐
│  [Input field]                │
│  ▌                           │  <- border: 2px solid --error
│                              │
│  请至少输入5个字符            │  <- body-sm, --error
└──────────────────────────────┘
```

- Appears inline below the input
- Red border on the input field
- Auto-dismisses when user starts correcting
- Does not block other UI

#### 2. Network Error

```
┌──────────────────────────────┐
│                              │
│         [⚠️ icon]            │  <- 48px, --error
│                              │
│    网络连接失败               │  <- h3
│    请检查网络后重试            │  <- body-sm, text-secondary
│                              │
│    [重新尝试]                 │  <- Primary CTA, outline style
│                              │
└──────────────────────────────┘
```

- Full-screen centered layout
- Icon: warning triangle, `--error` color
- Haptic: notification error on appear
- Retry button: calls the failed API again
- Background: `--bg-primary`

#### 3. AI Generation Failure

```
┌──────────────────────────────┐
│  [←] 生成结果                 │
│──────────────────────────────│
│                              │
│         [⚠️ icon]            │  <- 64px, --error
│                              │
│    生成失败                   │  <- h2
│                              │
│    抱歉，AI 生成过程中         │  <- body-sm, text-secondary, centered
│    遇到了问题。               │
│    请稍后重试。                │
│                              │
│    [重新生成]                 │  <- Primary CTA, gradient
│    [返回修改想法]             │  <- Secondary CTA, text only
│                              │
└──────────────────────────────┘
```

- Two CTAs: retry with same prompt, or go back to Input
- Error category label (caption): "AI_TIMEOUT | AI_SERVICE_ERROR | QUALITY_CHECK_FAILED"
- Logs error to analytics with category

#### 4. Empty Result

```
┌──────────────────────────────┐
│  [←] 生成结果                 │
│──────────────────────────────│
│                              │
│         [❓ icon]            │  <- 64px, --text-muted
│                              │
│    没有生成结果               │  <- h3
│                              │
│    AI 未能根据你的描述         │
│    生成合适的图像              │
│                              │
│    [换个描述试试]             │  <- Primary CTA
│                              │
└──────────────────────────────┘
```

#### 5. Toast Notifications

Position: Bottom of screen, above tab bar and safe area.

```
┌──────────────────────────────┐
│                              │
│                              │
│  ┌────────────────────────┐  │
│  │  [icon]  Message text  │  │  <- max-width: 90% of screen
│  └────────────────────────┘  │  <- bottom: tab_bar_height + 16px
└──────────────────────────────┘
```

| Type | Icon | Background | Duration |
|------|------|------------|----------|
| Success | ✓ (green) | `rgba(34, 197, 94, 0.15)` | 2,000ms |
| Error | ✕ (red) | `rgba(239, 68, 68, 0.15)` | 4,000ms |
| Warning | ⚠ (amber) | `rgba(245, 158, 11, 0.15)` | 3,000ms |
| Info | ⓘ (blue) | `rgba(59, 130, 246, 0.15)` | 2,500ms |

- Toast animation: slide up from below tab bar, 250ms ease-out
- Dismiss: auto-dismiss after duration, or swipe down
- Stacking: max 1 toast at a time (new toast replaces previous)

---

## 13. Animation Specifications

### Core Timing Constants

| Token | Value | Usage |
|-------|-------|-------|
| `DURATION_INSTANT` | 100ms | Micro-interactions (button press) |
| `DURATION_FAST` | 200ms | State changes, error appearances |
| `DURATION_NORMAL` | 300ms | Screen transitions, fades |
| `DURATION_SLOW` | 400ms | Complex animations (logo reveal) |
| `DURATION_PULSE` | 2000ms | Loading pulse cycle |
| `EASE_DEFAULT` | `cubic-bezier(0.4, 0, 0.2, 1)` | Most transitions |
| `EASE_IN` | `cubic-bezier(0.4, 0, 1, 1)` | Elements entering |
| `EASE_OUT` | `cubic-bezier(0, 0, 0.2, 1)` | Elements leaving |
| `EASE_SPRING` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Bouncy effects |

### Screen Transitions

| Transition | Type | Duration | Easing |
|------------|------|----------|--------|
| Splash → Home | Fade out + Fade in | 300ms | ease-out |
| Home → Idea Input | Slide from right | 300ms | ease-in-out |
| Idea Input → Processing | Fade + scale down | 250ms | ease-in |
| Processing → Result | Fade + scale up | 300ms | ease-out |
| Result → Share | Slide from right | 300ms | ease-in-out |
| Any → Error | Fade in | 250ms | ease-out |
| Back navigation | Slide from left | 300ms | ease-in-out |

### Pulsing Loading Animation (Processing Screen)

```
Ring 1 (outer):
  Scale: 1.0 → 1.4
  Opacity: 0.6 → 0
  Duration: 2s
  Repeat: infinite
  Delay between repeats: 0s

Ring 2 (middle):
  Scale: 1.0 → 1.4
  Opacity: 0.4 → 0
  Duration: 2s
  Repeat: infinite
  Delay: 0.3s

Ring 3 (inner):
  Scale: 1.0 → 1.4
  Opacity: 0.2 → 0
  Duration: 2s
  Repeat: infinite
  Delay: 0.6s
```

### Fade + Scale Reveal (Result Image)

```
On image load complete:
  Image opacity: 0 → 1
  Image scale: 0.95 → 1.0
  Duration: 400ms
  Easing: ease-out
  Stagger (multi-image): 150ms between each image
```

### Skeleton Shimmer

```
Gradient: linear-gradient(
  90deg,
  --bg-tertiary 0%,
  --border-active 50%,
  --bg-tertiary 100%
)
Width: 200% of container
Animation: translateX(-50%) → translateX(50%)
Duration: 1.5s
Repeat: infinite
Easing: linear
```

### Button Press

```
On press down:
  Scale: 1.0 → 0.97
  Duration: 100ms
  Easing: ease-out

On press release:
  Scale: 0.97 → 1.0
  Duration: 150ms
  Easing: ease-spring
```

### Toast Slide-Up

```
Enter:
  translateY: 60px → 0
  opacity: 0 → 1
  Duration: 250ms
  Easing: ease-out

Exit:
  translateY: 0 → 60px
  opacity: 1 → 0
  Duration: 200ms
  Easing: ease-in
```

### Waveform Animation (Voice Input)

```
Each bar (12 total):
  Height: oscillates between 10px and 60px
  Duration: 600ms per cycle
  Easing: ease-in-out
  Phase offset: each bar offset by 50ms from previous
  Color: --accent-primary
  Width: 4px per bar
  Gap: 3px between bars
```

---

## 14. Component Library Summary

### Atoms (Smallest)

| Component | Props | States |
|-----------|-------|--------|
| `Text` | variant, color, align | default |
| `Button` | variant, size, disabled, loading | default, pressed, disabled, loading |
| `IconButton` | icon, size, color | default, pressed, disabled |
| `Input` | type, placeholder, error, value | default, focused, error, disabled |
| `Chip` | label, selected | unselected, selected |
| `Badge` | count, variant | default, max (99+) |
| `Divider` | direction | horizontal, vertical |
| `Avatar` | src, size | loading, loaded, error |
| `Toast` | message, type, duration | visible, dismissing |
| `Haptic` | type | (trigger only) |

### Molecules

| Component | Composition | States |
|-----------|-------------|--------|
| `ActionButton` | IconButton + Label | default, pressed, disabled, loading |
| `FeedCard` | Thumbnail + Title + Meta + ActionOverlay | default, pressed, loading |
| `FormatChip` | Chip + icon | unselected, selected |
| `CharCounter` | Text | valid, warning, limit |
| `ValidationError` | Icon + Text | visible, hidden |
| `ProcessingRing` | Logo + 3 animated RingViews | animating |
| `Waveform` | 12 BarViews + animation controller | idle, recording, playing |
| `CameraPreview` | CameraView + GridOverlay + FocusIndicator | preview, captured |
| `ProgressBar` | Track + Fill | determinate, indeterminate |
| `TabIndicator` | Animated View | (slides between tabs) |

### Organisms

| Component | Composition | States |
|-----------|-------------|--------|
| `TabBar` | TabItem x4 + TabIndicator | per-tab active |
| `InputHeader` | BackButton + Title + ModeToggles | default |
| `ImageGrid` | ResultImage x4 + ImageOverlay x4 | default, selection-mode |
| `ActionBar` | ActionButton x4 | default |
| `PlatformGrid` | PlatformButton x5 | default |
| `BottomSheet` | Handle + TitleBar + Content | collapsed, expanded, dismissing |
| `ProcessingScreen` | ProcessingRing + StepIndicator + ETAText + PromptEcho + CancelButton | per-step, cancelling |
| `ShareSheet` | SharePreview + ShareLink + CopyButton + PlatformGrid | default, copied |
| `HomeFeed` | PullToRefresh + FeedCard[] + EmptyState | loading, loaded, empty, error |

### Screens (Pages)

| Screen | Top-level Composition |
|--------|----------------------|
| `SplashScreen` | SplashLogo + SplashTitle + SplashTagline + TerminalCursor |
| `HomeScreen` | HomeHeader + HomeFeed + HomeCTA + TabBar |
| `IdeaInputScreen` | InputHeader + TextInput/voice/camera + FormatSelector + EmailInput + SubmitButton + TabBar |
| `ProcessingScreen` | ProcessingRing + ProgressBar + StepIndicator + ETAText + CancelButton + PromptEcho + disabled TabBar |
| `ResultScreen` | ResultImage/ImageGrid + ActionBar + RefineButton + ContinueButton + TabBar |
| `ShareScreen` | SharePreview + ShareLink + CopyLinkButton + PlatformGrid + CreateAnotherButton + TabBar |

---

## Implementation Notes for Dev Team

### Framework

- **React Native** with Expo (SDK 50+)
- **React Navigation v6** for routing
- **Reanimated v3** for performant animations
- **React Native Gesture Handler** for swipe and pan gestures
- **Expo Haptics** for haptic feedback
- **react-native-vision-camera** for camera functionality
- **AsyncStorage** for local idea history persistence

### State Management

- **Zustand** for global app state (currentUser, sessionHistory, theme)
- **React Query / SWR** for API data fetching with caching
- Local component state for UI-only state (input focus, animation frames)

### API Integration Points

| Screen | API Endpoint | Method |
|--------|-------------|--------|
| Idea Input (submit) | `/api/ideas` | POST |
| Processing (poll) | `/api/ideas/:id/status` | GET |
| Result (fetch) | `/api/ideas/:id` | GET |
| Share (link) | `/api/ideas/:id/share` | GET |
| Feed (history) | `/api/ideas` | GET |

See `docs/ai-integration.md` for full API documentation.

### Performance Targets

| Metric | Target |
|--------|--------|
| Splash → Home transition | < 2,000ms total |
| Image generation latency | < 30s (95th percentile) |
| Screen transition FPS | 60fps, no jank |
| Feed scroll FPS | 60fps, no jank |
| Cold start (app launch) | < 3,000ms to interactive |
| Memory (idle) | < 150MB |
| Memory (processing) | < 300MB |

### Accessibility

- All interactive elements: `accessibilityLabel` + `accessibilityHint`
- Minimum touch target: 44x44px
- Color contrast: WCAG AA minimum (4.5:1 for body text)
- Screen reader: all screens navigable via VoiceOver/TalkBack
- Reduce motion: respect `AccessibilityInfo.isReduceMotionEnabled()`, disable pulse animations

---

*Document Version: 1.0 — Content Sprint 1, Task 2.2*
*Author: Mobile Engineer*
*Related: `docs/user-stories.md`, `docs/ai-integration.md`*
