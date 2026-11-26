/** Where the order form sends, and what it sends with. */
export const ENDPOINT = (process.env.INQUIRIES_ENDPOINT ?? '').trim();

/** Turnstile is optional, and the layer of last resort. */
export const TURNSTILE_SITE_KEY = (process.env.TURNSTILE_SITE_KEY ?? '').trim();
