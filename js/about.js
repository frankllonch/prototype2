import { reduceMotion } from './env.js';
/**
 * About, told in four parts as you scroll down it.
 *
 * 1. Opening it scrolls itself down the lead's stretch, so the capitals lead is
 *    written word by word in front of you and stands complete. The start
 *    page's chevron asks for more from the moment it opens until the end. The lead holds its place throughout,
 *    and is written by the scroll, not by a clock: scrolling back up unwrites
 *    it, and down again writes it again.
 * 2. Still held, the reel of photographs is driven in from the right and comes
 *    to rest under the lead, from the left margin, as the designer's sheet
 *    sets it.
 * 3. The hold lets go and the biography is written as it rises: a word appears
 *    when its place on the page reaches the writing line, so the writing keeps
 *    pace with the reader rather than with a clock. The reel moves on round
 *    its loop as the page goes up — slowly at first — and back as it comes
 *    down. The chevrons in the margins, a drag or a swipe move it by hand.
 * 4. The record, the collections and the contact come in out of a blur as they
 *    reach the screen, in order down the page.
 *
 * About scrolls in its own box (`.about`, fixed, over the blurred page), so
 * everything here reads that box's scroll and never the window's, which does
 * not move while it is open.
 *
 * All of it is an enhancement of a page that already stands: the words are
 * split into spans here, the hold is a runway made here, and `.is-staged`,
 * which hides anything, is only set here. With motion reduced, the page is
 * left as it is; the reel still steps round by hand, without gliding, and the
 * photographs still open large.
 *
 * Word by word, and appearing whole, as on the start page — there the writing
 * is in CSS on a timeline fixed at build; here it is measured, because what it
 * has to fit (how many photographs, how long Claudia's text is in WordPress)
 * is only known in the page.
 */
/**
 * The glide down the lead on opening: after the panel has begun to rise, and
 * long enough to watch the sentence form. Eased at both ends, as glide.ts
 * eases the window's own.
 */
const GLIDE_DELAY_MS = 420;
const GLIDE_MS = 1900;
/** Scroll per word of the lead, in screens, and its limits. */
const LEAD_PER_WORD = 0.028;
const LEAD_MIN = 0.5;
const LEAD_MAX = 1.6;
/** Scroll for the photographs' run: at least this much of a screen, else one to one. */
const REEL_MIN = 0.7;
/**
 * Past its place the reel goes on with the scroll, this much sideways for
 * each pixel up or down — reaching that pace over the first quarter screen,
 * so it stands in place before it starts moving.
 */
