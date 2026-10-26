# The order desk

The Colour Chart's form posts here. It is the only server-side thing the site
has, and it exists because a static host serves files and cannot send mail.

It is deployed separately from the site and is not part of `npm run build`. The
site only needs to know its URL.

## What it does

One `POST` of JSON, one email to Claudia, nothing kept. Before it sends, every
check the form made is made again — a page can be edited by whoever is looking
at it, so nothing the browser decides counts here.

| Check | Catches |
|---|---|
| Origin allow-list | A page on another site using a visitor's browser |
| 16 KB body cap | A parser being handed something enormous |
| `website` honeypot | Anything that filled a field no person can see |
| Time since the form opened | A submission nobody typed (under 3s, or over 12h) |
| Field shapes and lengths | Malformed and oversized input |
| Control characters stripped | Header injection — a second recipient added via the subject or reply-to |
| Turnstile (optional) | The rest |
| Per-sender rate limit | 3/hour and 8/day verified; 1/hour and 2/day not |
| Daily ceiling | A flood from many addresses at once |

A refusal says only `invalid`, `email`, `rate` or `blocked` — never which check
caught it, because a sender who is told what tripped tunes against it. The
honeypot and the time trap answer `200` and send nothing, so a robot has no
reason to come back and try it differently.

Claudia's address is not in this repository. It is a secret in the handler's
environment, so the public page offers to write to her without saying where.

## Deploying

```bash
cd server/inquiries
npx wrangler kv namespace create INQUIRIES_RATE   # put the printed id in wrangler.toml
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put INQUIRY_TO                # Claudia's address
npx wrangler secret put IP_PEPPER                 # any long random string
npx wrangler deploy
```

`IP_PEPPER` is what the sender's address is hashed with before it becomes a
rate-limit key, so the store never holds a list of the addresses of people who
have written to Claudia. Any long random string will do; it only has to stay the
same.

The mail goes through [Resend](https://resend.com) — one HTTPS call, in `send()`
at the foot of `worker.ts`. Another provider is that function and nothing else.
Whichever it is, the domain's SPF and DKIM records have to be set up with them,
or the mail will arrive in a spam folder.

### Turnstile, if you want it

Optional, and the only third-party script the site would then load. The honeypot,
the time trap and the rate limit stop nearly everything; this stops the rest.

Make a widget at Cloudflare → Turnstile, then:

```bash
npx wrangler secret put TURNSTILE_SECRET
```

and build the site with the matching **site** key, which is public by design:

```bash
TURNSTILE_SITE_KEY=0x4AAA… INQUIRIES_ENDPOINT=https://… npm run build
```

Without it the form still works; submissions simply count as unverified and get
the much tighter allowance.

## Building the site against it

```bash
INQUIRIES_ENDPOINT=https://claudiavalsells-inquiries.<account>.workers.dev npm run build
```

Built without it, the form renders and refuses to send, saying so — and the
build prints a warning, so a site deployed without the endpoint is noticed when
it is made rather than by the first person who tries to order.

## Checking it

```bash
curl -i -X POST https://<your-worker-url>/ \
  -H 'content-type: application/json' \
  -H 'origin: https://www.claudiavalsells.com' \
  -d '{"name":"Test","email":"you@example.com","country":"Spain","subject":"Test",
       "message":"A message long enough to pass.","website":"","started":'"$(( $(date +%s)000 - 9000 ))"',"token":""}'
```

A `200` with `{"ok":true}` means it was accepted — though with the honeypot or
the time trap that is also what a silent refusal looks like, which is the point.
`wrangler tail` shows what actually happened.

## Elsewhere

It is a plain `fetch` handler, so it is close to portable. Off Cloudflare, two
things change: `cf-connecting-ip` becomes whatever that platform calls the
client address, and `Counters` needs any store with a get, a put and an expiry.
Turnstile would also have to go, or be replaced.

## One known limit

KV is eventually consistent, so two requests arriving at the same instant at two
edges can both read the same count and both be allowed. It lets a flood through
at the rate the edges agree rather than at the rate it is sent, and the daily
ceiling catches what gets past. A Durable Object would close it, at the cost of
a round trip to one place in the world on every submission — worth doing if this
is ever actually attacked, and over-built until then. `overLimit()` is the only
function that would change.
