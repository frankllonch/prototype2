import { isPlainClick, phone } from './env.js';
import { keepScroll, stepBack, stepState } from './panels.js';
/**
 * Ordering a colour chart.
 *
 * The form is already in the page — this raises it over the page, keeps the
 * keyboard inside it, and posts it without leaving. None of that is a defence.
 * Everything here can be read, edited or skipped by whoever is looking at the
 * page, so the three guards it carries (an unfillable field, the time the form
 * was open, and Cloudflare's check) are the handler's guards, prepared here;
 * the handler repeats every one of them and is the only thing that decides.
 *
 * What this file is for is that a person ordering a colour chart should not
 * have to reload a page to find out whether it worked.
 *
 * On a phone the form is the whole screen, and opening it is a step in the
 * history, as a panel's is (client/panels.ts): the phone's Back puts the form
 * away and leaves the page — it used to leave the site, with whatever had been
 * typed — and Close goes back over the same step. What was typed stays in the
 * fields either way. Wider than a phone the address is replaced, as it was.
 */
/*
 * What the person is told, keyed by what the handler says went wrong.
 *
 * A table here rather than the handler's own words on screen: the one thing a
 * page should never do is take a string from the network and show it as its
 * own. The handler answers in codes for that reason, and says no more about why
 * it refused than the sender needs — a spammer tuning against a detailed
 * refusal is the whole reason detailed refusals are a mistake.
 */
const SAID = {
    ok: 'Thank you — your message is on its way.',
    invalid: 'Something in the form is not right. Please check it over.',
    email: 'That email address does not look complete.',
    rate: 'That is a few messages already. Please try again later.',
    blocked: 'This message could not be sent.',
    network: 'That did not send — check your connection and try again.',
    server: 'Something went wrong at our end. Please try again shortly.',
    unconfigured: 'The order form is not connected yet.',
};
/** A conservative test: something, an @, something with a dot in it. */
const LOOKS_LIKE_EMAIL = /^[^\s@,;:<>"]{1,64}@[^\s@,;:<>"]{1,180}\.[a-z]{2,24}$/i;
/** Everything that can be tabbed to inside the form, in document order. */
const focusable = (root) => [...root.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]')]
    .filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
/**
 * Cloudflare's check, loaded only when a site key is configured and only when
 * someone actually opens the form.
 *
 * It is the one thing on the site served from somewhere else, so it is not
 * fetched until it is about to be needed, and the form still works if it never
 * arrives: a submission without a token is one the handler treats as unverified
 * and rate-limits far harder, rather than one it refuses outright. A person on
 * a train should be able to order a colour chart.
 */
