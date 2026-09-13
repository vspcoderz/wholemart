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
  ReceiptLong,
  Inventory2,
  Storefront,
  Summarize,
  Settings,
  AgricultureRounded,
  Logout,
} from "@mui/icons-material";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { label: "Home", href: "/admin", icon: Dashboard },
  { label: "Orders", href: "/admin/orders", icon: ReceiptLong },
  { label: "Manifest", href: "/admin/manifest", icon: Summarize },
  { label: "Products", href: "/admin/products", icon: Inventory2 },
  { label: "Retailers", href: "/admin/vendors", icon: Storefront },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

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
      <ListItemButton
        sx={{ borderRadius: 2, mx: 1 }}
        onClick={() => router.push("/vendor")}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <Storefront />
        </ListItemIcon>
        <ListItemText primary="Vendor view" />
      </ListItemButton>
      <ListItemButton
        sx={{ borderRadius: 2, mx: 1 }}
        onClick={() => signOut({ redirectTo: "/login" })}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <Logout />
        </ListItemIcon>
        <ListItemText primary="Sign out" />
      </ListItemButton>
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
            <Typography sx={{ fontWeight: 700 }}>GreenGrocer</Typography>
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

  // Mobile: content + fixed bottom navigation
  return (
    <Box sx={{ minHeight: "100dvh", pb: 9 }}>
      <Box component="main" sx={{ p: 1.5 }}>
        {children}
      </Box>
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
          value={NAV.find((n) => isActive(pathname, n.href))?.href ?? "/admin"}
          onChange={(_, v: string) => router.push(v)}
          showLabels
        >
          {NAV.map((n) => (
            <BottomNavigationAction
              key={n.href}
              label={n.label}
              value={n.href}
              icon={<n.icon />}
              sx={{ minHeight: 56, minWidth: 0 }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
