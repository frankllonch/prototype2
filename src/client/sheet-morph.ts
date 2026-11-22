import { phone, reduceMotion } from './env.ts';

/**
 * The round button on a sheet, drawn as a move rather than a cut.
 *
 * Pressing it used to swap one layout for the other in a frame: the
 * photograph gone, the text suddenly twice as wide, the masthead folded. Here
 * the photograph blurs away (or back in), and the text column is drawn
 * through every width in between — a real width, not a stretched picture of
 * one — so the lines re-break as it goes, the way a paragraph in a word
 * processor rearranges while its margin is dragged (Frank, 2026-11-22).
 *
 * How: measure where things are, change the layout in one step, measure again.
 * The prose is then given its old width and eased to its new one, so the
 * browser re-wraps it at every frame; the text column spans the whole sheet
 * while that runs, so a narrowing column is never cut at its new edge before
 * the lines have come in. The masthead, the button and the text's top travel
 * to their new places as transforms, as the grid's paintings do
 * (`controls.ts`).
 *
 * Every figure here is in one place to tune: how long, how blurred, the curve.
 */
const FLOW_MS = 1000;   // the margin travelling across
const FADE_MS = 520;    // the photograph going out or coming in
const BLUR = 'blur(28px)';
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
  const all = [prose, text, ...held, ...(stage ? [stage] : [])];

  // Measured mid-flight too, so a second press turns back from where it is.
  const was = held.map((el) => el.getBoundingClientRect());
  const wasTop = text.getBoundingClientRect().top;
  const wasWidth = prose.getBoundingClientRect().width;
  const wasStage = stage ? Number(getComputedStyle(stage).opacity) : 1;

  for (const el of all) for (const a of ours(el)) a.cancel();
  stage?.classList.remove('is-leaving');
  text.style.gridColumn = '';

  change();
  const wide = sheet.classList.contains('is-wide-text');

  const nowWidth = prose.getBoundingClientRect().width;
  const nowTop = text.getBoundingClientRect().top;
  const now = held.map((el) => el.getBoundingClientRect());

  // Widening, the photograph goes first and the text follows a beat behind;
  // narrowing, the text makes room and the photograph comes into it.
  const delay = wide ? 120 : 0;
  const timing: KeyframeAnimationOptions = { id: ID, duration: FLOW_MS, delay, easing: EASE, fill: 'backwards' };

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
  if (wide) {
    // Kept on screen (07-sheet.css, `.is-leaving`) for as long as it takes to go.
    stage.classList.add('is-leaving');
    stage.animate(
      [{ opacity: wasStage, filter: 'blur(0px)' }, { opacity: 0, filter: BLUR }],
      { id: ID, duration: FADE_MS, easing: 'ease-in', fill: 'forwards' },
    ).finished.then((a) => { stage.classList.remove('is-leaving'); a.cancel(); }, () => {});
  } else {
    stage.animate(
      [{ opacity: wasStage < 1 ? wasStage : 0, filter: BLUR }, { opacity: 1, filter: 'blur(0px)' }],
      { id: ID, duration: FADE_MS + 280, delay: FLOW_MS * 0.45, easing: 'ease-out', fill: 'backwards' },
    );
  }
}
