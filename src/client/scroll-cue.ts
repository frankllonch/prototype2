/**
 * The scroll hint goes once it has been taken.
 *
 * A cue that stays put is no longer a cue — it becomes a fixture, and on these
 * two pages it would sit over the paintings and over the names for as long as
 * the reader kept going. So it leaves on the first real movement of the page
 * and does not come back, because by then its question has been answered.
 *
 * The threshold is a tenth of the screen rather than a pixel: a trackpad's
 * smallest flick, a bounce at the top on a phone, or a browser restoring the
 * scroll by a few pixels should not count as having read it.
 *
 * The class goes on the root rather than on the cue, so the stylesheet decides
 * what to do with it, and so a page that restores mid-document never shows the
 * cue at all — the first `update` runs before any scrolling of its own.
 */
export function initScrollCue(): void {
  if (!document.querySelector('[data-scroll-cue]')) return;

  const root = document.documentElement;
  let gone = false;

  const update = () => {
    if (gone) return;
    if (window.scrollY < window.innerHeight * 0.1) return;
    gone = true;
    root.classList.add('is-scrolled');
    window.removeEventListener('scroll', update);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
}
