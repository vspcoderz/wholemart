import { Box, Card, Skeleton } from "@mui/material";

export default function OrdersLoading() {
  return (
    <Box>
      <Skeleton variant="text" width={160} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" sx={{ mb: 2 }} />
      {[0, 1, 2, 3].map((i) => (
        <Card
          key={i}
          variant="outlined"
          sx={{ borderRadius: 1.5, mb: 1, p: 2 }}
        >
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="25%" />
        </Card>
      ))}
    </Box>
  );
}
