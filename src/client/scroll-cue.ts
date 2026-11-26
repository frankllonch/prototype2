import { scrollWrites } from './env.ts';
import { glide, topOf } from './glide.ts';
import { SCROLL_SPAN } from './stack.ts';
import { WRITE_MS, writtenPoint } from './write.ts';

/** The scroll hint goes once it has been taken. */
/** The tap down the Colour Chart's run: long enough to watch it type. */
const CHART_TYPE_MS = 2600;

export function initScrollCue(): void {
  const cue = document.querySelector<HTMLElement>('[data-scroll-cue]');
  if (!cue) return;

  const root = document.documentElement;
  let gone = false;

  let threshold = () => window.innerHeight * 0.1;

  // Asked at each scroll rather than once: a phone turned upright mid-page starts writing, and one
  // turned on its side stops.
  const write = document.querySelector<HTMLElement>('.wc-write');
  if (write) {
    let end = 0;
    const measure = () => {
      const pull = Number.parseFloat(getComputedStyle(write).marginBottom) || 0;
      // Not when the names first peek over the edge but when they have properly risen — half a
      // screen — so a link arrival, which lands with the sentence written and the names just
      // below, still shows the cue.
      end = write.offsetTop + write.offsetHeight + pull - window.innerHeight * 0.5;
    };
    measure();
    window.addEventListener('resize', measure);
    threshold = () => (scrollWrites() ? Math.max(end, window.innerHeight * 0.1) : window.innerHeight * 0.1);
  }

  /*
   * The Colour Chart's opening is typed by the scroll (client/chart.ts), and a
   * tap on the cue carries the page down that run slowly enough to watch the
   * words come.
   */
  const chart = document.querySelector<HTMLElement>('[data-chart]');
  const chartEnd = () => Number.parseFloat(chart?.dataset.chartEnd ?? '');
  if (chart) {
    threshold = () => Math.max(
      document.documentElement.scrollHeight - window.innerHeight - 2,
      window.innerHeight * 0.1,
    );
  }

  /*
   * The gallery's opening is one long "keep going" too: the cue asks until the
   * scroll has laid every painting into the grid, and asks again whenever the
   * reader comes back up and they gather (below).
   */
  if (document.querySelector('[data-stack]')) {
    threshold = () => (document.querySelector('[data-hero]')
      ? window.innerHeight * SCROLL_SPAN - 2
      : window.innerHeight * 0.1);
  }

  const update = () => {
    if (gone) return;
    if (window.scrollY < threshold()) return;
    gone = true;
    root.classList.add('is-scrolled');
    window.removeEventListener('scroll', update);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });

  /*
   * Clicked, the cue goes where it points: on to the next part of the page, by
   * the site's own glide.
   */
  cue.addEventListener('click', () => {
    const y = window.scrollY;
    const h = window.innerHeight;
    const stops: [number, number?][] = [];
    if (write) {
      const written = writtenPoint();
      if (written !== null) stops.push([written, WRITE_MS]);
      const names = document.getElementById('whats-color');
      if (names) stops.push([topOf(names)]);
    } else if (chart && Number.isFinite(chartEnd())) {
      stops.push([chartEnd(), CHART_TYPE_MS]);
    } else if (document.querySelector('[data-hero]')) {
      stops.push([h * SCROLL_SPAN]);
    }
    const next = stops.find(([at]) => at > y + h * 0.05);
    if (next) glide(next[0], next[1]);
    else glide(y + h * 0.9);
  });

  /* Back on a blank stage — the menu's What's Color? */
  const again = () => {
    if (!gone) return;
    gone = false;
    root.classList.remove('is-scrolled');
    window.addEventListener('scroll', update, { passive: true });
  };
  document.addEventListener('cueagain', again);
  // The gallery's paintings gathering again (client/stack.ts).
  document.addEventListener('stackrestart', again);
}
