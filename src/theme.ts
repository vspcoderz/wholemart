"use client";

import { createTheme } from "@mui/material/styles";

// Eye-strain friendly palette: no pure whites/blacks, muted accents.
// Apple-HIG-informed: system font stack, >=44px touch targets, clear hierarchy.
const shared = {
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: "none" as const, fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 8 },
        sizeSmall: { minHeight: 36 },
      },
    },
    MuiTextField: { defaultProps: { size: "small" as const } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: { main: "#166534" }, // deep produce green
    secondary: { main: "#9a3412" },
    background: { default: "#edefec", paper: "#f7f8f6" },
    divider: "#d9dcd7",
    text: { primary: "#2a2d2a", secondary: "#5c615c" },
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: { main: "#4ade80" },
    secondary: { main: "#fbbf24" },
    background: { default: "#111312", paper: "#1a1d1b" },
    divider: "#2c302d",
    text: { primary: "#d5d8d4", secondary: "#8b918b" },
  },
});
