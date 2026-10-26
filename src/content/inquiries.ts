/**
 * Where the order form sends, and what it sends with.
 *
 * The site is static — GitHub Pages serves files and nothing else — so the one
 * thing a page cannot do by itself is send mail. The form posts to a small
 * handler deployed separately (`server/inquiries/`), which is where every check
 * that matters actually happens: a page can be edited by whoever is looking at
 * it, so nothing the browser decides is a defence.
 *
 * Both values here are public by design and neither is a secret. The endpoint is
 * a URL anyone can see in the markup, and a Turnstile *site* key is meant to be
 * published; the matching secret key, the mail provider's key and Claudia's own
 * address live only in the handler's environment, which is also why her address
 * is nowhere in this repository.
 *
 *   INQUIRIES_ENDPOINT=https://… TURNSTILE_SITE_KEY=… npm run build
 *
 * Unset, the form still renders and still refuses to send, saying so plainly
 * rather than appearing to work. The build prints a warning in that case, so a
 * site deployed without it is noticed at the point it is made rather than by the
 * first person who tries to order.
 */
export const ENDPOINT = (process.env.INQUIRIES_ENDPOINT ?? '').trim();

/**
 * Turnstile is optional, and the layer of last resort.
 *
 * The honeypot, the time trap and the handler's own rate limit stop the traffic
 * that sends a form without ever rendering it, which is nearly all of it. This
 * stops the rest. Left unset, nothing third-party is loaded and the page carries
 * no script it did not write — which is the site's usual arrangement, and worth
 * keeping until the spam says otherwise.
 */
export const TURNSTILE_SITE_KEY = (process.env.TURNSTILE_SITE_KEY ?? '').trim();
