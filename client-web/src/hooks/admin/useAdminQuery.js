import { useEffect, useMemo, useState } from "react";
import { paginate, sortRows } from "../../utils/admin/adminUtils";
import { DEMO_STORE_RESET_EVENT } from "../../data/demoStore";

// Small async loader used by the Admin screens. `deps` controls refetching;
// the loader itself is intentionally excluded because callers pass an inline
// closure over those same deps.
export function useAdminQuery(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleReset = () => setReloadKey((key) => key + 1);
    window.addEventListener(DEMO_STORE_RESET_EVENT, handleReset);
    return () => window.removeEventListener(DEMO_STORE_RESET_EVENT, handleReset);
  }, []);

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey((key) => key + 1),
  };
}

// Sorting + pagination shared by the grievance, transaction and grant tables.
export function useTableState(
  rows,
  { pageSize: initialPageSize = 10, sortKey = null, sortDir = "asc" } = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(
    sortKey ? { key: sortKey, dir: sortDir } : null
  );

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => paginate(sorted, safePage, pageSize),
    [sorted, safePage, pageSize]
  );

  function toggleSort(key) {
    setSort((current) =>
      current && current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  }

  return {
    page: safePage,
    pageSize,
    total: sorted.length,
    pageRows,
    pageCount,
    sort,
    toggleSort,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
