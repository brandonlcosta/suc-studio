# SUC Studio Theme Colors

All theme colors are defined as CSS variables in `public/styles.css` for easy customization.

## How to Change Colors

Edit the `:root` section in `public/styles.css` (lines 1-32).

## Current Dark Blue Theme

### Backgrounds
```css
--bg-primary: #0a0e1a;      /* Main app background - darkest blue */
--bg-secondary: #0d1117;    /* Headers, sidebars - dark blue-gray */
--bg-tertiary: #151b2d;     /* Alternative background */
```

### Overlays (Cards, Panels)
```css
--overlay-dark: #1a2332;    /* Cards, main panels - medium blue-gray */
--overlay-medium: #1e2939;  /* Secondary panels, tier headers */
--overlay-light: #242e42;   /* Hover states, active items */
```

### Borders
```css
--border-dark: #1f2937;     /* Subtle borders */
--border-medium: #2a3a4a;   /* Standard borders - blue-tinted */
--border-light: #374151;    /* Lighter borders */
```

### Text
```css
--text-primary: #f5f5f5;    /* Main text - white */
--text-secondary: #9ca3af;  /* Secondary text - gray */
--text-tertiary: #6b7280;   /* Tertiary text, metadata - darker gray */
```

### Inputs
```css
--input-bg: #0f1421;        /* Input backgrounds - very dark blue */
--input-border: #2a3a4a;    /* Input borders */
--input-focus: #3b4a5f;     /* Input focus state */
```

### Buttons
```css
--button-bg: #1a2332;       /* Button background */
--button-border: #2a3a4a;   /* Button border */
--button-hover-bg: #242e42; /* Button hover background */
--button-hover-border: #3b4a5f; /* Button hover border */
```

### Accents
```css
--accent-blue: #3b82f6;     /* Primary actions */
--accent-green: #10b981;    /* Success, selected states */
--accent-red: #ef4444;      /* Errors, validation */
--accent-yellow: #f59e0b;   /* Warnings */
```

## Quick Color Scheme Examples

### Darker Blue
```css
--bg-primary: #050a14;
--bg-secondary: #0a0f1a;
--overlay-dark: #111827;
```

### Purple Tint
```css
--bg-primary: #0d0a1a;
--bg-secondary: #110d1f;
--overlay-dark: #1a1532;
--border-medium: #2a2450;
```

### Teal Tint
```css
--bg-primary: #0a1419;
--bg-secondary: #0d1a1f;
--overlay-dark: #1a2d35;
--border-medium: #2a4450;
```

### Warmer Gray
```css
--bg-primary: #12100f;
--bg-secondary: #1a1816;
--overlay-dark: #252220;
--border-medium: #3a3632;
```

## Components Using CSS Variables

All components now use CSS variables:
- ✅ Global styles (styles.css)
- ✅ NavigationBar
- ✅ WorkoutBuilder (all subcomponents)
- ✅ DropZone
- ✅ RouteCard
- ✅ All builders (via CSS classes)

Just change the variables once and the entire app updates!
