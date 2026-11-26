import { isPlainClick, reduceMotion } from './env.ts';
import { glide, topOf } from './glide.ts';

/**
 * ‘Read more’ writes the rest of the text in (Frank, 2026-11-26): the words
 * the reader has already read stand where they were, and the rest step in
 * one at a time, as the Color Chart's statement does, ‘Read less’ last. The
 * block takes its whole height at once — unwritten words keep their place —
 * so nothing under it moves while the words come. At most one word every
 * this many milliseconds; less is faster typing.
 */
const WORD_MS = 18;

/** The typing still running in each block, so ‘Read less’ can stop it. */
const typing = new WeakMap<HTMLElement, number>();

function stopTyping(block: HTMLElement): void {
  const timer = typing.get(block);
  if (timer !== undefined) window.clearInterval(timer);
  typing.delete(block);
  block.classList.remove('is-typing');
}

/** How many words of the text the cut half already shows. */
function teaserWords(block: HTMLElement): number {
  let n = 0;
  for (const p of block.querySelectorAll<HTMLElement>('.wc-text-closed p:not(.wc-text-head)')) {
    const copy = p.cloneNode(true) as HTMLElement;
    copy.querySelector('.wc-more')?.remove();
    n += (copy.textContent ?? '').split(/\s+/).filter(Boolean).length;
  }
  return n;
}

/**
 * Every word of the whole text (not its heading) in its own span, in reading
 * order, made once. The spaces stay outside the spans, so the lines break
 * exactly as they did.
 */
function wordsOf(block: HTMLElement): HTMLElement[] {
  const open = block.querySelector<HTMLElement>('.wc-text-open');
  if (!open) return [];
  if (open.dataset.split !== 'yes') {
    open.dataset.split = 'yes';
    for (const p of open.querySelectorAll<HTMLElement>('p:not(.wc-text-head)')) {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
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
          span.className = 'wc-type';
          span.textContent = part;
          frag.append(span);
        }
        node.replaceWith(frag);
      }
    }
  }
  return [...open.querySelectorAll<HTMLElement>('.wc-type')];
}

function typeOpen(block: HTMLElement): void {
  stopTyping(block);
  if (reduceMotion.matches) return;
  const words = wordsOf(block);
  let shown = Math.min(teaserWords(block), words.length);
  words.forEach((w, i) => w.classList.toggle('is-written', i < shown));
  if (shown >= words.length) return;
  block.classList.add('is-typing');
  typing.set(
    block,
    window.setInterval(() => {
      words[shown++]?.classList.add('is-written');
      if (shown >= words.length) stopTyping(block);
    }, WORD_MS),
  );
}

/**
 * The opening view's three texts.
 *
 * ‘Read more’ swaps the cut text for the whole of it, in place; any other
 * plain click on a block is the block being used as the doorway it looks
 * like, and goes through the heading's own link so the page leaves the way
 * every other departure does. Modified clicks are left alone — the heading is
 * a real link and knows what a cmd-click means.
 */
export function initWcTexts(): void {
  const texts = document.querySelector<HTMLElement>('.wc-texts');
  if (!texts) return;

  texts.addEventListener('click', (event) => {
    const target = event.target as Element;
    const more = target.closest<HTMLButtonElement>('.wc-more');
    if (more) {
      event.preventDefault();
      const block = more.closest<HTMLElement>('.wc-text');
      if (block) {
        block.classList.add('is-open');
        more.setAttribute('aria-expanded', 'true');
        typeOpen(block);
      }
      return;
    }
    const less = target.closest<HTMLButtonElement>('.wc-less');
    if (less) {
      event.preventDefault();
      const block = less.closest<HTMLElement>('.wc-text');
      if (block) {
        stopTyping(block);
        block.classList.remove('is-open');
        block.querySelector('.wc-more')?.setAttribute('aria-expanded', 'false');
        // Folding a long text can leave the reader staring past its end;
        // bring the block's head back if it has gone over the top.
        if (block.getBoundingClientRect().top < 0) {
          glide(topOf(block));
        }
      }
      return;
    }
    if (target.closest('a')) return;
    if (!isPlainClick(event)) return;
    const block = target.closest<HTMLElement>('.wc-text');
    if (!block) return;
    const visible = block.querySelector<HTMLAnchorElement>(
      block.classList.contains('is-open') ? '.wc-text-open .wc-text-head a' : '.wc-text-closed .wc-text-head a',
    );
    visible?.click();
  });
}
