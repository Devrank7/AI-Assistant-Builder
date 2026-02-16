# theme.json Reference

This file documents the complete schema for `theme.json` — the color/layout configuration that `generate-single-theme.js` uses to produce all 6 widget source files.

**Location**: `.agent/widget-builder/clients/<clientId>/theme.json`

---

## Required Fields

The generator validates these fields and **will exit with an error** if any are missing:

```
domain, font, isDark,
widgetW, widgetH, widgetMaxW, widgetMaxH,
toggleSize, toggleRadius,
headerPad, nameSize,
avatarHeaderRound, chatAvatarRound,
headerFrom, headerVia, headerTo,
toggleFrom, toggleVia, toggleTo,
toggleShadow, toggleHoverRgb,
sendFrom, sendHoverFrom,
onlineDotBg, onlineDotBorder,
typingDot,
userMsgFrom, userMsgTo, userMsgShadow,
avatarFrom, avatarTo, avatarBorder, avatarIcon,
linkColor, linkHover, copyHover, copyActive,
chipBorder, chipFrom, chipTo,
chipText, chipHoverFrom, chipHoverTo, chipHoverBorder,
focusBorder, focusRing,
imgActiveBorder, imgActiveBg, imgActiveText,
imgHoverText, imgHoverBorder, imgHoverBg,
cssPrimary, cssAccent, focusRgb,
feedbackActive, feedbackHover
```

### Dark Theme Extra Fields (required when `isDark: true`)

```
surfaceBg, surfaceCard, surfaceBorder,
surfaceInput, surfaceInputFocus,
textPrimary, textSecondary, textMuted
```

### Optional Fields

| Field          | Default      | Description                          |
| -------------- | ------------ | ------------------------------------ |
| `label`        | `<id> theme` | Human-readable theme description     |
| `fontUrl`      | `null`       | Google Fonts URL (loads in `<head>`) |
| `hasShine`     | `true`       | Radial gradient shine on header      |
| `headerAccent` | `""`         | Extra CSS classes for header         |

---

## Full JSON Schema

```json
{
  "label": "<Brand> — <Color> Theme",
  "domain": "<domain without https://>",
  "fontUrl": "<Google Fonts URL or null>",
  "font": "<CSS font-family string>",
  "isDark": false,

  "widgetW": "360px",
  "widgetH": "520px",
  "widgetMaxW": "360px",
  "widgetMaxH": "520px",
  "toggleSize": "w-14 h-14",
  "toggleRadius": "rounded-2xl",
  "headerPad": "px-5 py-4",
  "nameSize": "text-[14px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-xl",
  "chatAvatarRound": "rounded-xl",
  "hasShine": true,

  "headerFrom": "#PRIMARY",
  "headerVia": "#PRIMARY_LIGHTER",
  "headerTo": "#ACCENT",
  "toggleFrom": "#PRIMARY",
  "toggleVia": "#PRIMARY_LIGHTER",
  "toggleTo": "#ACCENT",
  "toggleShadow": "#PRIMARY",
  "toggleHoverRgb": "R, G, B",
  "sendFrom": "#PRIMARY",
  "sendTo": "#ACCENT",
  "sendHoverFrom": "#PRIMARY_DARKER",
  "sendHoverTo": "#ACCENT_DARKER",
  "onlineDotBg": "#PRIMARY_LIGHT",
  "onlineDotBorder": "#PRIMARY",
  "typingDot": "#PRIMARY_MEDIUM",

  "userMsgFrom": "#PRIMARY",
  "userMsgTo": "#ACCENT",
  "userMsgShadow": "#PRIMARY",

  "avatarFrom": "#PRIMARY_VERY_LIGHT",
  "avatarTo": "#PRIMARY_LIGHT",
  "avatarBorder": "#PRIMARY_LIGHT_MEDIUM",
  "avatarIcon": "#PRIMARY",

  "linkColor": "#PRIMARY",
  "linkHover": "#PRIMARY_DARKER",
  "copyHover": "#PRIMARY",
  "copyActive": "#PRIMARY",

  "chipBorder": "#PRIMARY_LIGHT_MEDIUM",
  "chipFrom": "#PRIMARY_VERY_LIGHT",
  "chipTo": "#PRIMARY_LIGHT",
  "chipText": "#PRIMARY_DARKER",
  "chipHoverFrom": "#PRIMARY_LIGHT",
  "chipHoverTo": "#PRIMARY_LIGHT_MEDIUM",
  "chipHoverBorder": "#PRIMARY_MEDIUM",

  "focusBorder": "#PRIMARY_MEDIUM",
  "focusRing": "#PRIMARY_VERY_LIGHT",

  "imgActiveBorder": "#PRIMARY_MEDIUM",
  "imgActiveBg": "#PRIMARY_VERY_LIGHT",
  "imgActiveText": "#PRIMARY",
  "imgHoverText": "#PRIMARY",
  "imgHoverBorder": "#PRIMARY_MEDIUM",
  "imgHoverBg": "#PRIMARY_VERY_LIGHT",

  "cssPrimary": "#PRIMARY",
  "cssAccent": "#ACCENT",
  "focusRgb": "R, G, B",

  "feedbackActive": "#PRIMARY",
  "feedbackHover": "#PRIMARY_MEDIUM"
}
```

