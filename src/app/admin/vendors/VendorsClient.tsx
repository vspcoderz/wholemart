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
  IconButton,
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
import { Add, Edit } from "@mui/icons-material";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVendor, toggleVendor, type VendorInput } from "@/lib/actions/admin";

type Row = {
  id: number;
  email: string;
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  orderCount: number;
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
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<VendorInput | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

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

      <Card variant="outlined" sx={{ borderRadius: 1.5, mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Business</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Orders</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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
