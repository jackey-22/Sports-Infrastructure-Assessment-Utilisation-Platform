import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
// Each resource keeps its last successful value and ignores stale responses.
export default function usePerformanceResource(fetcher) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const request = useRef(0),
    mounted = useRef(true);
  const reload = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const value = await fetcher();
      if (mounted.current && current === request.current) setData(value);
      return value;
    } catch (err) {
      if (mounted.current && current === request.current) setError(err.message || "Could not load performance data.");
      return null;
    } finally {
      if (mounted.current && current === request.current) setLoading(false);
    }
  }, [fetcher]);
  useEffect(() => {
    mounted.current = true;
    reload();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") reload();
    });
    const focus = () => reload();
    if (Platform.OS === "web") window.addEventListener("focus", focus);
    return () => {
      mounted.current = false;
      request.current++;
      subscription.remove();
      if (Platform.OS === "web") window.removeEventListener("focus", focus);
    };
  }, [reload]);
  return {
    data,
    loading,
    error,
    reload
  };
}
