/** Choosing which picture of a work is on the plate. */
import { phone } from './env.ts';

/** Resolves once the picture's bytes are in — at once if they already are. */
const loaded = (img: HTMLImageElement) => new Promise<void>((resolve) => {
  if (img.complete && img.naturalWidth > 0) { resolve(); return; }
  const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
  img.addEventListener('load', done);
  img.addEventListener('error', done);
});

/* Where the paint is. */
interface Ink { readonly l: number; readonly t: number; readonly r: number; readonly b: number }
const EDGE_TO_EDGE: Ink = { l: 0, t: 0, r: 1, b: 1 };
const inks = new Map<string, Ink>();

/* The picture's shape, as a width and a height to take the ratio of. */
function shapeOf(img: HTMLImageElement): { w: number; h: number } {
  if (phone.matches && img.naturalWidth) {
    const w = Number(img.getAttribute('width')), h = Number(img.getAttribute('height'));
    if (w > 0 && h > 0) return { w, h };
  }
  return { w: img.naturalWidth, h: img.naturalHeight };
}

function inkOf(img: HTMLImageElement): Ink {
  const key = img.currentSrc || img.src;
  const known = inks.get(key);
  if (known) return known;
  const { w, h } = shapeOf(img);
  if (!w || !h) return EDGE_TO_EDGE;
  // One pixel of the sample is a 360th of the picture.
  const SIDE = phone.matches ? 720 : 360;
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
  // The painting's edge is where its feathered cut is half there: that is the edge the eye sees,
  // so it is the one the caption is centred against and the gaps are measured from.
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
 * exactly that painted part: the transparent margin hangs outside it, unseen and
 * taking no room, so everything laid out against the frame is laid out against
 * the painting.
 */
function fit(frame: HTMLElement, img: HTMLImageElement, ink: Ink, maxW: number, maxH: number): number {
  const { w: nw, h: nh } = shapeOf(img);
  if (!nw || !nh || !maxH) return 0;
  const iw = (ink.r - ink.l) * nw, ih = (ink.b - ink.t) * nh;
  const s = Math.min(maxW / iw, maxH / ih);
  // On a phone every figure is brought to the screen's own pixels, the picture's and the frame's
  // alike.
  const dpr = window.devicePixelRatio || 1;
  const px = phone.matches ? (v: number) => Math.round(v * dpr) / dpr : (v: number) => v;
  const W = px(nw * s), H = px(nh * s);
  const screen = document.documentElement.clientWidth;
  const width = phone.matches ? screen - 2 * px((screen - (ink.r - ink.l) * W) / 2) : (ink.r - ink.l) * W;
  const height = px((ink.b - ink.t) * H);
  Object.assign(img.style, {
    width: `${W}px`, height: `${H}px`, maxWidth: 'none', maxHeight: 'none',
    marginLeft: `${-px(ink.l * W)}px`, marginTop: `${-px(ink.t * H)}px`,
  });
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.classList.add('is-fitted');
  return width;
}

export function initViews(): void {
  for (const stage of document.querySelectorAll<HTMLElement>('.detail-stage')) {
    const views = [...stage.querySelectorAll<HTMLElement>('.detail-view')];
    const thumbs = [...stage.querySelectorAll<HTMLButtonElement>('.detail-thumb')];
    const caption = document.querySelector<HTMLElement>('.detail-caption');

    /* The room the painting has. */
    const probe = document.createElement('div');
    // Pinned to a corner: left where it falls in the flow it hangs below the painting, and on a
    // phone, where the page scrolls, made the page longer.
    probe.style.cssText = 'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;width:var(--plate-room);height:var(--plate-max)';
    stage.append(probe);
    const room = () => {
      const beside = parseFloat(getComputedStyle(stage).getPropertyValue('--caption-beside')) || 0;
      // The phone sheet's figures come in tenths of a unit, so there the probe is read as it is;
      // `offsetWidth` gives whole pixels, as the wide layout has always been measured.
      if (phone.matches && !beside) {
        const box = probe.getBoundingClientRect();
        return { w: box.width, h: box.height };
      }
      return { w: probe.offsetWidth - (beside && caption ? caption.offsetWidth : 0), h: probe.offsetHeight };
    };

    const isCut = (i: number) => views[i]?.hasAttribute('data-plate') ?? false;
    const plate = stage.querySelector<HTMLElement>('.detail-plate');

    /* The page is set by the first picture — the cut-out — and stays set. */
    let anchor = 0;
    const fitView = (i: number) => {
      const view = views[i];
      const img = view?.querySelector('img');
      if (!view || !img || !img.naturalWidth) return;
      const { w, h } = room();
      if (i === 0 || !anchor || !plate) {
        fit(view, img, isCut(i) ? inkOf(img) : EDGE_TO_EDGE, w, h);
        return;
      }
      let maxW = w, maxH = h;
      const beside = parseFloat(getComputedStyle(stage).getPropertyValue('--caption-beside')) || 0;
      if (beside && caption) {
        const spill = parseFloat(getComputedStyle(stage).getPropertyValue('--view-spill')) || 0;
        const box = plate.getBoundingClientRect();
        const gap = caption.getBoundingClientRect().left - box.right;
        const edge = (innerWidth - probe.offsetWidth - gap) / 2;
        maxW = anchor + 2 * Math.max(0, Math.min(box.left - edge, gap * spill));
      } else {
        // Stacked (a phone): the caption is over the picture and its place is under it, so it is
        // the height that is held, and another view fits the cut-out's height.
        maxH = parseFloat(views[0]!.style.height) || h;
      }
      fit(view, img, isCut(i) ? inkOf(img) : EDGE_TO_EDGE, maxW, maxH);
    };
    const fitThumb = (i: number) => {
      const thumb = thumbs[i];
      const img = thumb?.querySelector('img');
      if (!thumb || !img || !img.naturalWidth) return;
      // Back to the stylesheet's height first: the last fit wrote one on the button, and read
      // again it would hold against a --thumb-h that has since changed (a turned phone, a window
      // dragged across 900px).
      thumb.style.height = '';
      thumb.style.width = '';
      // The phone's 39.5 is kept to the half; `clientHeight` rounds, which is what the wide layout
      // was approved with.
      const height = phone.matches ? thumb.getBoundingClientRect().height : thumb.clientHeight;
      fit(thumb, img, isCut(i) ? inkOf(img) : EDGE_TO_EDGE, Infinity, height);
    };
    /*
     * Everything else follows from the painting's box without help: the page is
     * a grid that centres the painting and the caption on one line and the pair
     * across the page (01-grid.css), so sizing the painting is all there is to
     * do here.
     */
    const fitAll = () => {
      const first = views[0]?.querySelector('img');
      if (first?.naturalWidth && plate) {
        const { w, h } = room();
        anchor = fit(views[0]!, first, isCut(0) ? inkOf(first) : EDGE_TO_EDGE, w, h);
        if (anchor) {
          const beside = parseFloat(getComputedStyle(stage).getPropertyValue('--caption-beside')) || 0;
          plate.style.width = `${anchor}px`;
          plate.style.height = beside ? '' : views[0]!.style.height;
          plate.style.alignItems = 'center';
        }
      }
      views.forEach((view, i) => { if (i > 0 && view.classList.contains('is-shown')) fitView(i); });
      thumbs.forEach((_, i) => fitThumb(i));
    };
    fitAll();
    window.addEventListener('resize', fitAll);

    /* Shown once, at its size. */
    const page = stage.closest<HTMLElement>('.detail');
    if (page && !page.classList.contains('is-ready')) {
      const HOLD_MAX = 2500;
      const first = views[0]?.querySelector('img');
      const wanted = [first, ...thumbs.map((t) => t.querySelector('img'))].filter((i): i is HTMLImageElement => !!i);
      const settled = Promise.all([
        ...wanted.map(async (img) => {
          await loaded(img);
          await Promise.race([img.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 250))]);
        }),
        document.fonts.ready,
      ]);
      void Promise.race([settled, new Promise((r) => setTimeout(r, HOLD_MAX))]).then(() => {
        fitAll();
        requestAnimationFrame(() => page.classList.add('is-ready'));
      });
    }
    // The box may change as the pictures arrive (a lazily measured size, a font that settles the
    // caption's width), so it is read again then.
    for (const img of stage.querySelectorAll('img')) if (!img.complete) img.addEventListener('load', fitAll, { once: true });
    window.addEventListener('load', fitAll);
    void document.fonts.ready.then(fitAll);

    if (views.length < 2 || thumbs.length !== views.length) continue;

    const inner = stage.querySelector<HTMLElement>('.detail-plate-inner');
    const swap = (n: number) => {
      views.forEach((view, i) => view.classList.toggle('is-shown', i === n));
      // Only the cut-out leans.
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

    /* Fetched and decoded before it is swapped in. */
    let chosen = 0;
    const show = async (n: number) => {
      const stamp = ++chosen;
      const img = views[n]?.querySelector('img');
      if (img) {
        img.loading = 'eager';
        // The bytes are the condition: with them the picture has a size and the plate cannot
        // collapse.
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
