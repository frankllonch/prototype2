import { phone, reduceMotion } from './env.ts';

/** The round button on a sheet, drawn as a move rather than a cut. */
const FLOW_MS = 1000;   // the margin travelling across
/* In and out, like a hand that takes hold of the margin and lets go of it. */
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
const ID = 'sheet-morph';

const ours = (el: Element) => el.getAnimations().filter((a) => a.id === ID);

export function morphSheet(sheet: HTMLElement, change: () => void): void {
  const prose = sheet.querySelector<HTMLElement>('.sheet-prose');
  const text = sheet.querySelector<HTMLElement>('[data-sheet-text]');
  if (reduceMotion.matches || phone.matches || !prose || !text) { change(); return; }

  const stage = sheet.querySelector<HTMLElement>('.sheet-stage');
  const held = [...sheet.querySelectorAll<HTMLElement>('.sheet-title, .sheet-lines, .sheet-when, .sheet-more')];
  const all = [prose, text, ...held, ...(stage ? [...stage.querySelectorAll<HTMLElement>('.sheet-frame, .sheet-step')] : [])];

  // Measured mid-flight too, so a second press turns back from where it is.
  const was = held.map((el) => el.getBoundingClientRect());
  const wasTop = text.getBoundingClientRect().top;
  const wasWidth = prose.getBoundingClientRect().width;
  // How far the photograph has already been pushed, if a press catches it moving.
  const frame = stage?.querySelector<HTMLElement>('.sheet-frame');
  const wasShift = frame ? new DOMMatrix(getComputedStyle(frame).transform).m41 : 0;

  for (const el of all) for (const a of ours(el)) a.cancel();
  stage?.classList.remove('is-leaving');
  text.style.gridColumn = '';

  change();
  const wide = sheet.classList.contains('is-wide-text');

  const nowWidth = prose.getBoundingClientRect().width;
  const nowTop = text.getBoundingClientRect().top;
  const now = held.map((el) => el.getBoundingClientRect());

  const timing: KeyframeAnimationOptions = { id: ID, duration: FLOW_MS, easing: EASE, fill: 'backwards' };

  text.style.gridColumn = '1 / -1';
  const flow = prose.animate([{ width: `${wasWidth}px` }, { width: `${nowWidth}px` }], timing);
  flow.finished.then(() => { text.style.gridColumn = ''; }, () => {});

  const dy = wasTop - nowTop;
  if (Math.abs(dy) > 0.5) text.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], timing);

  held.forEach((el, i) => {
    const a = was[i]!, b = now[i]!;
    if (!a.width || !b.width) return;
    const x = a.left - b.left, y = a.top - b.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
    el.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }], timing);
  });

  if (!stage) return;
  /*
   * The photograph is pushed: it travels right exactly as far, as fast and on
   * the same curve as the text's right edge, so the growing column shoves it off
   * the sheet, and a narrowing one draws it back in behind its edge.
   */
  const push = nowWidth - wasWidth;
  /*
   * What moves is the photograph and its arrows, each on its own, rather than
   * the stage that holds them: a moved stage would be a group of its own, and
   * the arrows, drawn as the difference of what is under them, would then have
   * nothing under them but the empty stage and go white on the paper.
   */
  const pushed = [...stage.querySelectorAll<HTMLElement>('.sheet-frame, .sheet-step')];
  if (wide) {
    // Kept on screen (07-sheet.css, `.is-leaving`) until it has left it.
    stage.classList.add('is-leaving');
    const runs = pushed.map((el) => el.animate(
      [{ transform: `translateX(${wasShift}px)` }, { transform: `translateX(${wasShift + push}px)` }],
      { ...timing, fill: 'forwards' },
    ));
    Promise.all(runs.map((a) => a.finished)).then(() => {
      stage.classList.remove('is-leaving');
      for (const a of runs) a.cancel();
    }, () => {});
  } else {
    // Back from wherever it was: off the right edge, or part way out.
    const from = wasShift || -push;
    for (const el of pushed) el.animate([{ transform: `translateX(${from}px)` }, { transform: 'none' }], timing);
  }
}
