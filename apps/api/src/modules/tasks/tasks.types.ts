export type TaskSortField = "createdAt" | "updatedAt" | "name";
export type TaskSortOrder = "asc" | "desc";

export type TaskFilters = {
  done?: boolean;
};
