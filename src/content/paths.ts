/** Base path. */
const RAW = process.env.BASE_PATH ?? '';
export const BASE = RAW.replace(/\/+$/, '');

/** Prefixes a root-relative URL with the base path. Leaves other URLs alone. */
export const withBase = (url: string): string => (url.startsWith('/') ? `${BASE}${url}` : url);
