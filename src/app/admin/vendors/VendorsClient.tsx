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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveVendor,
  toggleVendor,
  deleteVendor,
  type VendorInput,
} from "@/lib/actions/admin";
import { useMediaQuery, useTheme } from "@mui/material";

type Row = {
  id: number;
  email: string;
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  orderCount: number;
  balance: number;
};

const EMPTY: VendorInput = {
  email: "",
  password: "",
  businessName: "",
  contactPerson: "",
  phone: "",
  address: "",
  active: true,
};

export default function VendorsClient({ vendors }: { vendors: Row[] }) {
  const router = useRouter();
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up("md"));
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<VendorInput | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("ALL");
  const [sort, setSort] = useState("name");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = vendors.filter(
      (v) =>
        (active === "ALL" || (active === "ACTIVE" ? v.active : !v.active)) &&
        (q === "" ||
          v.businessName.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          (v.phone ?? "").includes(q)),
    );
    rows.sort((a, b) => {
      if (sort === "orders") return b.orderCount - a.orderCount;
      if (sort === "balance") return b.balance - a.balance;
      return a.businessName.localeCompare(b.businessName);
    });
    return rows;
  }, [vendors, query, active, sort]);

  function doDelete(v: Row) {
    const msg =
      v.orderCount > 0
        ? `Delete "${v.businessName}"? Their ${v.orderCount} order(s) and invoices will be permanently deleted.`
        : `Delete "${v.businessName}"?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteVendor(v.id, true);
      if (res.ok) {
        setToast({ msg: "Retailer deleted.", severity: "success" });
      } else {
        setToast({ msg: "Delete failed.", severity: "error" });
      }
      router.refresh();
    });
  }

  function submit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveVendor(editing);
      if (res.ok) {
        setEditing(null);
        setToast({ msg: "Retailer saved.", severity: "success" });
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
          Retailers
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({ ...EMPTY })}>
          Add retailer
        </Button>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        Create an account here and hand the credentials to the retailer — vendors
        can&apos;t sign themselves up.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Search retailers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 160 }}
        />
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={active} onChange={(e) => setActive(e.target.value)}>
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="DISABLED">Disabled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sort</InputLabel>
          <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <MenuItem value="name">Name A–Z</MenuItem>
            <MenuItem value="orders">Most orders</MenuItem>
            <MenuItem value="balance">Highest dues</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Mobile: cards */}
      {!isDesktop && (
        <Box sx={{ mt: 2 }}>
          {visible.map((v) => (
            <Card
              key={v.id}
              variant="outlined"
              sx={{ borderRadius: 1.5, mb: 1, p: 1.5 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {v.businessName}
                    </Typography>
                    <Chip
                      size="small"
                      label={v.active ? "Active" : "Disabled"}
                      color={v.active ? "success" : "default"}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleVendor(v.id, !v.active);
                          router.refresh();
                        })
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {v.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {v.contactPerson ?? "—"} · {v.phone ?? "no phone"} · {v.orderCount} orders
                    {v.balance > 0.004 && ` · owes ₹${v.balance.toLocaleString("en-IN")}`}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  aria-label={`Edit ${v.businessName}`}
                  onClick={() =>
                    setEditing({
                      id: v.id,
                      email: v.email,
                      businessName: v.businessName,
                      contactPerson: v.contactPerson ?? "",
                      phone: v.phone ?? "",
                      address: v.address ?? "",
                      active: v.active,
                      password: "",
                    })
                  }
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Delete ${v.businessName}`}
                  onClick={() => doDelete(v)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Desktop: table */}
      {isDesktop && (
      <Card variant="outlined" sx={{ borderRadius: 1.5, mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                  <TableCell>Business</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Orders</TableCell>
                  <TableCell align="right">Owes</TableCell>
                  <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{v.businessName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {v.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {v.contactPerson ?? "—"}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {v.phone ?? "no phone"}
                    </Typography>
                  </TableCell>
                  <TableCell>{v.orderCount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: v.balance > 0.004 ? 700 : 400 }}>
                    {v.balance > 0.004 ? `₹${v.balance.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={v.active ? "Active" : "Disabled"}
                      color={v.active ? "success" : "default"}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleVendor(v.id, !v.active);
                          router.refresh();
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Edit ${v.businessName}`}
                      onClick={() =>
                        setEditing({
                          id: v.id,
                          email: v.email,
                          businessName: v.businessName,
                          contactPerson: v.contactPerson ?? "",
                          phone: v.phone ?? "",
                          address: v.address ?? "",
                          active: v.active,
                          password: "",
                        })
                      }
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${v.businessName}`}
                      onClick={() => doDelete(v)}
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
        <DialogTitle>{editing?.id ? "Edit retailer" : "Add retailer"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Business name"
            value={editing?.businessName ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, businessName: e.target.value } : p))}
            required
          />
          <TextField
            label="Email (login)"
            type="email"
            value={editing?.email ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, email: e.target.value } : p))}
            required
          />
          <TextField
            label={editing?.id ? "New password (leave blank to keep)" : "Password"}
            type="password"
            value={editing?.password ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, password: e.target.value } : p))}
            required={!editing?.id}
          />
          <TextField
            label="Contact person"
            value={editing?.contactPerson ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, contactPerson: e.target.value } : p))}
          />
          <TextField
            label="Phone"
            type="tel"
            value={editing?.phone ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, phone: e.target.value } : p))}
          />
          <TextField
            label="Delivery address"
            multiline
            rows={2}
            value={editing?.address ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, address: e.target.value } : p))}
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
