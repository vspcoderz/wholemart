import { Box, Card, Skeleton } from "@mui/material";

export default function BillingLoading() {
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <Card
            key={i}
            variant="outlined"
            sx={{ borderRadius: 1.5, p: 2, flexGrow: 1 }}
          >
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Card>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Skeleton
          variant="rectangular"
          height={320}
          sx={{ borderRadius: 1.5, flex: 5 }}
        />
        <Skeleton
          variant="rectangular"
          height={320}
          sx={{ borderRadius: 1.5, flex: 7 }}
        />
      </Box>
    </Box>
  );
}
