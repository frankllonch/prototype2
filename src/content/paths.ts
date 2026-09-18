/**
 * Base path.
 *
 * The site is authored at the root (`/works/`, `/media/…`). GitHub Pages serves a
 * project site from `/<repo>/`, so every emitted URL needs that prefix while the
 * on-disk layout stays unchanged. Set `BASE_PATH` at build time:
 *
 *   BASE_PATH=/claudiavalsells npm run build
 *
 * Unset — the normal case, and how it will run on Claudia's own domain — this is
 * a no-op.
 */
const RAW = process.env.BASE_PATH ?? '';
export const BASE = RAW.replace(/\/+$/, '');

/** Prefixes a root-relative URL with the base path. Leaves other URLs alone. */
export const withBase = (url: string): string => (url.startsWith('/') ? `${BASE}${url}` : url);
