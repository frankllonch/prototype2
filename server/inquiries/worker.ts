/** The order desk. */

export interface Env {
  /** Where the mail goes. Claudia's address, and the only place it appears. */
  INQUIRY_TO: string;
  /** Where the Gallery's inquiries go: the Alzueta gallery. */
  INQUIRY_TO_GALLERY?: string;
  /** A sender the mail provider has verified for the site's own domain. */
  INQUIRY_FROM: string;
  /** Comma-separated origins allowed to post here. No wildcards. */
  ALLOWED_ORIGINS: string;
  /** Resend's API key. A secret: `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY: string;
  /** Turnstile's secret key, if the form carries the matching site key. */
  TURNSTILE_SECRET?: string;
  /** A secret the sender's address is hashed with before it is used as a key. */
  IP_PEPPER: string;
  /** The counters. Eventually consistent, which is discussed below. */
  RATE: Counters;
}

/** The slice of a Cloudflare KV namespace this file uses, written out rather than imported. */
export interface Counters {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/* -------------------------------------------------------------- the limits */

/** Nothing legitimate is anywhere near this; a parser should never see more. */
const MAX_BODY = 16_384;

/**
 * How many messages one sender may send, and how many the endpoint will carry in
 * a day whoever sends them.
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

/** Who may post here, stated exactly. */
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

/** One line, safe to put in a mail header. */
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

/** Counts, with a window that expires on its own. */
async function overLimit(kv: Counters, key: string, allowance: number, seconds: number): Promise<boolean> {
  const window = `${key}:${Math.floor(Date.now() / 1000 / seconds)}`;
  const count = Number(await kv.get(window)) || 0;
  if (count >= allowance) return true;
  // Twice the window, so a counter cannot expire out from under the window it belongs to while a
  // request is in flight.
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
    // The check being unreachable is not the sender's fault.
    return false;
  }
}

/* ---------------------------------------------------------------- the send */

/** Handed to Resend, as plain text. */
/** The two forms the site has, and what each one's mail says it is. */
const DESKS = {
  chart: { label: 'Colour chart', untitled: 'order', form: 'the Colour Chart order form' },
  gallery: { label: 'Gallery inquiry', untitled: 'inquiry', form: 'the Gallery inquiries form' },
} as const;
type Desk = keyof typeof DESKS;

async function send(env: Env, desk: Desk, message: {
  name: string; country: string; email: string; subject: string; body: string;
}): Promise<boolean> {
  const { label, untitled, form } = DESKS[desk];
  const to = desk === 'gallery' ? (env.INQUIRY_TO_GALLERY || env.INQUIRY_TO) : env.INQUIRY_TO;
  const lines = [
    `From: ${message.name}`,
    `Email: ${message.email}`,
    ...(message.country ? [`Country: ${message.country}`] : []),
    '',
    message.body,
    '',
    '\u2014',
    `Sent from ${form} on claudiavalsells.com.`,
  ];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.INQUIRY_FROM,
      to: [to],
      reply_to: message.email,
      subject: message.subject
        ? `${label} — ${message.subject}`
        : `${label} — ${untitled} from ${message.name}`,
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
    /* A browser cannot reach here from anywhere but the site. */
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

    /* The two cheap ones, first and silently. */
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

    const desk: Desk = str('desk') === 'gallery' ? 'gallery' : 'chart';
    const sent = await send(env, desk, { name, country, email, subject, body: message });
    if (!sent) return json(502, { ok: false, error: 'server' }, origin);

    return json(200, { ok: true }, origin);
  },
};
