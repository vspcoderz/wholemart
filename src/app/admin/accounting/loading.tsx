import { Box, Skeleton } from "@mui/material";

export default function AdminLoading() {
  return (
    <Box>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={84}
            sx={{ flexGrow: 1, borderRadius: 1.5 }}
          />
        ))}
      </Box>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={64}
          sx={{ mb: 1, borderRadius: 1.5 }}
        />
      ))}
    </Box>
  );
}
