"use client";

import { Button } from "@mui/material";
import { Print } from "@mui/icons-material";

export default function PrintButton() {
  return (
    <Button
      variant="outlined"
      startIcon={<Print />}
      onClick={() => window.print()}
    >
      Print
    </Button>
  );
}
