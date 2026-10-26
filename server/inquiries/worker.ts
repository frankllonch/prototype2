/**
 * The order desk.
 *
 * claudiavalsells.com is files on a static host, so the one thing the site
 * cannot do by itself is send mail. This is the whole of what it adds: a single
 * endpoint that takes one message from the Colour Chart's form, satisfies
 * itself that a person sent it, and hands it to a mail provider addressed to
 * Claudia.
 *
 * It is written on the assumption that the page in front of it is hostile —
 * because whoever is looking at a page can edit it, and because most of what
 * will ever reach this URL will never have loaded the page at all. Every check
 * the form makes is made again here. Nothing the request says about itself is
 * believed: not the origin, not the elapsed time, not the length of a field.
 *
 * What it refuses to do is as important as what it checks:
 *
 *   — It never says why it refused in any detail. A sender who is told which
 *     check caught them tunes against it; one who is told "no" has to guess.
 *   — It never echoes the message back, so it cannot be used to bounce content
 *     at a third party.
 *   — It holds no address. Claudia's is in the environment, so the public
 *     repository and the public page both offer to write to her without either
 *     of them saying where.
 *
 * Deploying it: see README.md beside this file.
 */

export interface Env {
  /** Where the mail goes. Claudia's address, and the only place it appears. */
  INQUIRY_TO: string;
  /** A sender the mail provider has verified for the site's own domain. */
  INQUIRY_FROM: string;
  /** Comma-separated origins allowed to post here. No wildcards. */
  ALLOWED_ORIGINS: string;
  /** Resend's API key. A secret: `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY: string;
  /** Turnstile's secret key, if the form carries the matching site key. */
  TURNSTILE_SECRET?: string;
  /**
   * A secret the sender's address is hashed with before it is used as a key.
   * Without it the rate-limit store would be a plain list of the IP addresses
   * of everyone who has ever written to Claudia, which is not something this
   * endpoint has any business keeping.
   */
  IP_PEPPER: string;
  /** The counters. Eventually consistent, which is discussed below. */
  RATE: Counters;
}

/**
 * The slice of a Cloudflare KV namespace this file uses, written out rather
 * than imported.
 *
 * `@cloudflare/workers-types` would give the whole of it, and the whole of it
 * is a dependency the site does not otherwise have for the sake of two methods.
 * Named for what it holds here, so that nothing reads as though the rest of KV
 * were in play.
 */
export interface Counters {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/* -------------------------------------------------------------- the limits */

/** Nothing legitimate is anywhere near this; a parser should never see more. */
const MAX_BODY = 16_384;

/**
 * How many messages one sender may send, and how many the endpoint will carry
 * in a day whoever sends them.
 *
 * Two sets, because a submission that passed Turnstile cost something to make
 * and one that did not cost nothing. The second set is deliberately mean: a
 * request with no token is either someone with scripting off — rare, and one
 * message is enough for them — or a robot, which is the ordinary case.
 *
 * The daily ceiling is the one that matters most. The per-sender limits are
 * defeated by anyone with a list of addresses to send from; this one is not,
 * and it is the difference between a bad morning and an inbox nobody can use.
 */
const LIMITS = {
  verified: { hour: 3, day: 8 },
  unverified: { hour: 1, day: 2 },
  everyone: { day: 60 },
} as const;

/** Written to and read, but never typed into: a message is a message. */
const FIELD = {
  name: { min: 2, max: 120 },
  country: { min: 0, max: 80 },
  email: { min: 6, max: 160 },
  subject: { min: 0, max: 160 },
  message: { min: 10, max: 4000 },
} as const;

/** Nobody types a message in three seconds, and nobody takes a day over one. */
const TYPING = { atLeast: 3_000, atMost: 12 * 60 * 60 * 1000 };

/* --------------------------------------------------------------- the checks */

const json = (status: number, body: Record<string, unknown>, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...cors(origin),
    },
  });

/**
 * Who may post here, stated exactly.
 *
 * A browser will not let a page post to this endpoint unless the answer names
 * that page's origin, so this is a real limit on what a page somewhere else can
 * do with somebody's browser. It is not a limit on what a script can do — a
 * request made outside a browser carries whatever origin it likes, or none —
 * which is why it is the least of the checks here rather than the first.
 */
