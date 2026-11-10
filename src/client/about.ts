import { reduceMotion } from './env.ts';

/**
 * About, told in four parts as you scroll down it.
 *
 * 1. Opening it scrolls itself down the lead's stretch, so the capitals lead is
 *    written word by word in front of you and stands complete. The start
 *    page's chevron asks for more from the moment it opens until the end. The lead holds its place throughout,
 *    and is written by the scroll, not by a clock: scrolling back up unwrites
 *    it, and down again writes it again.
 * 2. Still held, the row of photographs is driven in from the side of the
 *    screen and comes to rest under the lead — centred if it fits, with the
 *    last photograph at the right margin if it does not.
 * 3. The hold lets go and the biography is written as it rises: a word appears
 *    when its place on the page reaches the writing line, so the writing keeps
 *    pace with the reader rather than with a clock.
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
 * left as it is; the photographs still open large.
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

/** Where on the screen the biography is written: this far down. */
const WRITE_LINE = 0.8;

/** Each column comes in this much later than the one to its left, at most. */
const POP_STAGGER_MS = 260;

export function initAbout(): void {
  const about = document.getElementById('about');
  if (!about) return;
  initViewer(about);
  if (reduceMotion.matches) return;

  const sheet = about.querySelector<HTMLElement>('.about-sheet');
  const opening = about.querySelector<HTMLElement>('[data-about-opening]');
  const stage = about.querySelector<HTMLElement>('[data-about-stage]');
  const leadEl = about.querySelector<HTMLElement>('.about-lead');
  if (!sheet || !opening || !stage || !leadEl) return;
  const reel = about.querySelector<HTMLElement>('[data-about-reel]');
  const track = about.querySelector<HTMLElement>('[data-about-track]');
  const cue = about.querySelector<HTMLElement>('[data-about-cue]');

  const lead = splitWords(leadEl);
  const body = [...about.querySelectorAll<HTMLElement>('.about-text > p:not(.about-lead)')].flatMap(splitWords);
  const pops = [
    ...about.querySelectorAll<HTMLElement>(
      '.about-label, .about-show, .about-collection, .about-contact, .about-foot',
    ),
  ];
  for (const el of pops) el.classList.add('about-pop');
  about.classList.add('is-staged');

  // What the measuring settles, in pixels of the panel's own scroll.
  let leadRun = 1;
  let reelFrom = 0;
  let reelRun = 1;
  let reelStart = 0;
  let reelRest = 0;
  let marks: number[] = [];

  // What has been shown.
  let leadShown = 0;
  let bodyShown = 0;
  let glided = false;
  let glide = 0;
  let glideTimer = 0;
  let frame = 0;
  let pops$: IntersectionObserver | null = null;

  const show = (words: HTMLElement[], from: number, to: number, on: boolean) => {
    for (let i = from; i < to; i++) words[i]?.classList.toggle('is-written', on);
  };
  const setLead = (n: number) => {
    n = Math.max(0, Math.min(lead.length, n));
    if (n > leadShown) show(lead, leadShown, n, true);
    else if (n < leadShown) show(lead, n, leadShown, false);
    leadShown = n;
  };
  const setBody = (n: number) => {
    if (n > bodyShown) show(body, bodyShown, n, true);
    else if (n < bodyShown) show(body, n, bodyShown, false);
    bodyShown = n;
  };

  const measure = () => {
    if (!about.classList.contains('is-open')) return;
    const height = about.clientHeight;
    const width = about.clientWidth;
    // Wherever the reader is now, they are there again when this is done: a
    // new runway changes the page's length, and the browser would otherwise
    // clamp or re-anchor the scroll.
    const y = about.scrollTop;
    const top = about.getBoundingClientRect().top - y;
    const contentY = (el: Element) => el.getBoundingClientRect().top - top;

    // The stage holds where it stands, or as high as it must to fit. Where it
    // stands is the runway's top — the stage is the runway's first child —
    // which, unlike the stage, does not move while the stage is held.
    const stageTop = contentY(opening);
    const stageHeight = stage.offsetHeight;
    stage.style.setProperty('--stage-top', `${Math.min(stageTop, height - stageHeight)}px`);

    leadRun = height * Math.min(LEAD_MAX, Math.max(LEAD_MIN, lead.length * LEAD_PER_WORD));

    if (reel && track) {
      const reelWidth = reel.clientWidth;
      // The text's margin, read off the laid-out page (--m is a formula).
      const margin = Math.max(0, leadEl.getBoundingClientRect().left - reel.getBoundingClientRect().left);
      const trackWidth = track.scrollWidth;
      reelStart = reelWidth;
      reelRest = trackWidth <= reelWidth - 2 * margin ? (reelWidth - trackWidth) / 2 : reelWidth - margin - trackWidth;
      reelRun = Math.max(height * REEL_MIN, reelStart - reelRest);
    } else {
      reelRun = 0;
    }
    reelFrom = leadRun;
    opening.style.height = `${stageHeight + leadRun + reelRun}px`;
    if (about.scrollTop !== y) about.scrollTop = y;

    // The biography: each word's turn comes when its place reaches the writing
    // line — a line's first word as the line does, its last a line-height
    // later — so the writing runs along each line and down the paragraph.
    const column = sheet.querySelector<HTMLElement>('.about-text');
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
      for (const el of pops) if (!el.classList.contains('is-in')) { el.classList.add('is-in'); pops$?.unobserve(el); }
    }
    if (track && reelRun) {
      const p = Math.min(1, Math.max(0, (y - reelFrom) / reelRun));
      const eased = 1 - (1 - p) * (1 - p);
      track.style.transform = `translate3d(${reelStart + (reelRest - reelStart) * eased}px, 0, 0)`;
    }
    // The count of marks at or above this scroll: they only ever rise.
    let lo = 0;
    let hi = marks.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (marks[mid]! <= y) lo = mid + 1;
      else hi = mid;
    }
    setBody(lo);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
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
    if (from > 2) return endGlide();
    const to = leadRun;
    const began = performance.now();
    let placed = from;
    const step = (now: number) => {
      // Moved by anything but the glide — the scrollbar dragged, a key, a
      // script — and the glide gives way rather than pulling it back.
      if (Math.abs(about.scrollTop - placed) > 2) return endGlide();
      const t = Math.min(1, (now - began) / GLIDE_MS);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      about.scrollTop = from + (to - from) * e;
      placed = about.scrollTop;
      if (t < 1) glide = requestAnimationFrame(step);
      else endGlide();
    };
    glide = requestAnimationFrame(step);
  };
  for (const kind of ['wheel', 'touchstart', 'pointerdown'] as const) {
    about.addEventListener(kind, () => { if (!glided) endGlide(); }, { passive: true });
  }
  document.addEventListener('keydown', () => {
    if (!glided && about.classList.contains('is-open')) endGlide();
  });

  const start = () => {
    endGlide();
    glided = false;
    cue?.classList.add('is-shown');
    setLead(0);
    setBody(0);
    // The photographs are lazy, and off to the side they would only be asked
    // for as they slide in. Asked for now.
    for (const img of about.querySelectorAll<HTMLImageElement>('.about-reel img')) img.loading = 'eager';
    for (const el of pops) {
      el.classList.remove('is-in');
      el.style.removeProperty('--pop-delay');
    }
    pops$?.disconnect();
    pops$ = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const sheetBox = sheet.getBoundingClientRect();
          const across = (entry.boundingClientRect.left - sheetBox.left) / Math.max(1, sheetBox.width);
          el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * POP_STAGGER_MS)}ms`);
          el.classList.add('is-in');
          pops$?.unobserve(el);
        }
      },
      { root: about, rootMargin: '0px 0px -8% 0px' },
    );
    for (const el of pops) pops$.observe(el);
    measure();
    glideTimer = window.setTimeout(runGlide, GLIDE_DELAY_MS);
  };

  about.addEventListener('scroll', schedule, { passive: true });
  about.addEventListener('keydown', (event) => keyScroll(about, event));
  about.addEventListener('panelopen', start);
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  void document.fonts?.ready.then(measure);
  for (const img of about.querySelectorAll<HTMLImageElement>('.about-reel img')) {
    if (!img.complete) img.addEventListener('load', measure, { once: true });
  }
  // Closing stops the glide; the next opening starts it again from the top.
  new MutationObserver(() => {
    if (!about.classList.contains('is-open')) endGlide();
  }).observe(about, { attributes: true, attributeFilter: ['class'] });
  // Served open — a #about arrival, or WordPress's /about/ — the panel was
  // raised before this ran, and its `panelopen` has already gone by.
  if (about.classList.contains('is-open')) start();
}

/**
 * The keys that scroll a page, scrolling the panel. Focus opens on the Close
 * link, which is fixed, and a fixed element hands its keys to the window —
 * which is locked while About is up — rather than to the panel it sits in.
 * Not while a field, a button or the photograph viewer has the keys.
 */
function keyScroll(about: HTMLElement, event: KeyboardEvent): void {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (about.classList.contains('is-viewing')) return;
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, button, [contenteditable]')) return;
  const page = about.clientHeight * 0.85;
  const by: Record<string, number> = {
    PageDown: page, PageUp: -page, ArrowDown: 60, ArrowUp: -60,
    ' ': event.shiftKey ? -page : page,
    Home: -about.scrollHeight, End: about.scrollHeight,
  };
  const delta = by[event.key];
  if (delta === undefined || (event.shiftKey && event.key !== ' ')) return;
  event.preventDefault();
  about.scrollBy({ top: delta, behavior: 'smooth' });
}

/**
 * Every word in an element wrapped in a span, wherever it stands — inside a
 * link or an emphasis just as well — so the text keeps its markup, its spaces
 * and its justification, and only gains handles.
 */
function splitWords(root: HTMLElement): HTMLElement[] {
  const words: HTMLElement[] = [];
  const texts: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node as Text);
  for (const text of texts) {
    const parts = (text.nodeValue ?? '').split(/(\s+)/);
    if (parts.every((p) => !p || /^\s+$/.test(p))) continue;
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
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
function initViewer(about: HTMLElement): void {
  const viewer = about.querySelector<HTMLElement>('[data-about-viewer]');
  const plate = viewer?.querySelector<HTMLElement>('[data-about-plate]');
  const items = [...about.querySelectorAll<HTMLButtonElement>('.about-reel-item')];
  if (!viewer || !plate || !items.length) return;
  const count = viewer.querySelector<HTMLElement>('[data-about-count]');
  viewer.classList.toggle('is-single', items.length < 2);

  let at = -1;

  const draw = (i: number) => {
    at = (i + items.length) % items.length;
    const picture = items[at]!.querySelector('picture');
    if (!picture) return;
    const copy = picture.cloneNode(true) as HTMLElement;
    // The row's sources are chosen for a thumbnail; asked again for the screen.
    for (const el of copy.querySelectorAll('source, img')) el.setAttribute('sizes', '82vw');
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

  const open = (i: number) => {
    draw(i);
    viewer.hidden = false;
    void viewer.offsetWidth;
    viewer.classList.add('is-open');
    about.classList.add('is-viewing');
    viewer.tabIndex = -1;
    viewer.focus({ preventScroll: true });
  };

  const close = (restore = true) => {
    if (viewer.hidden) return;
    viewer.classList.remove('is-open');
    viewer.hidden = true;
    about.classList.remove('is-viewing');
    if (restore) items[at]?.focus({ preventScroll: true });
  };

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));

  viewer.addEventListener('click', (event) => {
    const step = (event.target as Element).closest<HTMLElement>('[data-about-step]');
    if (step) draw(at + Number(step.dataset.aboutStep));
    else close();
  });

  document.addEventListener(
    'keydown',
    (event) => {
      if (viewer.hidden) return;
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowRight') draw(at + 1);
      else if (event.key === 'ArrowLeft') draw(at - 1);
      else if (event.key === 'Tab') {
        // Kept to the viewer: its two chevrons, or itself when there is one
        // photograph and so nothing to step to.
        const stops = items.length > 1 ? [...viewer.querySelectorAll<HTMLElement>('[data-about-step]')] : [viewer];
        const i = stops.indexOf(document.activeElement as HTMLElement);
        stops[(i + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
      } else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );

  let from: number | null = null;
  viewer.addEventListener('touchstart', (e) => { from = e.touches[0]?.clientX ?? null; }, { passive: true });
  viewer.addEventListener('touchend', (e) => {
    const to = e.changedTouches[0]?.clientX;
    if (from === null || to === undefined) return;
    const dx = to - from;
    from = null;
    if (Math.abs(dx) < 48) return;
    e.preventDefault();
    draw(at + (dx < 0 ? 1 : -1));
  });

  // Closing About with a photograph up puts the photograph away too — without
  // taking focus back into the panel that is closing.
  new MutationObserver(() => {
    if (!about.classList.contains('is-open')) close(false);
  }).observe(about, { attributes: true, attributeFilter: ['class'] });
}
