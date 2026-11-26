/** A handle on the page rather than a scrollbar beside it. */
export function initScrollbar(): void {
  const thumb = document.createElement('div');
  thumb.className = 'scroll-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  document.body.append(thumb);

  const root = document.documentElement;

  const size = () => {
    const whole = root.scrollHeight;
    const view = window.innerHeight;
    // Nothing to report on a page that fits.
    if (whole <= view + 1) {
      thumb.style.setProperty('--thumb-h', '0px');
      return;
    }
    const share = (view / whole) * view;
    thumb.style.setProperty('--thumb-h', `${Math.max(36, Math.round(share))}px`);
  };

  size();
  window.addEventListener('resize', size);
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(root);
}
