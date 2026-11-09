// Citizen query hooks. Reuses the Phase 2C.1 async loader and table-state
// implementation so Citizen stays consistent with Admin, Manager and Coach
// without duplicating logic.
export { useAdminQuery, useTableState } from "../../hooks/admin/useAdminQuery";
