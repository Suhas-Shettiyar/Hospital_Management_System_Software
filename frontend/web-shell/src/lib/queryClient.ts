import { QueryClient } from "@tanstack/react-query";

// Server state is managed by TanStack Query (not global state libraries).
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});
