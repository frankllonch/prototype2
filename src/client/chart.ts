import { reduceMotion } from './env.ts';
import { initReel, type Loop } from './about.ts';

/** The Colour Chart's opening. */

/** After the page's own entrance, so the words are not typed behind a veil. */
const WAIT_MS = 350;

/** At most one word every this many milliseconds. Less is faster typing. */
const WORD_MS = 24;

/**
 * And once the reader has scrolled past the end of the run, the words still owed
 * are typed at this pace, so the statement is finished before anything under it
 * comes in.
 */
const CATCH_UP_MS = 10;

/** How much scroll the reader types with, per word, in screens. */
const PER_WORD = 0.02;
const RUN_MIN = 0.6;

/** Each column comes in this much later than the one to its left, at most. */
const STAGGER_MS = 260;

/** The photographs. */
const REEL_LEAD = 0.1;
const REEL_HOLD = 0.6;
const REEL_DRIFT = 0.8;
/** How quickly the reel catches up with where the scroll has it. */
const REEL_SETTLE_MS = 70;
/** And how gently it comes in for a reader already past it as it starts. */
const REEL_ARRIVE_MS = 320;

export function initChart(): void {
  const chart = document.querySelector<HTMLElement>('[data-chart]');
  if (!chart) return;
  const typed = chart.querySelector<HTMLElement>('[data-chart-type]');
  const opening = chart.querySelector<HTMLElement>('[data-chart-opening]');
  const stage = chart.querySelector<HTMLElement>('[data-chart-stage]');
  const pops = [...chart.querySelectorAll<HTMLElement>('.chart-in')];

  const done = () => chart.classList.add('is-typed');
  const reel = initChartReel(chart);
  const hold = chart.querySelector<HTMLElement>('[data-chart-hold]');
  const held = chart.querySelector<HTMLElement>('[data-chart-held]');

  if (reduceMotion.matches || !typed || !opening || !stage || !('IntersectionObserver' in window)) {
    done();
    for (const el of pops) el.classList.add('is-in');
    reel?.still();
    return;
  }

  /* -------------------------------------------------------- the fade-ins */

  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const across = entry.boundingClientRect.left / Math.max(1, window.innerWidth);
        el.style.setProperty('--pop-delay', `${Math.round(Math.max(0, across) * STAGGER_MS)}ms`);
        el.classList.add('is-in');
        seen.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -2% 0px' },
  );
  // Nothing under the statement comes in until the statement is finished: the page reads as one
  // sequence, the words and then the rest.
  let watching = false;
  const watch = (landed = false) => {
    if (watching) return;
    watching = true;
    for (const el of pops) seen.observe(el);
    reel?.go(() => reelRun, landed);
    if (landed) return settle();
    lastY = window.scrollY;
    window.addEventListener('scroll', onReturn, { passive: true });
    onReturn();
  };

  /* ------------------------------------------------------------- the words */

  const auto = [...typed.querySelectorAll<HTMLElement>('.chart-title, [data-chart-auto]')];
  const autoWords = auto.flatMap(splitWords);
  const restWords = [...typed.querySelectorAll<HTMLElement>('p:not([data-chart-auto])')].flatMap(splitWords);
  const words = [...autoWords, ...restWords];

  /* --------------------------------------------------------------- the run */

  const runway = document.createElement('div');
  runway.className = 'chart-runway';
  runway.setAttribute('aria-hidden', 'true');
  opening.append(runway);

  const holdRun = document.createElement('div');
  holdRun.setAttribute('aria-hidden', 'true');
  if (reel && hold) {
    hold.append(holdRun);
    hold.classList.add('is-held');
  }

  let run = 1;
  // The opening's place on the page, read off the box that is never held.
  let top = 0;
  // The scroll the reel comes in over.
  let reelRun = { from: 0, to: 1 };
  let settled = false;
  const measure = () => {
    if (settled) return;
    run = Math.round(Math.max(RUN_MIN, restWords.length * PER_WORD) * window.innerHeight);
    runway.style.height = `${run}px`;
    // A stage taller than the screen is held with its foot on the screen's, so the words being
    // typed are always in view.
    stage.style.top = `${Math.min(0, window.innerHeight - stage.offsetHeight)}px`;
    // Where the run ends, for the chevron to carry the reader to.
    top = hold ? hold.getBoundingClientRect().top + window.scrollY : opening.offsetTop;
    chart.dataset.chartEnd = String(top + run);
    if (!reel || !held) return;
    // Held with the photographs a gap above the foot of the screen, or where it stands as the
    // typing ends if they are already higher than that.
    const h = window.innerHeight;
    const gap = Number.parseFloat(getComputedStyle(chart.querySelector('[data-chart-reel]')!).marginTop) || 0;
    const at = Math.min(-run, h - held.offsetHeight - gap);
    holdRun.style.height = `${Math.round(h * REEL_HOLD)}px`;
    hold?.style.setProperty('--hold-top', `${at}px`);
    reelRun = { from: top + run - h * REEL_LEAD, to: top - at + h * REEL_HOLD };
  };
  measure();
  window.addEventListener('resize', measure);
  void document.fonts?.ready.then(measure);

  /* ------------------------------------------------------- once, and done */

  // Everything comes in once, on the way down, and then stays as it is: when the runs are spent,
  // or the reader turns back, they are taken out of the page, with the scroll moved by as much, so
  // nothing on screen moves and nothing is held again on the way up.
  let lastY = 0;
  let idle = 0;
  const settle = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(idle);
    window.removeEventListener('scroll', onReturn);
    const was = stage.getBoundingClientRect().top;
    // Read first: a page made shorter may clamp it.
    const y = window.scrollY;
    const root = document.documentElement;
    root.style.overflowAnchor = 'none';
    runway.remove();
    holdRun.remove();
    hold?.classList.remove('is-held');
    delete chart.dataset.chartEnd;
    window.scrollTo({ top: window.scrollY + stage.getBoundingClientRect().top - was, behavior: 'instant' });
    reel?.settled(y - window.scrollY);
    requestAnimationFrame(() => root.style.removeProperty('overflow-anchor'));
  };
  const onReturn = () => {
    const y = window.scrollY;
    if (y < lastY - 2) return settle();
    lastY = y;
    window.clearTimeout(idle);
    if (y >= (reel ? reelRun.to : top + run)) idle = window.setTimeout(settle, 200);
  };

  /* ------------------------------------------------------------ the typing */

  let shown = 0;
  let target = 0;
  let timer = 0;

  const tick = () => {
    timer = 0;
    if (shown >= target) return;
    words[shown++]?.classList.add('is-written');
    if (shown >= words.length) {
      done();
      watch();
      window.removeEventListener('scroll', onScroll);
      return;
    }
    timer = window.setTimeout(tick, furthest >= run ? CATCH_UP_MS : WORD_MS);
  };
  const aim = (n: number) => {
    // Forwards only: the target never comes back down.
    target = Math.max(target, Math.min(words.length, n));
    if (!timer && shown < target) tick();
  };

  let autoDone = false;
  // The furthest the reader has been down the run.
  let furthest = 0;
  const onScroll = () => {
    furthest = Math.max(furthest, window.scrollY - top);
    // The reader's words follow the clock's: nothing they scroll is typed until the opening has
    // finished typing itself, and then it catches up.
    if (!autoDone) return;
    const share = Math.max(0, Math.min(1, furthest / run));
    aim(autoWords.length + Math.ceil(share * restWords.length));
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // A reload or a back-navigation that lands down the page: it stands typed.
  if (window.scrollY > window.innerHeight * 0.1) {
    autoDone = true;
    target = shown = words.length;
    for (const w of words) w.classList.add('is-written');
    done();
    watch(true);
    return;
  }

  window.setTimeout(() => {
    aim(autoWords.length);
    // When the clock's words are in, whatever the reader has scrolled since is typed after them.
    const wait = () => {
      if (shown < autoWords.length) return void window.setTimeout(wait, WORD_MS);
      autoDone = true;
      onScroll();
    };
    wait();
  }, WAIT_MS);
}