function cors(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

const allowed = (origin: string | null, env: Env): string | null => {
  if (!origin) return null;
  const list = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
};

/**
 * One line, safe to put in a mail header.
 *
 * Carriage returns and newlines in a subject or a reply-to are how a header is
 * split in two and a second recipient added — the oldest trick there is against
 * a form that sends mail. They do not survive this, and neither does anything
 * else below a space.
 */
const oneLine = (value: string, max: number): string =>
  value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** The same, but a message keeps its paragraphs. */
const manyLines = (value: string, max: number): string =>
  value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim().slice(0, max);

/** Conservative on purpose: this address goes into a Reply-To header. */
const EMAIL = /^[^\s@,;:<>"]{1,64}@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** A key that identifies a sender without recording who they are. */
async function senderKey(ip: string, pepper: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${pepper}:${ip}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Counts, with a window that expires on its own.
 *
 * KV is eventually consistent, so two requests arriving in the same instant at
 * two edges can both read the same count and both be allowed. That is a real
 * hole and it is a small one: it lets a flood through at the rate the edges can
 * agree, not at the rate it is sent, and the daily ceiling catches what gets
 * past. The alternative is a Durable Object, which is strongly consistent and
 * costs a round trip to one place in the world on every submission — worth it
 * if this is ever actually attacked, and over-built until then. The shape of
 * the call is the same either way, so it is one function to change.
 */
async function overLimit(kv: Counters, key: string, allowance: number, seconds: number): Promise<boolean> {
  const window = `${key}:${Math.floor(Date.now() / 1000 / seconds)}`;
  const count = Number(await kv.get(window)) || 0;
  if (count >= allowance) return true;
  // Twice the window, so a counter cannot expire out from under the window it
  // belongs to while a request is in flight.
  await kv.put(window, String(count + 1), { expirationTtl: Math.max(60, seconds * 2) });
  return false;
}

/** Cloudflare's verdict on whether a person sent this. */
async function verified(token: string, ip: string, secret: string | undefined): Promise<boolean> {
  if (!secret) return false;
  if (!token) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const body = (await response.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    // The check being unreachable is not the sender's fault. They fall to the
    // unverified allowance, which is one message, rather than being refused.
    return false;
  }
}

/* ---------------------------------------------------------------- the send */

/**
 * Handed to Resend, as plain text.
 *
 * Text and not HTML, so nothing a sender writes can become markup in the window
 * Claudia reads it in. The reply-to is the sender's address, so answering an
 * order is a reply and not a copy-and-paste; the from is the site's own
 * verified address, because mail claiming to be from an address the site does
 * not control is mail that lands in a spam folder.
 */
async function send(env: Env, message: {
  name: string; country: string; email: string; subject: string; body: string;
}): Promise<boolean> {
  const lines = [
    `From: ${message.name}`,
    `Email: ${message.email}`,
    ...(message.country ? [`Country: ${message.country}`] : []),
    '',
    message.body,
    '',
    '\u2014',
    'Sent from the Colour Chart order form on claudiavalsells.com.',
  ];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.INQUIRY_FROM,
      to: [env.INQUIRY_TO],
      reply_to: message.email,
      subject: message.subject
        ? `Colour chart — ${message.subject}`
        : `Colour chart — order from ${message.name}`,
      text: lines.join('\n'),
    }),
  });
  return response.ok;
}

/* -------------------------------------------------------------- the handler */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowed(request.headers.get('origin'), env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    }
    if (request.method !== 'POST') {
      return json(405, { ok: false, error: 'blocked' }, origin);
    }
    /*
     * A browser cannot reach here from anywhere but the site. A script can
     * reach here from anywhere, with no origin header at all — so a missing
     * origin is allowed through to the checks below rather than refused, and a
     * *wrong* one is refused outright, because the only thing that sends a
     * wrong origin is a page somewhere else trying to use someone's browser.
     */
    if (request.headers.get('origin') && !origin) {
      return json(403, { ok: false, error: 'blocked' }, null);
    }

    const length = Number(request.headers.get('content-length') ?? 0);
    if (length > MAX_BODY) return json(413, { ok: false, error: 'invalid' }, origin);

    let body: Record<string, unknown>;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY) return json(413, { ok: false, error: 'invalid' }, origin);
      body = JSON.parse(text) as Record<string, unknown>;
      if (typeof body !== 'object' || body === null) throw new Error('not an object');
    } catch {
      return json(400, { ok: false, error: 'invalid' }, origin);
    }

    const str = (key: string): string => (typeof body[key] === 'string' ? (body[key] as string) : '');

    /*
     * The two cheap ones, first and silently.
     *
     * A filled honeypot and an instant submission both answer 200 and send
     * nothing. Answering truthfully would tell a sender which of the two
     * tripped, and a sender that is told nothing went wrong has no reason to
     * come back and try it differently.
     */
    if (str('website').trim() !== '') return json(200, { ok: true }, origin);
    const elapsed = Date.now() - (Number(body.started) || 0);
    if (!(elapsed > TYPING.atLeast && elapsed < TYPING.atMost)) {
      return json(200, { ok: true }, origin);
    }

    const name = oneLine(str('name'), FIELD.name.max);
    const country = oneLine(str('country'), FIELD.country.max);
    const email = oneLine(str('email'), FIELD.email.max).toLowerCase();
    const subject = oneLine(str('subject'), FIELD.subject.max);
    const message = manyLines(str('message'), FIELD.message.max);

    if (name.length < FIELD.name.min || message.length < FIELD.message.min) {
      return json(400, { ok: false, error: 'invalid' }, origin);
    }
    if (email.length < FIELD.email.min || !EMAIL.test(email)) {
      return json(400, { ok: false, error: 'email' }, origin);
    }

    const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
    const passed = await verified(str('token'), ip, env.TURNSTILE_SECRET);
    const allowance = passed ? LIMITS.verified : LIMITS.unverified;
    const key = await senderKey(ip, env.IP_PEPPER);

    /*
     * The ceiling first, so a flood from many addresses is stopped by the one
     * counter it cannot get around before it has a chance to write to the many
     * counters it can.
     */
    if (await overLimit(env.RATE, 'all', LIMITS.everyone.day, 86_400)) {
      return json(429, { ok: false, error: 'rate' }, origin);
    }
    if (await overLimit(env.RATE, `${key}:h`, allowance.hour, 3_600)) {
      return json(429, { ok: false, error: 'rate' }, origin);
    }
    if (await overLimit(env.RATE, `${key}:d`, allowance.day, 86_400)) {
      return json(429, { ok: false, error: 'rate' }, origin);
    }

    const sent = await send(env, { name, country, email, subject, body: message });
    if (!sent) return json(502, { ok: false, error: 'server' }, origin);

    return json(200, { ok: true }, origin);
  },
};