function turnstile(form, slot) {
    const key = form.dataset.turnstileKey;
    if (!key)
        return { token: async () => '' };
    let widget;
    let waiting;
    const api = () => window.turnstile;
    const ready = new Promise((resolve) => {
        if (api()) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.addEventListener('load', () => resolve());
        // A failure to load resolves too: see above — no token, not no form.
        script.addEventListener('error', () => resolve());
        document.head.append(script);
    });
    return {
        /** Loads, renders, and asks for one token. Empty if it cannot get one. */
        token: async () => {
            await ready;
            const t = api();
            if (!t)
                return '';
            if (widget === undefined) {
                widget = t.render(slot, {
                    sitekey: key,
                    // Shown only if this particular visitor has to be asked something.
                    // Nobody ordering a colour chart should have to pick out a bus.
                    appearance: 'interaction-only',
                    execution: 'execute',
                    callback: (token) => waiting?.(token),
                    'error-callback': () => waiting?.(''),
                    'timeout-callback': () => waiting?.(''),
                });
            }
            else {
                t.reset(widget);
            }
            return new Promise((resolve) => {
                waiting = resolve;
                t.execute(widget);
                // However it ends, it ends: an unanswered challenge must not leave the
                // button disabled and the person with nothing to do.
                setTimeout(() => resolve(''), 12_000);
            });
        },
    };
}
export function initInquiries() {
    const panel = document.querySelector('[data-inquiries]');
    const form = panel?.querySelector('[data-inquiries-form]');
    if (!panel || !form)
        return;
    const started = form.querySelector('[data-inquiries-started]');
    const status = form.querySelector('[data-inquiries-status]');
    const button = form.querySelector('[data-inquiries-submit]');
    const check = form.querySelector('[data-inquiries-check]');
    const endpoint = form.getAttribute('action') ?? '';
    const guard = turnstile(form, check);
    let opener = null;
    let sent = false;
    // The open form stands on a history step of its own, one on from the page.
    let stepped = false;
    const mine = () => stepState().view === 'inquiries';
    const say = (key, state = '') => {
        status.textContent = SAID[key] ?? SAID.server;
        if (state)
            status.dataset.state = state;
        else
            delete status.dataset.state;
    };
    const open = (from) => {
        opener = from;
        panel.classList.add('is-open');
        document.body.classList.add('is-locked');
        // When the form was put in front of someone. The handler compares it with
        // when the message arrived: three seconds is not long enough to have typed
        // one, and a week is long enough that the page has been sitting open in a
        // script somewhere.
        started.value = String(Date.now());
        form.querySelector('.inq-input')?.focus({ preventScroll: true });
    };
    /** `byHistory`: Back has already left the form's step, and only the form is left to put away. */
    const close = (byHistory = false) => {
        if (!panel.classList.contains('is-open'))
            return;
        // Close and Escape go back over the step rather than leaving it behind,
        // and the `popstate` below does the closing.
        if (stepped && !byHistory && mine()) {
            stepBack();
            return;
        }
        stepped = false;
        panel.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        if (!byHistory)
            history.replaceState(null, '', location.pathname + location.search);
        opener?.focus({ preventScroll: true });
        opener = null;
    };
    for (const trigger of document.querySelectorAll('[data-inquiries-open]')) {
        trigger.addEventListener('click', (event) => {
            if (!isPlainClick(event))
                return;
            event.preventDefault();
            if (phone.matches)
                history.pushState({ view: 'inquiries' }, '', '#inquiries');
            else
                history.replaceState(null, '', '#inquiries');
            stepped = phone.matches;
            open(trigger);
        });
    }
    panel.querySelector('[data-inquiries-close]')?.addEventListener('click', (event) => {
        event.preventDefault();
        close();
    });
    // Back from the form's step puts it away; Forward onto it raises it again.
    // A form that made no step — a shared #inquiries link — is not touched.
    window.addEventListener('popstate', () => {
        if (mine()) {
            keepScroll();
            if (!panel.classList.contains('is-open'))
                open(null);
            stepped = true;
        }
        else if (stepped) {
            keepScroll();
            close(true);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (!panel.classList.contains('is-open'))
            return;
        if (event.key === 'Escape') {
            close();
            return;
        }
        /*
         * The keyboard stays in the form while the form is over the page. Without
         * this, tabbing past the last field walks into the menu behind the veil —
         * invisible, unreadable, and still focused.
         */
        if (event.key !== 'Tab')
            return;
        const stops = focusable(panel);
        if (!stops.length)
            return;
        const first = stops[0], last = stops[stops.length - 1];
        const on = document.activeElement;
        if (event.shiftKey && (on === first || !panel.contains(on))) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && on === last) {
            event.preventDefault();
            first.focus();
        }
    });
    /*
     * The message field is a rule until it needs to be a box: it grows with what
     * is typed, so the form stays the shape the designer drew and a long message
     * is still written in one place rather than through a slot.
     */
    const area = form.querySelector('.inq-area');
    if (area) {
        const grow = () => {
            area.style.height = 'auto';
            area.style.height = `${Math.min(area.scrollHeight, Math.round(window.innerHeight * 0.4))}px`;
        };
        area.addEventListener('input', grow);
        grow();
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled)
            return;
        if (!endpoint) {
            say('unconfigured', 'error');
            return;
        }
        if (sent) {
            say('ok', 'sent');
            return;
        }
        const value = (name) => form.elements.namedItem(name)?.value.trim() ?? '';
        const payload = {
            name: value('name'),
            country: value('country'),
            email: value('email'),
            subject: value('subject'),
            message: value('message'),
            website: value('website'),
            started: Number(started.value) || 0,
            token: '',
        };
        // Said here only so nobody waits for a round trip to be told they left the
        // message empty. The handler checks all of this again and trusts none of it.
        if (payload.name.length < 2 || payload.message.length < 10) {
            say('invalid', 'error');
            return;
        }
        if (!LOOKS_LIKE_EMAIL.test(payload.email)) {
            say('email', 'error');
            return;
        }
        button.disabled = true;
        say('');
        status.textContent = 'Sending…';
        try {
            payload.token = await guard.token();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
                // Nothing of the visitor's travels with this: no cookies, no
                // credentials. The handler needs the message and nothing else.
                credentials: 'omit',
                mode: 'cors',
            });
            const body = await response.json().catch(() => ({}));
            if (response.ok) {
                sent = true;
                say('ok', 'sent');
                form.reset();
                if (area)
                    area.style.height = 'auto';
                button.textContent = 'Sent';
                return;
            }
            say(response.status === 429 ? 'rate' : (body.error ?? 'server'), 'error');
        }
        catch {
            say('network', 'error');
        }
        finally {
            if (!sent)
                button.disabled = false;
        }
    });
    // A shared or reloaded #inquiries link opens it, as a shared #about does.
    // Reloaded on the form's step, the step is still there behind it.
    if (location.hash === '#inquiries') {
        open(null);
        stepped = mine();
    }
}