const REEL_DRIFT = 0.8;
const REEL_DRIFT_EASE = 0.25;
/** Where on the screen the biography is written: this far down. */
const WRITE_LINE = 0.8;
/** Each column comes in this much later than the one to its left, at most. */
const POP_STAGGER_MS = 260;
export function initAbout() {
    const about = document.getElementById('about');
    if (!about)
        return;
    const loop = initReel(about);
    initViewer(about);
    if (reduceMotion.matches) {
        // The reel stands in its place and moves only by hand.
        if (loop) {
            const still = () => { if (about.classList.contains('is-open') && loop.measure())
                loop.scrolled(0, 0); };
            about.addEventListener('panelopen', () => { loop.reset(); still(); });
            window.addEventListener('resize', () => requestAnimationFrame(still));
            if (about.classList.contains('is-open'))
                still();
        }
        return;
    }
    const sheet = about.querySelector('.about-sheet');
    const opening = about.querySelector('[data-about-opening]');
    const stage = about.querySelector('[data-about-stage]');
    const leadEl = about.querySelector('.about-lead');
    if (!sheet || !opening || !stage || !leadEl)
        return;
    const cue = document.querySelector('[data-about-cue]');
    const lead = splitWords(leadEl);
    const body = [...about.querySelectorAll('.about-text > p:not(.about-lead)')].flatMap(splitWords);
    const pops = [
        ...about.querySelectorAll('.about-label, .about-show, .about-collection, .about-contact, .about-foot'),
    ];
    for (const el of pops)
        el.classList.add('about-pop');
    about.classList.add('is-staged');
    // What the measuring settles, in pixels of the panel's own scroll.
    let leadRun = 1;
    let reelFrom = 0;
    let reelRun = 1;
    let reelStart = 0;
    let marks = [];
    // What has been shown.
    let leadShown = 0;
    let bodyShown = 0;
    let glided = false;
    let glide = 0;
    let glideTimer = 0;
    let frame = 0;
    let pops$ = null;
    const show = (words, from, to, on) => {
        for (let i = from; i < to; i++)
            words[i]?.classList.toggle('is-written', on);
    };
    const setLead = (n) => {
        n = Math.max(0, Math.min(lead.length, n));
        if (n > leadShown)
            show(lead, leadShown, n, true);
        else if (n < leadShown)
            show(lead, n, leadShown, false);
        leadShown = n;
    };
    const setBody = (n) => {
        if (n > bodyShown)
            show(body, bodyShown, n, true);
        else if (n < bodyShown)
            show(body, n, bodyShown, false);
        bodyShown = n;
    };
    const measure = () => {
        if (!about.classList.contains('is-open'))
            return;
        const height = about.clientHeight;
        const width = about.clientWidth;
        // Wherever the reader is now, they are there again when this is done: a
        // new runway changes the page's length, and the browser would otherwise
        // clamp or re-anchor the scroll.
        const y = about.scrollTop;
        const top = about.getBoundingClientRect().top - y;
        const contentY = (el) => el.getBoundingClientRect().top - top;
        // The stage holds where it stands, or as high as it must to fit. Where it
        // stands is the runway's top — the stage is the runway's first child —
        // which, unlike the stage, does not move while the stage is held.
        const stageTop = contentY(opening);
        const stageHeight = stage.offsetHeight;
        stage.style.setProperty('--stage-top', `${Math.min(stageTop, height - stageHeight)}px`);
        leadRun = height * Math.min(LEAD_MAX, Math.max(LEAD_MIN, lead.length * LEAD_PER_WORD));
        if (loop?.measure()) {
            // In from just out of sight at the right of the measure.
            reelStart = loop.span + loop.gap;
            reelRun = Math.max(height * REEL_MIN, reelStart);
        }
        else {
            reelRun = 0;
        }
        reelFrom = leadRun;
        opening.style.height = `${stageHeight + leadRun + reelRun}px`;
        if (about.scrollTop !== y)
            about.scrollTop = y;
        // The biography: each word's turn comes when its place reaches the writing
        // line — a line's first word as the line does, its last a line-height
        // later — so the writing runs along each line and down the paragraph.
        const column = sheet.querySelector('.about-text');
        const box = column?.getBoundingClientRect();
        const colLeft = box?.left ?? 0;
        const colWidth = Math.max(1, box?.width ?? width);
        let last = -Infinity;
        marks = body.map((word) => {
            const r = word.getBoundingClientRect();
            const pitch = Number.parseFloat(getComputedStyle(word).lineHeight) || r.height;
            const at = r.top - top + ((r.left - colLeft) / colWidth) * pitch - height * WRITE_LINE;
            last = Math.max(last, at);
            return last;
        });
        update();
    };
    const update = () => {
        frame = 0;
        const y = about.scrollTop;
        setLead(Math.round(Math.min(1, Math.max(0, y / leadRun)) * lead.length));
        // The chevron asks for more from the moment About opens until there is no
        // more: it goes only at the end of the panel, and comes back on the way up.
        const end = y >= about.scrollHeight - about.clientHeight - 2;
        cue?.classList.toggle('is-shown', !end);
        // At the end of the panel, whatever has not come in yet comes in: the last
        // lines can stop short of where they would otherwise be called.
        if (end) {
            for (const el of pops)
                if (!el.classList.contains('is-in')) {
                    el.classList.add('is-in');
                    pops$?.unobserve(el);
                }
        }
        if (loop && reelRun) {
            const p = Math.min(1, Math.max(0, (y - reelFrom) / reelRun));
            const eased = 1 - (1 - p) * (1 - p);
            // Past its place, carried along: from standing to its full pace over
            // the first stretch, so the pace never jumps.
            const past = Math.max(0, y - reelFrom - reelRun);
            const ease = Math.max(1, about.clientHeight * REEL_DRIFT_EASE);
            const along = past < ease ? (past * past) / (2 * ease) : past - ease / 2;
            loop.scrolled(reelStart * (1 - eased), along * REEL_DRIFT);
        }
        // The count of marks at or above this scroll: they only ever rise.
        let lo = 0;
        let hi = marks.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (marks[mid] <= y)
                lo = mid + 1;
            else
                hi = mid;
        }
        setBody(lo);
    };
    const schedule = () => {
        if (!frame)
            frame = requestAnimationFrame(update);
    };
    // The glide ends where it was going, or wherever a hand takes over.
    const endGlide = () => {
        clearTimeout(glideTimer);
        cancelAnimationFrame(glide);
        glideTimer = 0;
        glide = 0;
        glided = true;
    };
    const runGlide = () => {
        const from = about.scrollTop;
        // Already moved — a jump, a restored position — and there is nothing to
        // glide to: the reader is somewhere of their own choosing.
        if (from > 2)
            return endGlide();
        const to = leadRun;
        const began = performance.now();
        let placed = from;
        const step = (now) => {
            // Moved by anything but the glide — the scrollbar dragged, a key, a
            // script — and the glide gives way rather than pulling it back.
            if (Math.abs(about.scrollTop - placed) > 2)
                return endGlide();
            const t = Math.min(1, (now - began) / GLIDE_MS);
            const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
            about.scrollTop = from + (to - from) * e;
            placed = about.scrollTop;
            if (t < 1)
                glide = requestAnimationFrame(step);
            else
                endGlide();
        };
        glide = requestAnimationFrame(step);
    };
    for (const kind of ['wheel', 'touchstart', 'pointerdown']) {
        about.addEventListener(kind, () => { if (!glided)
            endGlide(); }, { passive: true });
    }
    document.addEventListener('keydown', () => {
        if (!glided && about.classList.contains('is-open'))
            endGlide();
    });
    const start = () => {
        endGlide();
        glided = false;
        cue?.classList.add('is-shown');
        loop?.reset();
        setLead(0);
        setBody(0);
        // The photographs are lazy, and off to the side they would only be asked
        // for as they slide in. Asked for now.
        for (const img of about.querySelectorAll('.about-reel img'))
            img.loading = 'eager';
        for (const el of pops) {
            el.classList.remove('is-in');
            el.style.removeProperty('--pop-delay');
        }
        pops$?.disconnect();
        pops$ = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting)
                    continue;
                const el = entry.target;
                const sheetBox = sheet.getBoundingClientRect();
                const across = (entry.boundingClientRect.left - sheetBox.left) / Math.max(1, sheetBox.width);
                el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * POP_STAGGER_MS)}ms`);
                el.classList.add('is-in');
                pops$?.unobserve(el);
            }
        }, { root: about, rootMargin: '0px 0px -8% 0px' });
        for (const el of pops)
            pops$.observe(el);
        measure();
        glideTimer = window.setTimeout(runGlide, GLIDE_DELAY_MS);
    };
    about.addEventListener('scroll', schedule, { passive: true });
    // On the document: focus opens on the Close link, which stands beside the panel.
    document.addEventListener('keydown', (event) => {
        if (about.classList.contains('is-open'))
            keyScroll(about, event);
    });
    about.addEventListener('panelopen', start);
    window.addEventListener('resize', () => requestAnimationFrame(measure));
    void document.fonts?.ready.then(measure);
    for (const img of about.querySelectorAll('.about-reel img')) {
        if (!img.complete)
            img.addEventListener('load', measure, { once: true });
    }
    // Closing stops the glide; the next opening starts it again from the top.
    new MutationObserver(() => {
        if (!about.classList.contains('is-open'))
            endGlide();
    }).observe(about, { attributes: true, attributeFilter: ['class'] });
    // Served open — a #about arrival, or WordPress's /about/ — the panel was
    // raised before this ran, and its `panelopen` has already gone by.
    if (about.classList.contains('is-open'))
        start();
}
/** How quickly a step or a fling settles: the time for two thirds of the way. */
const REEL_SETTLE_MS = 150;
/** A press becomes a drag once it has moved this far sideways. */
const REEL_DRAG_PX = 6;
/** A drag let go carries on for as long as this at the speed it was going. */
const REEL_FLING_MS = 240;
/**
 * The reel of photographs as a loop: the photographs stand in a row from the
 * left of the measure, and whatever does not fit waits to their right and
 * comes round again after the last. Each is placed on its own, so the row
 * never has an end to run into.
 *
 * Moved by About's scroll (`scrolled`), and by hand: the chevrons bring the
 * next or the previous photograph to the left margin, and a drag, a swipe or a
 * sideways scroll pull it along. Tabbing to a photograph out of sight brings it
 * into view. Only a loop if the photographs overrun the measure; and if there
 * are too few to fill it twice over, they are repeated (hidden from assistive
 * technology and the tab order) so that one never shows in two places.
 */
function initReel(about) {
    const reel = about.querySelector('[data-about-reel]');
    const track = reel?.querySelector('[data-about-track]');
    if (!reel || !track)
        return null;
    const originals = [...track.querySelectorAll('.about-reel-item')];
    if (originals.length < 2)
        return null;
    const steps = [...reel.querySelectorAll('[data-about-reel-step]')];
    let slots = [];
    let span = 0;
    let gap = 0;
    let length = 0;
    let before = 0;
    let looped = false;
    let entry = 0;
    let along = 0;
    let hand = 0;
    let handTo = 0;
    let frame = 0;
    let last = 0;
    // Where a photograph stands in the window at a given distance round the
    // loop. While the reel is coming in nothing stands left of the first, so it
    // arrives from empty; at rest one may stand partly out at the left.
    const wrap = (x, from) => from + ((((x - from) % length) + length) % length);
    const xAt = (slot, offset) => (looped ? wrap(slot.at - offset, entry > 0.5 ? 0 : -before) : slot.at);
    const place = () => {
        const offset = along + hand;
        for (const slot of slots) {
            slot.el.style.transform = `translate3d(${(xAt(slot, offset) + entry).toFixed(2)}px, 0, 0)`;
        }
        reel.classList.toggle('is-placed', entry < 0.5);
    };
    const tick = (now) => {
        frame = 0;
        const dt = Math.min(64, now - last);
        last = now;
        hand = reduceMotion.matches ? handTo : hand + (handTo - hand) * (1 - Math.exp(-dt / REEL_SETTLE_MS));
        if (Math.abs(handTo - hand) < 0.25)
            hand = handTo;
        place();
        if (hand !== handTo)
            frame = requestAnimationFrame(tick);
    };
    const settle = () => {
        if (frame)
            return;
        last = performance.now();
        frame = requestAnimationFrame(tick);
    };
    /** The next photograph, or the previous, to the left margin. */
    const step = (by) => {
        if (!looped)
            return;
        const offset = along + handTo;
        const xs = slots.map((slot) => xAt(slot, offset));
        const to = by > 0 ? Math.min(...xs.filter((x) => x > 1)) : Math.max(...xs.filter((x) => x < -1));
        if (Number.isFinite(to))
            handTo += to;
        settle();
    };
    const measure = () => {
        reel.classList.add('is-looped');
        span = track.clientWidth;
        if (!span)
            return false;
        gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        const widths = originals.map((el) => el.getBoundingClientRect().width);
        const total = widths.reduce((sum, w) => sum + w + gap, 0);
        const widest = Math.max(...widths);
        const wasLength = length;
        looped = total - gap > span + 1;
        before = widest + gap;
        // Enough of a loop that what leaves on one side is gone before it comes
        // back on the other.
        const copies = looped ? Math.max(1, Math.ceil((span + before) / total)) : 1;
        for (const clone of track.querySelectorAll('[data-clone]'))
            clone.remove();
        slots = [];
        for (let c = 0; c < copies; c++) {
            let at = c * total;
            originals.forEach((original, i) => {
                let el = original;
                if (c > 0) {
                    el = original.cloneNode(true);
                    el.dataset.clone = '';
                    el.setAttribute('aria-hidden', 'true');
                    el.tabIndex = -1;
                    el.addEventListener('click', () => original.click());
                    track.append(el);
                }
                slots.push({ el, at, width: widths[i] });
                at += widths[i] + gap;
            });
        }
        length = total * copies;
        // Kept the same share of the way round when the reel changes size.
        if (wasLength && length && looped) {
            hand *= length / wasLength;
            handTo *= length / wasLength;
        }
        if (!looped)
            hand = handTo = 0;
        for (const button of steps)
            button.hidden = !looped;
        place();
        return true;
    };
    for (const button of steps)
        button.addEventListener('click', () => step(Number(button.dataset.aboutReelStep)));
    reel.addEventListener('keydown', (event) => {
        if (!looped || event.metaKey || event.ctrlKey || event.altKey)
            return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
            return;
        if (about.classList.contains('is-viewing'))
            return;
        event.preventDefault();
        step(event.key === 'ArrowRight' ? 1 : -1);
    });
    // Tabbed to out of sight: brought in to the left margin.
    track.addEventListener('focusin', (event) => {
        const el = event.target.closest('.about-reel-item');
        if (!looped || !el?.matches(':focus-visible'))
            return;
        const slot = slots.find((s) => s.el === el);
        if (!slot)
            return;
        const x = xAt(slot, along + handTo);
        if (x < 0 || x + slot.width > span) {
            handTo += x;
            settle();
        }
    });
    // A sideways scroll — a trackpad's, or shift and the wheel — runs the reel.
    track.addEventListener('wheel', (event) => {
        if (!looped)
            return;
        const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
        if (!dx || Math.abs(dx) < Math.abs(event.shiftKey ? 0 : event.deltaY))
            return;
        event.preventDefault();
        handTo += dx * (event.deltaMode === 1 ? 16 : 1);
        hand = handTo;
        place();
    }, { passive: false });
    let press = null;
    let draggedAt = -Infinity;
    track.addEventListener('pointerdown', (event) => {
        if (!looped || event.button !== 0)
            return;
        press = { id: event.pointerId, x: event.clientX, y: event.clientY, from: handTo, moved: false, lastX: event.clientX, lastT: event.timeStamp, speed: 0 };
    });
    track.addEventListener('pointermove', (event) => {
        if (!press || event.pointerId !== press.id)
            return;
        const dx = event.clientX - press.x;
        const dy = event.clientY - press.y;
        if (!press.moved) {
            if (Math.abs(dy) > REEL_DRAG_PX && Math.abs(dy) > Math.abs(dx)) {
                press = null;
                return;
            }
            if (Math.abs(dx) < REEL_DRAG_PX)
                return;
            press.moved = true;
            track.setPointerCapture(event.pointerId);
            reel.classList.add('is-dragging');
        }
        const dt = Math.max(1, event.timeStamp - press.lastT);
        press.speed = 0.7 * ((press.lastX - event.clientX) / dt) + 0.3 * press.speed;
        press.lastX = event.clientX;
        press.lastT = event.timeStamp;
        hand = handTo = press.from - dx;
        place();
    });
    const release = (event) => {
        if (!press || event.pointerId !== press.id)
            return;
        if (press.moved) {
            draggedAt = event.timeStamp;
            reel.classList.remove('is-dragging');
            // Still moving when let go: carried on the way it was going.
            if (event.timeStamp - press.lastT < 80)
                handTo += press.speed * REEL_FLING_MS;
            settle();
        }
        press = null;
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    // The click that ends a drag opens nothing.
    track.addEventListener('click', (event) => {
        if (event.timeStamp - draggedAt > 400)
            return;
        draggedAt = -Infinity;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, { capture: true });
    return {
        get span() { return span; },
        get gap() { return gap; },
        measure,
        reset() {
            cancelAnimationFrame(frame);
            frame = 0;
            hand = handTo = 0;
        },
        scrolled(e, a) {
            entry = Math.max(0, e);
            along = looped ? a : 0;
            place();
        },
    };
}
/**
 * The keys that scroll a page, scrolling the panel. Focus opens on the Close
 * link, which stands outside the panel, so the keys would go to the window —
 * which is locked while About is up — rather than to the panel.
 * Not while a field, a button or the photograph viewer has the keys.
 */
function keyScroll(about, event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
        return;
    if (about.classList.contains('is-viewing'))
        return;
    const target = event.target;
    if (target.closest('input, textarea, select, button, [contenteditable]'))
        return;
    const page = about.clientHeight * 0.85;
    const by = {
        PageDown: page, PageUp: -page, ArrowDown: 60, ArrowUp: -60,
        ' ': event.shiftKey ? -page : page,
        Home: -about.scrollHeight, End: about.scrollHeight,
    };
    const delta = by[event.key];
    if (delta === undefined || (event.shiftKey && event.key !== ' '))
        return;
    event.preventDefault();
    about.scrollBy({ top: delta, behavior: 'smooth' });
}
/**
 * Every word in an element wrapped in a span, wherever it stands — inside a
 * link or an emphasis just as well — so the text keeps its markup, its spaces
 * and its justification, and only gains handles.
 */
function splitWords(root) {
    const words = [];
    const texts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
        texts.push(node);
    for (const text of texts) {
        const parts = (text.nodeValue ?? '').split(/(\s+)/);
        if (parts.every((p) => !p || /^\s+$/.test(p)))
            continue;
        const frag = document.createDocumentFragment();
        for (const part of parts) {
            if (!part)
                continue;
            if (/^\s+$/.test(part)) {
                frag.append(part);
                continue;
            }
            const span = document.createElement('span');
            span.className = 'about-word';
            span.textContent = part;
            words.push(span);
            frag.append(span);
        }
        text.replaceWith(frag);
    }
    return words;
}
/**
 * The photographs open large over the page, one at a time: a click anywhere or
 * Escape puts them away, the chevrons, the arrow keys and a swipe step through
 * them and wrap. Escape is caught before the panel hears it, so putting a
 * photograph away does not close About as well; and the panel holds still
 * while one is up. Focus goes back to the photograph last shown.
 */
function initViewer(about) {
    const viewer = about.querySelector('[data-about-viewer]');
    const plate = viewer?.querySelector('[data-about-plate]');
    const items = [...about.querySelectorAll('.about-reel-item:not([data-clone])')];
    if (!viewer || !plate || !items.length)
        return;
    const count = viewer.querySelector('[data-about-count]');
    // The chevrons stand beside the panel (components/layout.ts), and are only
    // there when there is more than one photograph to step through.
    const steps = [...document.querySelectorAll('[data-about-step]')];
    let at = -1;
    const draw = (i) => {
        at = (i + items.length) % items.length;
        const picture = items[at].querySelector('picture');
        if (!picture)
            return;
        const copy = picture.cloneNode(true);
        // The row's sources are chosen for a thumbnail; asked again for the screen.
        for (const el of copy.querySelectorAll('source, img'))
            el.setAttribute('sizes', '82vw');
        const img = copy.querySelector('img');
        img?.setAttribute('loading', 'eager');
        img?.removeAttribute('fetchpriority');
        plate.replaceChildren(copy);
        if (count) {
            count.textContent = (count.dataset.template ?? '{n} / {total}')
                .replace('{n}', String(at + 1))
                .replace('{total}', String(items.length));
        }
    };
    const open = (i) => {
        draw(i);
        viewer.hidden = false;
        void viewer.offsetWidth;
        viewer.classList.add('is-open');
        about.classList.add('is-viewing');
        viewer.tabIndex = -1;
        viewer.focus({ preventScroll: true });
    };
    const close = (restore = true) => {
        if (viewer.hidden)
            return;
        viewer.classList.remove('is-open');
        viewer.hidden = true;
        about.classList.remove('is-viewing');
        if (restore)
            items[at]?.focus({ preventScroll: true });
    };
    items.forEach((item, i) => item.addEventListener('click', () => open(i)));
    viewer.addEventListener('click', () => close());
    for (const step of steps)
        step.addEventListener('click', () => draw(at + Number(step.dataset.aboutStep)));
    document.addEventListener('keydown', (event) => {
        if (viewer.hidden)
            return;
        if (event.key === 'Escape')
            close();
        else if (event.key === 'ArrowRight')
            draw(at + 1);
        else if (event.key === 'ArrowLeft')
            draw(at - 1);
        else if (event.key === 'Tab') {
            // Kept to the viewer: its two chevrons, or itself when there is one
            // photograph and so nothing to step to.
            const stops = steps.length ? steps : [viewer];
            const i = stops.indexOf(document.activeElement);
            stops[(i + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
        }
        else
            return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, { capture: true });
    let from = null;
    viewer.addEventListener('touchstart', (e) => { from = e.touches[0]?.clientX ?? null; }, { passive: true });
    viewer.addEventListener('touchend', (e) => {
        const to = e.changedTouches[0]?.clientX;
        if (from === null || to === undefined)
            return;
        const dx = to - from;
        from = null;
        if (Math.abs(dx) < 48)
            return;
        e.preventDefault();
        draw(at + (dx < 0 ? 1 : -1));
    });
    // Closing About with a photograph up puts the photograph away too — without
    // taking focus back into the panel that is closing.
    new MutationObserver(() => {
        if (!about.classList.contains('is-open'))
            close(false);
    }).observe(about, { attributes: true, attributeFilter: ['class'] });
}