---

## Color Derivation Guide

Given a primary color (e.g., `#6f4495`), derive shades:

| Token                  | How to derive             | Example (`#6f4495` primary) |
| ---------------------- | ------------------------- | --------------------------- |
| `PRIMARY`              | Site's main brand color   | `#6f4495`                   |
| `PRIMARY_DARKER`       | Darken by ~15-20%         | `#5c3a7d`                   |
| `PRIMARY_LIGHTER`      | Lighten by ~10%           | `#7c52a8`                   |
| `PRIMARY_MEDIUM`       | Mix with white ~40%       | `#8b6aad`                   |
| `PRIMARY_LIGHT`        | Mix with white ~70%       | `#b99fd4`                   |
| `PRIMARY_LIGHT_MEDIUM` | Mix with white ~60%       | `#d4bfe6`                   |
| `PRIMARY_VERY_LIGHT`   | Mix with white ~90%       | `#ede5f5`                   |
| `ACCENT`               | Secondary color from site | `#1a80dd`                   |
| `ACCENT_DARKER`        | Darken accent by ~15%     | `#1568b5`                   |
| `toggleHoverRgb`       | Primary as R,G,B          | `111, 68, 149`              |
| `focusRgb`             | Same as toggleHoverRgb    | `111, 68, 149`              |

---

## Layout Presets

Match the widget layout to the site's visual feel:

| Site Feel    | widgetW | widgetH | toggleSize          | toggleRadius     | headerPad     | nameSize        | hasShine |
| ------------ | ------- | ------- | ------------------- | ---------------- | ------------- | --------------- | -------- |
| **Compact**  | `350px` | `500px` | `w-[50px] h-[50px]` | `rounded-xl`     | `px-5 py-3.5` | `text-[13.5px]` | `false`  |
| **Standard** | `360px` | `520px` | `w-14 h-14`         | `rounded-2xl`    | `px-5 py-4`   | `text-[14px]`   | `true`   |
| **Premium**  | `370px` | `540px` | `w-[58px] h-[58px]` | `rounded-2xl`    | `px-6 py-5`   | `text-[15px]`   | `true`   |
| **Rounded**  | `360px` | `520px` | `w-14 h-14`         | `rounded-full`   | `px-5 py-4`   | `text-[14px]`   | `true`   |
| **Angular**  | `355px` | `515px` | `w-[54px] h-[54px]` | `rounded-[10px]` | `px-5 py-4`   | `text-[14px]`   | `false`  |

Avatar roundness to match:

- Compact/Angular: `avatarHeaderRound: "rounded-lg"`, `chatAvatarRound: "rounded-lg"`
- Standard/Rounded: `avatarHeaderRound: "rounded-xl"`, `chatAvatarRound: "rounded-xl"`
- Premium: `avatarHeaderRound: "rounded-2xl"`, `chatAvatarRound: "rounded-xl"`

---

## Dark Theme Surface Colors

When `isDark: true`, include these 8 fields. Adjust tints to complement the primary brand color:

```json
{
  "surfaceBg": "#0b1018",
  "surfaceCard": "#111927",
  "surfaceBorder": "#1e2d3d",
  "surfaceInput": "#0f1720",
  "surfaceInputFocus": "#162232",
  "textPrimary": "#e2e8f0",
  "textSecondary": "#64748b",
  "textMuted": "#475569"
}
```

For a blue-themed dark site, use bluish surfaces. For green, use greenish dark surfaces.

---

## Complete Examples

### Light theme (green dental clinic)

