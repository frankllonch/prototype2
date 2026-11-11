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

/*
 * Where the paint is.
 *
 * A cut-out is the painting on a transparent canvas of one fixed shape, so a
 * landscape work arrives with a band of nothing above and below it, and the
 * picture's box is not the painting's. The page is laid out from the painting:
 * its size on the plate, the caption that runs from its top edge to its
 * bottom edge, the small pictures under it. This reads the transparency once
 * per picture, at a few hundred pixels — a pixel there is a fraction of one
 * on the plate — and hands back the painted rectangle as shares of the whole.
 * A photograph, or anything that cannot be read, is painted edge to edge.
 */
interface Ink { readonly l: number; readonly t: number; readonly r: number; readonly b: number }
const EDGE_TO_EDGE: Ink = { l: 0, t: 0, r: 1, b: 1 };
const inks = new Map<string, Ink>();

function inkOf(img: HTMLImageElement): Ink {
  const key = img.currentSrc || img.src;
  const known = inks.get(key);
  if (known) return known;
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return EDGE_TO_EDGE;
  const SIDE = 360;
  const cw = w >= h ? SIDE : Math.max(1, Math.round((SIDE * w) / h));
  const ch = w >= h ? Math.max(1, Math.round((SIDE * h) / w)) : SIDE;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return EDGE_TO_EDGE;
  let data: Uint8ClampedArray;
  try {
    g.drawImage(img, 0, 0, cw, ch);
    data = g.getImageData(0, 0, cw, ch).data;
  } catch {
    return EDGE_TO_EDGE;
  }
  // The painting's edge is where its feathered cut is half there: that is the
  // edge the eye sees, so it is the one the caption is centred against and the
  // gaps are measured from. The faint part of the feather still shows, just
  // outside the box (05-artwork.css, overflow-clip-margin).
  const SOLID = 128;
  let l = cw, t = ch, r = -1, b = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (data[(y * cw + x) * 4 + 3]! > SOLID) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
    }
  }
  const ink = r < 0 ? EDGE_TO_EDGE : { l: l / cw, t: t / ch, r: (r + 1) / cw, b: (b + 1) / ch };
  inks.set(key, ink);
  return ink;
}

/**
 * Sizes a picture so its painted part fits `maxW` × `maxH`, and makes `frame`
 * exactly that painted part: the transparent margin hangs outside it, unseen
 * and taking no room, so everything laid out against the frame is laid out
 * against the painting.
 */
function fit(frame: HTMLElement, img: HTMLImageElement, ink: Ink, maxW: number, maxH: number): boolean {
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw || !nh || !maxH) return false;
  const iw = (ink.r - ink.l) * nw, ih = (ink.b - ink.t) * nh;
  const s = Math.min(maxW / iw, maxH / ih);
  const W = nw * s, H = nh * s;
  Object.assign(img.style, {
    width: `${W}px`, height: `${H}px`, maxWidth: 'none', maxHeight: 'none',
    marginLeft: `${-ink.l * W}px`, marginTop: `${-ink.t * H}px`,
  });
  frame.style.width = `${(ink.r - ink.l) * W}px`;
  frame.style.height = `${(ink.b - ink.t) * H}px`;
  frame.classList.add('is-fitted');
  return true;
}

export function initViews(): void {
  for (const stage of document.querySelectorAll<HTMLElement>('.detail-stage')) {
    const views = [...stage.querySelectorAll<HTMLElement>('.detail-view')];
    const thumbs = [...stage.querySelectorAll<HTMLButtonElement>('.detail-thumb')];
    const caption = document.querySelector<HTMLElement>('.detail-caption');

    /*
     * The room the painting has. Across: what the stylesheet gives the painting
     * and the caption together (--plate-room), less the caption's own width
     * where it stands beside the painting (--caption-beside) — so a long title
     * takes its room from the painting rather than pushing the pair off the
     * page. Down: --plate-max. Both may be in any unit; a probe resolves them.
     */
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:var(--plate-room);height:var(--plate-max)';
    stage.append(probe);
    const room = () => {
      const beside = parseFloat(getComputedStyle(stage).getPropertyValue('--caption-beside')) || 0;
      return { w: probe.offsetWidth - (beside && caption ? caption.offsetWidth : 0), h: probe.offsetHeight };
    };

    const isCut = (i: number) => views[i]?.hasAttribute('data-plate') ?? false;
    const fitView = (i: number) => {
      const view = views[i];
      const img = view?.querySelector('img');
      if (!view || !img || !img.naturalWidth) return;
      const { w, h } = room();
      fit(view, img, isCut(i) ? inkOf(img) : EDGE_TO_EDGE, w, h);
    };
    const fitThumb = (i: number) => {
      const thumb = thumbs[i];
      const img = thumb?.querySelector('img');
      if (!thumb || !img || !img.naturalWidth) return;
      fit(thumb, img, isCut(i) ? inkOf(img) : EDGE_TO_EDGE, Infinity, thumb.clientHeight);
    };
    /*
     * Everything else follows from the painting's box without help: the page
     * is a grid that centres the painting and the caption on one line and the
     * pair across the page (01-grid.css), so sizing the painting is all there
     * is to do here.
     */
    const fitAll = () => {
      views.forEach((view, i) => { if (view.classList.contains('is-shown')) fitView(i); });
      thumbs.forEach((_, i) => fitThumb(i));
    };
    fitAll();
    window.addEventListener('resize', fitAll);
    // The box may change as the pictures arrive (a lazily measured size, a
    // font that settles the caption's width), so it is read again then.
    for (const img of stage.querySelectorAll('img')) if (!img.complete) img.addEventListener('load', fitAll, { once: true });
    window.addEventListener('load', fitAll);
    void document.fonts.ready.then(fitAll);

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
      if (stamp !== chosen) return;
      fitView(n);
      swap(n);
    };

    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => { void show(i); }));
  }
}
