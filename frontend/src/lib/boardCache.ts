import type { QueryClient } from "@tanstack/react-query";
import type { ColumnWithCards } from "./types";

export function updateBoardColumns(
  queryClient: QueryClient,
  queryKey: unknown[],
  fn: (cols: ColumnWithCards[]) => ColumnWithCards[]
) {
  queryClient.setQueryData<any>(queryKey, (old: any) =>
    old ? { ...old, columns: fn(old.columns) } : old
  );
}

export function getBoardColumns(
  queryClient: QueryClient,
  queryKey: unknown[]
): ColumnWithCards[] {
  const old = queryClient.getQueryData<any>(queryKey);
  return old?.columns ?? [];
}