```json
{
  "label": "Dental Clinic — Forest Green Theme",
  "domain": "dentalclinic.com",
  "fontUrl": null,
  "font": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "isDark": false,
  "widgetW": "350px",
  "widgetH": "500px",
  "widgetMaxW": "350px",
  "widgetMaxH": "500px",
  "toggleSize": "w-[50px] h-[50px]",
  "toggleRadius": "rounded-xl",
  "headerPad": "px-5 py-3.5",
  "nameSize": "text-[13.5px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-lg",
  "chatAvatarRound": "rounded-lg",
  "hasShine": false,
  "headerFrom": "#2d8659",
  "headerVia": "#339963",
  "headerTo": "#3a9e6b",
  "toggleFrom": "#2d8659",
  "toggleVia": "#339963",
  "toggleTo": "#3a9e6b",
  "toggleShadow": "#2d8659",
  "toggleHoverRgb": "45, 134, 89",
  "sendFrom": "#2d8659",
  "sendTo": "#339963",
  "sendHoverFrom": "#246e49",
  "sendHoverTo": "#2d8659",
  "onlineDotBg": "#8cc9a6",
  "onlineDotBorder": "#2d8659",
  "typingDot": "#4aad78",
  "userMsgFrom": "#2d8659",
  "userMsgTo": "#339963",
  "userMsgShadow": "#2d8659",
  "avatarFrom": "#d4eede",
  "avatarTo": "#c5e7d3",
  "avatarBorder": "#a3d4b8",
  "avatarIcon": "#2d8659",
  "linkColor": "#2d8659",
  "linkHover": "#246e49",
  "copyHover": "#2d8659",
  "copyActive": "#2d8659",
  "chipBorder": "#a3d4b8",
  "chipFrom": "#edf7f1",
  "chipTo": "#d4eede",
  "chipText": "#246e49",
  "chipHoverFrom": "#d4eede",
  "chipHoverTo": "#c5e7d3",
  "chipHoverBorder": "#8cc9a6",
  "focusBorder": "#4aad78",
  "focusRing": "#d4eede",
  "imgActiveBorder": "#8cc9a6",
  "imgActiveBg": "#edf7f1",
  "imgActiveText": "#2d8659",
  "imgHoverText": "#2d8659",
  "imgHoverBorder": "#8cc9a6",
  "imgHoverBg": "#edf7f1",
  "cssPrimary": "#2d8659",
  "cssAccent": "#339963",
  "focusRgb": "45, 134, 89",
  "feedbackActive": "#2d8659",
  "feedbackHover": "#4aad78"
}
```

### Dark theme (cyan & blue auto service)

```json
{
  "label": "Auto Service — Dark Cyan & Blue Theme",
  "domain": "autoservice.com",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  "font": "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  "isDark": true,
  "widgetW": "360px",
  "widgetH": "520px",
  "widgetMaxW": "360px",
  "widgetMaxH": "520px",
  "toggleSize": "w-14 h-14",
  "toggleRadius": "rounded-full",
  "headerPad": "px-5 py-4",
  "nameSize": "text-[14px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-xl",
  "chatAvatarRound": "rounded-lg",
  "hasShine": true,
  "headerFrom": "#00a1c9",
  "headerVia": "#2e8eb8",
  "headerTo": "#5879c5",
  "toggleFrom": "#00a1c9",
  "toggleVia": "#2e8eb8",
  "toggleTo": "#5879c5",
  "toggleShadow": "#00a1c9",
  "toggleHoverRgb": "0, 161, 201",
  "sendFrom": "#00a1c9",
  "sendTo": "#5879c5",
  "sendHoverFrom": "#0088ac",
  "sendHoverTo": "#4a68b0",
  "onlineDotBg": "#7dd4ec",
  "onlineDotBorder": "#00a1c9",
  "typingDot": "#00a1c9",
  "userMsgFrom": "#00a1c9",
  "userMsgTo": "#5879c5",
  "userMsgShadow": "#00a1c9",
  "avatarFrom": "#162536",
  "avatarTo": "#1a2d42",
  "avatarBorder": "#2a4060",
  "avatarIcon": "#00a1c9",
  "linkColor": "#5cc8e4",
  "linkHover": "#7dd4ec",
  "copyHover": "#00a1c9",
  "copyActive": "#00a1c9",
  "chipBorder": "#1e3348",
  "chipFrom": "#0d1a26",
  "chipTo": "#111f2e",
  "chipText": "#5cc8e4",
  "chipHoverFrom": "#142638",
  "chipHoverTo": "#1a2d42",
  "chipHoverBorder": "#00a1c9",
  "focusBorder": "#00a1c9",
  "focusRing": "#162536",
  "imgActiveBorder": "#00a1c9",
  "imgActiveBg": "#0d1a26",
  "imgActiveText": "#00a1c9",
  "imgHoverText": "#00a1c9",
  "imgHoverBorder": "#2a4060",
  "imgHoverBg": "#0d1a26",
  "cssPrimary": "#00a1c9",
  "cssAccent": "#5879c5",
  "focusRgb": "0, 161, 201",
  "feedbackActive": "#00a1c9",
  "feedbackHover": "#5cc8e4",
  "surfaceBg": "#0b1018",
  "surfaceCard": "#111927",
  "surfaceBorder": "#1e2d3d",
  "surfaceInput": "#0f1720",
  "surfaceInputFocus": "#162232",
  "textPrimary": "#e2e8f0",
  "textSecondary": "#64748b",
  "textMuted": "#475569"
}
```
