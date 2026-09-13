import { Box } from "@mui/material";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </Box>
  );
}
