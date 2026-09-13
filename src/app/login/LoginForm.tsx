"use client";

import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
} from "@mui/material";
import { Email, Lock, AgricultureRounded } from "@mui/icons-material";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./action";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <Card
      elevation={0}
      sx={(t) => ({
        width: "100%",
        maxWidth: 400,
        p: { xs: 3, sm: 4 },
        border: `1px solid ${t.palette.divider}`,
        borderRadius: 2,
      })}
    >
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <AgricultureRounded
          sx={(t) => ({ fontSize: 44, color: t.palette.primary.main })}
        />
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          GreenGrocer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wholesale ordering for retailers, hotels &amp; vendors
        </Typography>
      </Box>

      {state?.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      <Box component="form" action={formAction} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          fullWidth
          required
          autoComplete="email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Email fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          fullWidth
          required
          autoComplete="current-password"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Lock fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 3 }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </Box>
    </Card>
  );
}