/** The scroll the reel comes in over, in pixels of the page. */
interface ReelRun { from: number; to: number }

/**
 * The reel of photographs between the statement and Order yours: About's loop
 * (client/about.ts), seen through the page to the window's edges, and moved by
 * the window's scroll instead of About's panel's.
 */
function initChartReel(chart: HTMLElement): { still(): void; go(run: () => ReelRun, landed: boolean): void; settled(removed: number): void } | null {
  const el = chart.querySelector<HTMLElement>('[data-chart-reel]');
  if (!el) return null;
  const panel = document.getElementById('chart-photographs');
  el.addEventListener(
    'click',
    (event) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-chart-photo]');
      if (item && panel) panel.dataset.figureStart = item.dataset.chartPhoto ?? '0';
    },
    { capture: true },
  );
  const loop: Loop | null = initReel(chart, document.documentElement);
  if (!loop) return null;
  // Off to the side they would only be asked for as they slide in.
  for (const img of el.querySelectorAll<HTMLImageElement>('img')) img.loading = 'eager';

  let started = false;
  let reelRun = (): ReelRun => ({ from: 0, to: 1 });
  let start = 0;
  // Where the reader's scroll has the reel, eased twice over, so neither its place nor its pace
  // ever jumps.
  let eased = 0;
  let at = 0;
  // Once it has come in, it stays in, and moves round its loop one way as the page goes down and
  // the other as it comes up: `zero` is the scroll at which it stands in its place, `rest` what is
  // left of its way in, `shift` the scroll taken out of the page with the runs.
  let inPlace = false;
  let landed = false;
  let zero = 0;
  let rest = 0;
  let shift = 0;
  let settle = REEL_SETTLE_MS;
  let frame = 0;
  let last = 0;

  const entryAt = (p: number, drift: number) => start - (2 * start - drift) * p + (start - drift) * p * p;
  const place = () => {
    if (inPlace) return loop.scrolled(rest, (at - zero) * REEL_DRIFT);
    const { from, to } = reelRun();
    const run = Math.max(1, to - from);
    const past = at - from;
    if (past >= run) return loop.scrolled(0, (past - run) * REEL_DRIFT);
    // In over the run, slowing to exactly the pace it then drifts at.
    const p = Math.max(0, past / run);
    const drift = Math.min(start, run * REEL_DRIFT);
    loop.scrolled(entryAt(p, drift), 0);
  };

  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(64, now - last);
    last = now;
    const to = window.scrollY + shift;
    settle += (REEL_SETTLE_MS - settle) * (1 - Math.exp(-dt / REEL_ARRIVE_MS));
    const k = 1 - Math.exp(-dt / settle);
    eased += (to - eased) * k;
    at += (eased - at) * k;
    if (Math.abs(to - eased) < 0.1 && Math.abs(to - at) < 0.1) eased = at = to;
    if (rest) {
      // Turned back before it was in: it finishes coming in first.
      rest *= Math.exp(-dt / REEL_ARRIVE_MS);
      if (rest < 0.5) rest = 0;
      zero = at;
    }
    place();
    if (at !== to || rest) frame = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!started || frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const measure = () => {
    if (!loop.measure()) return;
    start = loop.start;
    if (!started) return loop.scrolled(start, 0);
    place();
  };
  measure();
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  void document.fonts?.ready.then(measure);
  for (const img of el.querySelectorAll<HTMLImageElement>('img')) {
    if (!img.complete) img.addEventListener('load', measure, { once: true });
  }

  return {
    still() {
      const still = () => { if (loop.measure()) loop.scrolled(0, 0); };
      window.addEventListener('resize', () => requestAnimationFrame(still));
      still();
    },
    go(run, arrived) {
      if (started) return;
      started = true;
      reelRun = run;
      landed = arrived;
      // Arriving down the page (a reload, Back): it stands in its place.
      eased = at = landed ? reelRun().to : Math.min(window.scrollY, reelRun().from);
      if (!landed) settle = REEL_ARRIVE_MS;
      place();
      window.addEventListener('scroll', schedule, { passive: true });
      schedule();
    },
    settled(removed) {
      const { from, to } = reelRun();
      const run = Math.max(1, to - from);
      shift = removed;
      if (landed) eased = at = window.scrollY + shift;
      zero = landed ? at : Math.min(at, to);
      rest = landed || at >= to ? 0 : entryAt(Math.max(0, (at - from) / run), Math.min(start, run * REEL_DRIFT));
      inPlace = true;
      place();
      schedule();
    },
  };
}

/**
 * Every word in the element wrapped in its own span, in reading order, leaving
 * the markup around them (line breaks, the paragraphs) as it is.
 */
function splitWords(root: HTMLElement): HTMLElement[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);

  const words: HTMLElement[] = [];
  for (const node of nodes) {
    const text = node.textContent ?? '';
    if (!text.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.append(part);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'chart-word';
      span.textContent = part;
      words.push(span);
      frag.append(span);
    }
    node.replaceWith(frag);
  }
  return words;
}
