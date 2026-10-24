/**
 * Choosing which picture of a work is on the plate.
 *
 * A work can have more than one picture — the cut-out, the photograph it was
 * cut from, further views — and the page renders all of them into the plate,
 * one shown and the rest kept out of layout, with a small picture for each
 * underneath. This swaps which one is shown. Nothing is loaded or built here:
 * the plate already holds every picture, and a hidden one with lazy loading
 * fetches itself the moment it is shown.
 *
 * The lean needs nothing from this. It measures the plate when the pointer
 * arrives, and the plate's box is the box of whatever is shown at that moment.
 *
 * With scripting off the plate shows the first picture and the small ones are
 * buttons that do nothing, which is a page with one picture — complete, if
 * less than it could be.
 */
/** Resolves once the picture's bytes are in — at once if they already are. */
const loaded = (img: HTMLImageElement) => new Promise<void>((resolve) => {
  if (img.complete && img.naturalWidth > 0) { resolve(); return; }
  const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
  img.addEventListener('load', done);
  img.addEventListener('error', done);
});

export function initViews(): void {
  for (const stage of document.querySelectorAll<HTMLElement>('.detail-stage')) {
    const views = [...stage.querySelectorAll<HTMLElement>('.detail-view')];
    const thumbs = [...stage.querySelectorAll<HTMLButtonElement>('.detail-thumb')];
    if (views.length < 2 || thumbs.length !== views.length) continue;

    const inner = stage.querySelector<HTMLElement>('.detail-plate-inner');
    const swap = (n: number) => {
      views.forEach((view, i) => view.classList.toggle('is-shown', i === n));
      // Only the cut-out leans. Putting a photograph on the plate tells the
      // tilt to stand down, and drops any lean the cut-out was holding.
      if (inner) {
        inner.classList.toggle('is-photo', !views[n]?.hasAttribute('data-plate'));
        inner.classList.remove('is-tilting');
        inner.style.transform = '';
      }
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('is-shown', i === n);
        thumb.setAttribute('aria-pressed', String(i === n));
      });
    };

    /*
     * Fetched and decoded before it is swapped in. A picture kept out of layout
     * has no size until its bytes arrive, so shown bare it collapses the plate
     * to nothing for as long as the download takes — and lazily loaded, it
     * would not even start, since a box of no size never enters the viewport.
     * The one on the plate stays until the next is ready, and the swap is a
     * single frame. The latest choice wins over a slower earlier one.
     */
    let chosen = 0;
    const show = async (n: number) => {
      const stamp = ++chosen;
      const img = views[n]?.querySelector('img');
      if (img) {
        img.loading = 'eager';
        // The bytes are the condition: with them the picture has a size and
        // the plate cannot collapse. Decoding first spares a blank frame and is
        // only a courtesy — `decode()` settles on a rendering opportunity and
        // a tab that is not getting any would hold the swap for ever.
        await loaded(img);
        await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 250))]);
      }
      if (stamp === chosen) swap(n);
    };

    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => { void show(i); }));
  }
}
