"use client";

import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dashboard,
  History,
  Inventory2,
  AccountBalance,
  Settings,
  AgricultureRounded,
  Logout,
  PointOfSale,
  Print,
  MoreHoriz,
} from "@mui/icons-material";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/lib/brand";

const NAV = [
  { label: "Home", href: "/admin", icon: Dashboard },
  { label: "History", href: "/admin/orders", icon: History },
  { label: "Billing", href: "/admin/billing", icon: PointOfSale },
  { label: "Purchase", href: "/admin/purchase", icon: Inventory2 },
  { label: "Printing", href: "/admin/printing", icon: Print },
  { label: "Accounting", href: "/admin/accounting", icon: AccountBalance },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

// Bottom bar stays thumb-friendly: core tabs + a More sheet for the rest.
const MOBILE_TABS = NAV.slice(0, 4);
const MORE_TABS = NAV.slice(4);

const DRAWER_WIDTH = 240;

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (href: string) => {
    setMoreOpen(false);
    router.push(href);
  };

  const signOutItem = (
    <ListItemButton
      sx={{ borderRadius: 2, mx: 1 }}
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Logout />
      </ListItemIcon>
      <ListItemText primary="Sign out" />
    </ListItemButton>
  );

  const navList = (
    <List sx={{ pt: 1 }}>
      {NAV.map((n) => (
        <ListItemButton
          key={n.href}
          selected={isActive(pathname, n.href)}
          onClick={() => router.push(n.href)}
          sx={{ minHeight: 44, borderRadius: 2, mx: 1, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <n.icon />
          </ListItemIcon>
          <ListItemText primary={n.label} />
        </ListItemButton>
      ))}
      <Divider sx={{ my: 1, mx: 2 }} />
      {signOutItem}
    </List>
  );

  if (isDesktop) {
    return (
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          <Toolbar>
            <AgricultureRounded color="primary" sx={{ mr: 1 }} />
            <Typography sx={{ fontWeight: 700 }}>{APP_NAME}</Typography>
          </Toolbar>
          {navList}
        </Drawer>
        <Box
          component="main"
          sx={{ flexGrow: 1, width: `calc(100% - ${DRAWER_WIDTH}px)`, p: 3 }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  // Mobile: content + compact bottom navigation with a More sheet.
  const moreSelected = MORE_TABS.some((n) => isActive(pathname, n.href));
  return (
    <Box sx={{ minHeight: "100dvh", pb: 9 }}>
      <Box component="main" sx={{ p: 1.5 }}>
        {children}
      </Box>
      <Drawer
        anchor="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}
      >
        <List sx={{ py: 1 }}>
          {MORE_TABS.map((n) => (
            <ListItemButton
              key={n.href}
              selected={isActive(pathname, n.href)}
              onClick={() => go(n.href)}
              sx={{ minHeight: 48, borderRadius: 2, mx: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <n.icon />
              </ListItemIcon>
              <ListItemText primary={n.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1, mx: 2 }} />
          {signOutItem}
        </List>
      </Drawer>
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          pb: "env(safe-area-inset-bottom)",
          zIndex: 1000,
        }}
        elevation={3}
      >
        <BottomNavigation
          value={
            moreSelected
              ? "more"
              : (MOBILE_TABS.find((n) => isActive(pathname, n.href))?.href ??
                "/admin")
          }
          onChange={(_, v: string) => {
            if (v === "more") setMoreOpen(true);
            else router.push(v);
          }}
          showLabels
        >
          {MOBILE_TABS.map((n) => (
            <BottomNavigationAction
              key={n.href}
              label={n.label}
              value={n.href}
              icon={<n.icon />}
              sx={{ minHeight: 56, minWidth: 0 }}
            />
          ))}
          <BottomNavigationAction
            label="More"
            value="more"
            icon={<MoreHoriz />}
            sx={{ minHeight: 56, minWidth: 0 }}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
