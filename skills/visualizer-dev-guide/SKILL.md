---
name: visualizer-dev-guide
description: "Development guide and documentation for the Topping Surround Controller visualizer and UI. Use this skill when the user mentions the monitoring controller project, asks about the visualizer implementation, or needs to understand the current codebase architecture."
---

# Visualizer & UI Development Guide

This document records the development process, architecture, and UI/UX design decisions for the Topping Surround Controller project, specifically focusing on the Visualizer and Input Monitoring components.

---

## Project Overview

### Goal
Build a professional surround sound controller interface including:
- 3D Speaker Position Visualizer
- Channel Configuration Editor (SourceConfigEditor)
- Meter Bridge
- Loudness Monitoring Toolbar

### Tech Stack
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS (JIT Mode)
- **Build Tool**: Vite 6
- **Icons**: Lucide React

---

## Core Component Architecture

### 1. Visualizer.tsx
**Path**: `components/Visualizer.tsx`
**Responsibility**: Renders 3D speaker layout, handles Solo/Mute interactions.

```typescript
Props:
├── speakers: Speaker[]         // List of speakers (id, x, y, z, label)
├── interactionMode: 'SOLO' | 'MUTE'  // Interaction mode
├── speakerOverrides: Record<string, {...}>  // External style overrides
├── highlightedId: string | null  // Currently highlighted speaker ID
├── onSpeakerClick: (id, mode) => void  // Click callback
└── variant: 'default' | 'editor'  // Variant mode
```

### 2. SourceConfigEditor.tsx
**Path**: `components/SourceConfigEditor.tsx`
**Responsibility**: Channel configuration editor, containing the left channel list and the right Visualizer pane.

### 3. App.tsx
**Path**: `App.tsx`
**Responsibility**: Main application entry, containing the loudness monitoring toolbar and meter bridge.

---

## Key Features & Fixes

### Phase 1: State Decoupling

#### Issue
Clicking "Solo" on a speaker in the Visualizer would unintentionally change the selected channel in the left editor.

#### Solution
1. **Separate Internal Selection**: Visualizer maintains its own `individualSelection` state.
2. **Refactor `isHighlighted`**: Directly use `highlightedId` prop instead of relying on mutually exclusive state logic.

```typescript
// Before (Exclusive)
const isHighlighted = state === 'highlighted';

// After (Hybrid support)
const isHighlighted = spk.id === highlightedId;
```

#### Result
- Solo operations no longer affect Editor selection.
- Supports "Solo + Edit" hybrid state visualization.

---

### Phase 2: Text Brightness Optimization

#### Issue
Visualizer speaker labels were too dim in non-highlighted states (`text-zinc-400`).

#### Solution
1. **Default State**: `text-white/90` + `drop-shadow`.
2. **Font Size**: Increased from `text-[10px]` to `text-[11px]`.

```typescript
// After Fix
${(isActive || isHighlighted) 
  ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
  : 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] group-hover:text-white'}
```

---

### Phase 3: Color Picker Refactor

#### Issue
1. Popup was positioned incorrectly, overlapping the header.
2. Button glow effect clipped through the popup (z-index/stacking context issue).

#### Solution
1. **Fixed Positioning**: Moved popup to `fixed` position (`left: 28px, top: 80px`), detaching it from the button's stacking context.
2. **Backdrop**: Added full-screen transparent backdrop for click-outside-to-close.
3. **Shadow Isolation**: Disabled button shadow when picker is open.

```tsx
{/* Color Picker Modal */}
{showColorPicker && (
  <>
    <div className="fixed inset-0 z-[9998]" onClick={() => setShowColorPicker(false)} />
    <div className="fixed left-[28px] top-[80px] z-[9999] ...">
       {/* Content */}
    </div>
  </>
)}
```

---

### Phase 4: Click-to-Deselect

#### Requirement
Clicking an already selected channel in the list should deselect it.

#### Implementation
```typescript
onClick={() => setSelectedChannelId(prev => prev === ch.speaker ? null : ch.speaker)}
```

---

### Phase 5: Input Monitoring Toolbar Optimization

#### Design Principles (from UI/UX Pro Max)
- **Contrast**: High contrast for text (4.5:1 ratio).
- **Touch Targets**: Minimized 44px (or comfortable 28px+ for desktop dense UIs).
- **Hierarchy**: Clear grouping with backgrounds and dividers.
- **Feedback**: Hover states and active glow effects.

#### Changes
- **Height**: Increased to `h-10`.
- **Background**: Gradient `from-zinc-900/95` instead of flat black.
- **Metrics**: Each metric (S-TERM, INT, etc.) has a dedicated background/border container for a "Pro Audio LED" look.
- **Typography**: Clearer fonts and better spacing.

---

## Styling System

### Speaker Group Color Maps

```typescript
const COLOR_MAPS = {
  rose: {    // Front (L, C, R)
    text: 'text-rose-100 font-bold',
    border: 'border-rose-600/80',
    bg: 'bg-rose-950/50'
  },
  purple: {  // Sub (LFE)
    text: 'text-purple-100 font-bold',
    border: 'border-purple-600/80',
    bg: 'bg-purple-950/50'
  },
  sky: {     // Heights
    text: 'text-sky-100 font-bold',
    border: 'border-sky-600/80',
    bg: 'bg-sky-950/50'
  },
  emerald: { // Surrounds
    text: 'text-emerald-100 font-bold',
    border: 'border-emerald-600/80',
    bg: 'bg-emerald-950/50'
  }
};
```

