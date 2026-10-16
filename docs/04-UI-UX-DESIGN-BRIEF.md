# DOCUMENT 4: UI/UX DESIGN BRIEF

## 4.1 Design Vibe
Clean, trustworthy and calm. Modern SaaS website look for non-technical owners: generous white space, clear hierarchy, no decorative noise. Mobile-first, with large-screen demo mode.

## 4.2 Color Palette (Exact Hex Codes)
| Role | Light mode | Dark mode |
|---|---|---|
| Background | `#F8FAFC` | `#0B1220` |
| Surface / card | `#FFFFFF` | `#111827` |
| Elevated surface | `#FFFFFF` | `#1F2937` |
| Border | `#E2E8F0` | `#243041` |
| Text | `#0F172A` | `#F1F5F9` |
| Muted text | `#64748B` | `#94A3B8` |
| Primary (teal) | `#0F766E` (hover `#115E59`) | `#14B8A6` (hover `#2DD4BF`) |
| Success | `#16A34A` | `#22C55E` |
| Warning | `#D97706` (tint `#FEF3C7`) | `#F59E0B` |
| Danger | `#DC2626` (tint `#FEE2E2`) | `#EF4444` |
| Info | `#2563EB` | `#3B82F6` |

## 4.3 Typography
- Font: Inter throughout (Fallback: system-ui, sans-serif).
- H1: 28/36 semibold.
- H2: 20/28 semibold.
- Body: 14/22 regular.
- Small text: 12/18.
- Large numbers on summary cards: 32px bold with tabular figures.

## 4.4 Component Rules
- **Cards**: 12px radius, 1px border, very soft shadow in light mode; borders instead of shadows in dark mode.
- **Buttons**: primary, secondary, ghost, danger; 40px height desktop, 44px minimum touch target on mobile.
- **Badges**: In Stock (green), Low (amber), Out (red), Undone (grey), each with dot or icon so color is never the only signal.
- **Tables**: tabular numbers right-aligned, low rows tinted amber, out-of-stock rows tinted red, hover state on rows.
- **Chat bubbles**: incoming, bot reply and voice note (waveform plus transcript); neutral style, no WhatsApp logo or branding.
- **Also required**: input, search, select, filter chip, toast, modal, tabs, skeleton, empty state, connection indicator.

## 4.5 Layout Rules
- 8px spacing grid; card padding 20px; gap 16px between cards; 24px between sections; side margins 16px on mobile.
- **Desktop**: collapsible left sidebar, 12-column grid, max content width 1280px.
- **Mobile**: sticky top bar with Live indicator, bottom tab bar, tables become expandable cards, summary cards in horizontal snap row, Live Chat Preview at top of Dashboard.

## 4.6 Icons, Images and Motion
- Icons: Lucide, outline style, 20px, 1.5px stroke. No emojis in the interface.
- No stock photos or heavy gradients; illustrations are simple line drawings.
- Motion under 250ms with ease-out: new rows slide in and flash softly for 1.5s, quantities count up or down, low-stock badge pulses once. Respect `prefers-reduced-motion`.

## 4.7 States and Accessibility
- Loading skeleton, empty, no results, error (backend offline), new-data highlight.
- WCAG AA contrast, visible focus rings, status never by color alone, 44px touch targets.
- Formats: Currency as `Rs.` with Indian grouping (`Rs. 1,24,500`); dates as `DD MMM`; time in 12-hour IST.

