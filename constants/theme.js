// ── Shared Neumorphic Theme (Dark) ──
// Import this in every screen: import { COLORS, SHADOWS } from './theme';

export const COLORS = {
    bg:          '#2c3240',   // main background
    surface:     '#323848',   // card / elevated surface
    surfaceDeep: '#262c38',   // inset / recessed surface
    shadowDark:  '#1e222c',   // dark shadow colour
    shadowLight: '#3a4258',   // light edge highlight
    text:        '#e4e7ed',   // primary text
    textMuted:   '#8a92a6',   // secondary text
    icon:        '#ffffff',   // all icons → white
    accent:      '#e8734a',   // warm accent (key actions)
    accentSoft:  'rgba(232, 115, 74, 0.12)',
    danger:      '#ff453a',   // destructive actions
    dangerSoft:  'rgba(255, 69, 58, 0.10)',
    divider:     'rgba(255, 255, 255, 0.04)',
    overlay:     'rgba(0, 0, 0, 0.6)',
};

// Reusable soft-shadow presets
export const SHADOWS = {
    card: {
        shadowColor: COLORS.shadowDark,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    button: {
        shadowColor: COLORS.shadowDark,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6,
    },
    small: {
        shadowColor: COLORS.shadowDark,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 3,
    },
};
