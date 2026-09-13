"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Typography as T,
} from "@mui/material";
import { Add, Remove, Search, ShoppingCart } from "@mui/icons-material";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, Unit } from "@/db/schema";
import { CATEGORIES, UNIT_LABELS, UNIT_STEPS, inr } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { useLang, type StringKey } from "@/lib/i18n";
import { saveOrder } from "@/lib/actions/orders";

export type CatalogProduct = {
  id: number;
  name: string;
  nameMr: string | null;
  emoji: string | null;
  category: Category;
  unit: Unit;
  price: number;
  imageUrl: string | null;
};

const CAT_KEY: Record<Category, StringKey> = {
  LOCAL_VEG: "catLocal",
  ENGLISH_VEG: "catEnglish",
  FRUITS: "catFruits",
};

const TILE_BG: Record<Category, string> = {
  LOCAL_VEG: "#e4efe2",
  ENGLISH_VEG: "#e2ecf4",
  FRUITS: "#f6ead9",
};

function stepFor(unit: Unit) {
  return UNIT_STEPS[unit] ?? 1;
}

function roundQty(unit: Unit, v: number) {
  return unit === "G" ? Math.round(v) : Math.round(v * 100) / 100;
}

export default function CatalogClient({
  catalog,
  windowOpen,
}: {
  catalog: CatalogProduct[];
  windowOpen: boolean;
}) {
  const router = useRouter();
  const { items, setQty } = useCart();
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"ALL" | Category>("ALL");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const qtyOf = (id: number) => items.find((i) => i.productId === id)?.quantity ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(
      (p) =>
        (tab === "ALL" || p.category === tab) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.nameMr ?? "").includes(search.trim())),
    );
  }, [catalog, tab, search]);

  const totalItems = items.reduce((n, i) => n + (i.quantity > 0 ? 1 : 0), 0);

  function change(p: CatalogProduct, next: number) {
    setQty(p.id, next <= 0 ? 0 : roundQty(p.unit, next));
  }

  // Tap anywhere on the card = quick add (+1 step)
  function quickAdd(p: CatalogProduct) {
    if (!windowOpen) return;
    const q = qtyOf(p.id);
    change(p, q === 0 ? Math.max(stepFor(p.unit), 1) : q + stepFor(p.unit));
  }

  function placeOrUpdate() {
    startTransition(async () => {
      const res = await saveOrder(items.filter((i) => i.quantity > 0));
      if (res.ok) {
        setToast({ msg: t("orderSaved"), severity: "success" });
        router.refresh();
      } else {
        setToast({ msg: res.error, severity: "error" });
      }
    });
  }

  const displayName = (p: CatalogProduct) =>
    lang === "mr" && p.nameMr ? p.nameMr : p.name;

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header: title + cart CTA */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("newOrder")}
        </Typography>
        <Button
          variant={totalItems > 0 ? "contained" : "outlined"}
          size="small"
          startIcon={<ShoppingCart />}
          onClick={() => router.push("/vendor/cart")}
        >
          {t("cart")}{totalItems > 0 ? ` (${totalItems})` : ""}
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder={t("search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            sx: { borderRadius: 1.5 },
          },
        }}
        sx={{ mb: 1 }}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 1.5, "& .MuiTab-root": { minHeight: 44 } }}
      >
        <Tab value="ALL" label={t("all")} />
        {CATEGORIES.map((c) => (
          <Tab key={c} value={c} label={t(CAT_KEY[c])} />
        ))}
      </Tabs>

      {filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", mt: 2, borderRadius: 1.5 }}>
          <Typography color="text.secondary">{t("noProducts")}</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          {filtered.map((p) => {
            const q = qtyOf(p.id);
            const selected = q > 0;
            return (
              <Card
                key={p.id}
                variant="outlined"
                onClick={() => quickAdd(p)}
                sx={{
                  borderRadius: 1.5,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  cursor: windowOpen ? "pointer" : "default",
                  userSelect: "none",
                  ...(selected
                    ? { borderColor: "primary.main", borderWidth: 2 }
                    : {}),
                  "&:active": windowOpen ? { transform: "scale(0.98)" } : {},
                  transition: "transform 80ms",
                }}
              >
                {/* Emoji / image tile — distinct per product */}
                <Box
                  sx={{
                    height: 72,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: TILE_BG[p.category],
                    position: "relative",
                  }}
                >
                  {p.imageUrl ? (
                    <Box
                      component="img"
                      src={p.imageUrl}
                      alt={p.name}
                      sx={{ height: "100%", width: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Box component="span" sx={{ fontSize: 44, lineHeight: 1 }}>
                      {p.emoji ?? "🥬"}
                    </Box>
                  )}
                  {selected && (
                    <Chip
                      size="small"
                      color="primary"
                      label={`${q} ${UNIT_LABELS[p.unit]}`}
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        height: 22,
                        fontSize: 12,
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ p: 1, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}
                    noWrap
                  >
                    {displayName(p)}
                  </Typography>
                  {lang === "mr" && p.nameMr && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {p.name}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      mt: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {inr(p.price)}/{UNIT_LABELS[p.unit]}
                    </Typography>
                    {selected && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                        <IconButton
                          size="small"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => change(p, q - stepFor(p.unit))}
                          sx={{ minHeight: 30, minWidth: 30 }}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <T sx={{ minWidth: 22, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                          {q}
                        </T>
                        <IconButton
                          size="small"
                          aria-label={`Add ${p.name}`}
                          onClick={() => change(p, q + stepFor(p.unit))}
                          sx={{
                            minHeight: 30,
                            minWidth: 30,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            "&:hover": { bgcolor: "primary.dark" },
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Sticky review bar */}
      {windowOpen && totalItems > 0 && (
        <Paper
          sx={{
            position: "sticky",
            bottom: 68,
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 900,
          }}
          elevation={4}
        >
          <Typography sx={{ fontWeight: 600 }}>
            {totalItems} {t("itemsSelected")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => router.push("/vendor/cart")}>
              {t("reviewOrder")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={placeOrUpdate}>
              {pending ? t("saving") : t("saveOrder")}
            </Button>
          </Box>
        </Paper>
      )}

      {!windowOpen && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t("windowClosed")}
        </Alert>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast?.severity ?? "success"}
          onClose={() => setToast(null)}
          sx={{ width: "100%" }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
