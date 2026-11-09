// Manager feature service layer. Phase 2C.2 is frontend-first, so every method
// resolves against the centralized manager demo dataset after a short delay to
// exercise loading states. The method signatures mirror the proposed API
// contracts in docs/PHASE_2C_2_MANAGER_FRONTEND_IMPLEMENTATION_REPORT.md so a
// future backend can replace the mocks without rewriting the UI.
import { managerService } from "../../services/manager/managerService";

// Re-exported for Manager components so the Manager layer stays self-contained
// while sharing the tested async loader and table-state implementation from
// Phase 2C.1.
export { useAdminQuery, useTableState } from "../../hooks/admin/useAdminQuery";

export { managerService };
