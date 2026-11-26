import { isPlainClick } from './env.ts';
import { glide } from './glide.ts';
import { nextHue } from './hues.ts';
import { stepState } from './panels.ts';

/** How long after the page opens the name answers, once the list has risen into place. */
const ARRIVE_MS = 900;
/** The pulse itself, as `row-pulse` in 01-grid.css runs it. */
const PULSE_MS = 1000;

/** About's record points at the rows of the Exhibitions list: there, in view, the name lit once. */
export function initLocate(): void {
  const arrived = row(location.hash.slice(1));
  if (arrived) {
    history.replaceState(history.state, '', location.pathname + location.search);
    const place = () => window.scrollTo({ top: centred(arrived), behavior: 'instant' });
    place();
    window.addEventListener('load', place, { once: true });
    window.setTimeout(() => pulse(arrived), ARRIVE_MS);
  }

  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-locate]')) {
    link.addEventListener('click', (event) => {
      const target = row(link.dataset.locate ?? '');
      // On another page: the link goes there, and that page does the rest.
      if (!target || !isPlainClick(event)) return;
      event.preventDefault();
      const stepped = stepState().panel !== undefined;
      document.querySelector<HTMLElement>('.about.is-open ~ [data-panel-close]')?.click();
      const travel = () => { glide(centred(target)); settled(() => pulse(target)); };
      // Closing a panel that stands on a history step puts the page back where it was first.
      if (stepped) window.addEventListener('popstate', () => window.setTimeout(travel, 30), { once: true });
      else travel();
    });
  }
}

function row(id: string): HTMLElement | null {
  const el = id.startsWith('row-') ? document.getElementById(id) : null;
  return el?.classList.contains('xrow') ? el : null;
}

/** Where the page stands with the row at mid-height, read from the layout and not from a list still rising. */
function centred(el: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return Math.max(0, top - (window.innerHeight - el.offsetHeight) / 2);
}

/** Once the page has stopped moving. */
function settled(then: () => void): void {
  const start = performance.now();
  let last = window.scrollY;
  let still = start;
  const watch = () => {
    const now = performance.now();
    if (window.scrollY !== last) { last = window.scrollY; still = now; }
    if ((now - still > 140 && now - start > 300) || now - start > 3200) then();
    else requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
}

function pulse(el: HTMLElement): void {
  const n = nextHue();
  if (n >= 0) el.style.setProperty('--row-pulse', `var(--hue-${n})`);
  el.classList.remove('is-located');
  void el.offsetWidth;
  el.classList.add('is-located');
  window.setTimeout(() => el.classList.remove('is-located'), PULSE_MS + 100);
}
