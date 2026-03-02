/**
 * Composable that returns the preload API (window.releaseManager).
 * Use in components: const api = useApi();
 */
export function useApi() {
  return window.releaseManager ?? {};
}