### Tailwind JIT Best Practices

**Review**: Do not construct dynamic class names like `bg-${color}-500` as JIT cannot detect them.

**Solution**: Use explicit maps.

```typescript
const BG_MAP = {
  rose: 'bg-rose-500',
  purple: 'bg-purple-500',
  // ...
};
className={BG_MAP[baseColor]}
```

---

## Development & Troubleshooting

### Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview -- --host --port 4300`

### Common Issues
- **Styles not applying**: Check if using dynamic classes (whitelist them or use maps). Check port number if multiple previews are running.
- **Z-Index Clipping**: Use `fixed` positioning or React Portals for modals/popups to escape stacking contexts.
- **TypeScript Errors**: `Object.values(obj)` may return `unknown[]`. Cast with `(v: any)` if strictly necessary or define proper types.

---

## Phase 6: Bottom Control Deck Redesign (Hardware Chassis Aesthetic)

### Goal
Redesign the bottom control deck to achieve a unified, professional audio hardware aesthetic with:
- Staggered, high-density layout within a single rectangular frame
- Clear visual hierarchy between monitoring and control modules
- Hardware-grade tactile feedback for interactive elements

### New Components

#### 1. HardwareUI.tsx (New File)
**Path**: `components/HardwareUI.tsx`
**Responsibility**: Provides shadcn/ui-style base components for hardware aesthetics.

```typescript
// Core Components:
├── ChassisCard      // Main container with rim light and deep shadow
├── InsetPanel       // Recessed panel with inset shadow for depth
└── EngravedHeader   // Laser-engraved style header with LED accent
```

**ChassisCard** - The unified hardware chassis base:
```tsx
<ChassisCard className="...">
  {/* Creates a floating hardware device look with:
    - zinc-950 background
    - Subtle rim light (before:border-white/[0.05])
    - Deep outer shadow
  */}
</ChassisCard>
```

**InsetPanel** - Recessed display window:
```tsx
<InsetPanel className="...">
  {/* Creates sunken panel effect with:
    - inset shadow (shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)])
    - Inner border for depth
  */}
</InsetPanel>
```

**EngravedHeader** - Hardware-style module title:
```tsx
<EngravedHeader 
  label="INPUT MONITORING" 
  color="amber"  // amber | cyan | zinc
  decoration={true}  // LED accent bar
/>
```

#### 2. cn() Utility
**Path**: `lib/utils.ts`
**Dependencies**: `clsx`, `tailwind-merge`

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Layout Architecture

#### L-Shape + Control Tower Pattern
```
┌─────────────────────────────────────────────────┐
│ ChassisCard (Unified Chassis)                   │
│ ┌───────────────────────────┬─────────────────┐ │
│ │ Left Wing (col-span-8)    │ Right Wing (4)  │ │
│ │ ┌───────────────────────┐ │ ┌─SYNC 48K LED─┐│ │
│ │ │ HUD Header            │ │ │              ││ │
│ │ │ [Standard] [Metrics]  │ │ │ InsetPanel   ││ │
│ │ └───────────────────────┘ │ │ ┌──────────┐ ││ │
│ │ ┌───────────────────────┐ │ │ │ Knob     │ ││ │
│ │ │ InsetPanel            │ │ │ └──────────┘ ││ │
│ │ │ > EngravedHeader      │ │ │ [DIM][MUTE]  ││ │
│ │ │ > 16-Ch Meters + LUFS │ │ └──────────────┘│ │
│ │ └───────────────────────┘ │                 │ │
│ └───────────────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Animation System

#### Breathing Glow Effect
Used for DIM/MUTE buttons and knob area when active:

```tsx
// Slow breathing (4s cycle)
<div 
  className="absolute -inset-1 bg-yellow-400/50 blur-md rounded -z-10"
  style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
/>
```

#### Toggle Transition Effects
Smooth state transitions for buttons:

```tsx
<button
  className={cn(
    "transition-all duration-300 active:scale-[0.95]",
    isActive
      ? "bg-yellow-500 scale-[1.02]"  // Slight pop on activate
      : "bg-[#121214]"
  )}
>
  {/* Glow layer with fade transition */}
  <div className={cn(
    "transition-all duration-500",
    isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
  )} />
</button>
```

### Channel Data Structure Update

```typescript
// CHANNELS_16 now includes label property
const CHANNELS_16 = [
  { id: 'L', label: 'L', color: 'bg-[#fb7185]' },
  { id: 'R', label: 'R', color: 'bg-[#fb7185]' },
  { id: 'C', label: 'C', color: 'bg-[#fb7185]' },
  { id: 'LFE', label: 'LFE', color: 'bg-[#c084fc]' },
  // ... etc
];
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--chassis-bg` | `zinc-950` | Main hardware base |
| `--inset-bg` | `#0c0c0e` | Recessed panels |
| `--rim-light` | `white/[0.05]` | Edge highlights |
| `--glow-dim` | `yellow-500/50` | DIM button glow |
| `--glow-mute` | `red-500/50` | MUTE button glow |
| `--glow-cyan` | `cyan-500/10` | Normal knob glow |

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `clsx` | ^2.x | Conditional class composition |
| `tailwind-merge` | ^2.x | Smart Tailwind class merging |

Install command:
```bash
npm install clsx tailwind-merge
```

---
