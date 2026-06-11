export const macroTheme = {
  background: "#000000",
  surface: "#0a0a0a",
  surfaceElevated: "#141414",
  border: "#1f1f1f",
  borderMuted: "#2a2a2a",
  accent: "#A6CE39",
  accentMuted: "#8ab32f",
  accentGlow: "rgba(166, 206, 57, 0.15)",
  text: "#f5f5f5",
  textMuted: "#a3a3a3",
  textDim: "#737373",
  danger: "#ef4444",
  warning: "#f59e0b",
} as const;

export const cssVars = `
  --macro-bg: ${macroTheme.background};
  --macro-surface: ${macroTheme.surface};
  --macro-surface-elevated: ${macroTheme.surfaceElevated};
  --macro-border: ${macroTheme.border};
  --macro-border-muted: ${macroTheme.borderMuted};
  --macro-accent: ${macroTheme.accent};
  --macro-accent-muted: ${macroTheme.accentMuted};
  --macro-accent-glow: ${macroTheme.accentGlow};
  --macro-text: ${macroTheme.text};
  --macro-text-muted: ${macroTheme.textMuted};
  --macro-text-dim: ${macroTheme.textDim};
  --macro-danger: ${macroTheme.danger};
  --macro-warning: ${macroTheme.warning};
`;
