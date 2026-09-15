"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Alert,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Edit, Delete, Visibility, VisibilityOff } from "@mui/icons-material";
import { useState, useTransition } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/navigation";
import type { Category, Unit } from "@/db/schema";
import { CATEGORIES, CATEGORY_LABELS, UNITS, UNIT_LABELS, inr } from "@/lib/format";
import {
  saveProduct,
  toggleProduct,
  deleteProduct,
  type ProductInput,
} from "@/lib/actions/admin";

type Row = {
  id: number;
  name: string;
  nameMr: string | null;
  emoji: string | null;
  category: Category;
  unit: Unit;
  pricePerUnit: number;
  active: boolean;
  description: string | null;
};

const EMPTY: ProductInput = {
  name: "",
  nameMr: "",
  emoji: "",
  category: "LOCAL_VEG",
  unit: "KG",
  pricePerUnit: 0,
  active: true,
};

export default function ProductsClient({ products }: { products: Row[] }) {
  const router = useRouter();
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up("md"));
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function submit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveProduct(editing);
      if (res.ok) {
        setEditing(null);
        setToast({ msg: "Product saved.", severity: "success" });
        router.refresh();
      } else {
        setToast({ msg: res.error ?? "Save failed.", severity: "error" });
      }
    });
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEditing({ ...EMPTY })}
        >
          Add product
        </Button>
      </Box>

      {/* Mobile: cards */}
      {!isDesktop && (
        <Box>
          {products.map((p) => (
            <Card
              key={p.id}
              variant="outlined"
              sx={{ borderRadius: 1.5, mb: 1, p: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {p.emoji ?? "🥬"}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {p.nameMr ? `${p.nameMr} · ${p.name}` : p.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {CATEGORY_LABELS[p.category]} · {inr(p.pricePerUnit)}/{UNIT_LABELS[p.unit]}
                </Typography>
              </Box>
              <IconButton
                size="small"
                aria-label={`Edit ${p.name}`}
                onClick={() =>
                  setEditing({
                    id: p.id,
                    name: p.name,
                    nameMr: p.nameMr ?? "",
                    emoji: p.emoji ?? "",
                    category: p.category,
                    unit: p.unit,
                    pricePerUnit: p.pricePerUnit,
                    description: p.description ?? "",
                    active: p.active,
                  })
                }
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Toggle ${p.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await toggleProduct(p.id, !p.active);
                    router.refresh();
                  })
                }
              >
                {p.active ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
              </IconButton>
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${p.name}`}
                onClick={() => {
                  if (!confirm(`Delete "${p.name}"? Past orders keep their records.`)) return;
                  startTransition(async () => {
                    const res = await deleteProduct(p.id);
                    if (!res.ok) {
                      setToast({ msg: res.error ?? "Delete failed.", severity: "error" });
                    } else {
                      setToast({ msg: "Product deleted.", severity: "success" });
                    }
                    router.refresh();
                  });
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Card>
          ))}
        </Box>
      )}

      {/* Desktop: table */}
      {isDesktop && (
      <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {p.emoji} {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.nameMr ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[p.category]}</TableCell>
                  <TableCell>{UNIT_LABELS[p.unit]}</TableCell>
                  <TableCell align="right">{inr(p.pricePerUnit)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.active ? "Active" : "Hidden"}
                      color={p.active ? "success" : "default"}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleProduct(p.id, !p.active);
                          router.refresh();
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Edit ${p.name}`}
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          name: p.name,
                          nameMr: p.nameMr ?? "",
                          emoji: p.emoji ?? "",
                          category: p.category,
                          unit: p.unit,
                          pricePerUnit: p.pricePerUnit,
                          description: p.description ?? "",
                          active: p.active,
                        })
                      }
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => {
                        if (!confirm(`Delete "${p.name}"? Past orders keep their records.`)) return;
                        startTransition(async () => {
                          const res = await deleteProduct(p.id);
                          if (!res.ok) {
                            setToast({ msg: res.error ?? "Delete failed.", severity: "error" });
                          } else {
                            setToast({ msg: "Product deleted.", severity: "success" });
                          }
                          router.refresh();
                        });
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? "Edit product" : "Add product"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Name (English)"
            value={editing?.name ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
            required
          />
          <TextField
            label="नाव (Marathi name)"
            value={editing?.nameMr ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, nameMr: e.target.value } : p))}
          />
          <TextField
            label="Emoji icon"
            placeholder="🥬"
            value={editing?.emoji ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, emoji: e.target.value } : p))}
          />
          <TextField
            select
            label="Category"
            value={editing?.category ?? "LOCAL_VEG"}
            onChange={(e) =>
              setEditing((p) => (p ? { ...p, category: e.target.value as Category } : p))
            }
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Unit"
            value={editing?.unit ?? "KG"}
            onChange={(e) => setEditing((p) => (p ? { ...p, unit: e.target.value as Unit } : p))}
          >
            {UNITS.map((u) => (
              <MenuItem key={u} value={u}>
                {UNIT_LABELS[u]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Price per unit (₹)"
            type="number"
            slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
            value={editing?.pricePerUnit ?? 0}
            onChange={(e) =>
              setEditing((p) =>
                p ? { ...p, pricePerUnit: Number(e.target.value) } : p,
              )
            }
          />
          <TextField
            label="Description (optional)"
            value={editing?.description ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, description: e.target.value } : p))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editing?.active ?? true}
                onChange={(e) => setEditing((p) => (p ? { ...p, active: e.target.checked } : p))}
              />
            }
            label="Visible to vendors"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast !== null} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
