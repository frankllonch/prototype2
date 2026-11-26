import { isPlainClick, reduceMotion, targetElement } from './env.ts';
import { glide, topOf } from './glide.ts';

/**
 * ‘Read more’ writes the rest of the text in: the words the reader has already
 * read stand where they were, and the rest step in one at a time, as the Color
 * Chart's statement does, ‘Read less’ last.
 */
const WORD_MS = 18;

/**
 * And never longer than this in all: a long text — the second edition's runs to
 * some 450 words — types several words a beat so it is written in this time
 * rather than eight seconds.
 */
const MAX_MS = 3000;

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

/** Every word of the whole text (not its heading) in its own span, in reading order, made once. */
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

/**
 * Words written from `from` to `to` (or erased, when `to` is less) over `total`
 * milliseconds, then `done`.
 */
function run(block: HTMLElement, words: HTMLElement[], from: number, to: number, total: number, done?: () => void): void {
  block.classList.add('is-typing');
  const start = performance.now();
  let at = from;
  const step = to > from ? 1 : -1;
  typing.set(
    block,
    window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / total);
      const upTo = from + Math.round(t * (to - from));
      while (at !== upTo) {
        if (step > 0) words[at++]?.classList.add('is-written');
        else words[--at]?.classList.remove('is-written');
      }
      if (at === to) {
        stopTyping(block);
        done?.();
      }
    }, WORD_MS),
  );
}

/** How long writing `n` words takes: a beat a word, `MAX_MS` at most. */
const typeTime = (n: number) => Math.min(n * WORD_MS, MAX_MS);

function typeOpen(block: HTMLElement): void {
  stopTyping(block);
  if (reduceMotion.matches) return;
  const words = wordsOf(block);
  const from = Math.min(teaserWords(block), words.length);
  words.forEach((w, i) => w.classList.toggle('is-written', i < from));
  if (from >= words.length) return;
  run(block, words, from, words.length, typeTime(words.length - from));
}

/**
 * ‘Read less’ undoes it: the words written in are taken back out, last first,
 * half as fast again as they came — then the block folds to its cut text.
 */
const UNTYPE_SPEED = 1.5;

function typeClose(block: HTMLElement, fold: () => void): void {
  if (reduceMotion.matches) return fold();
  const words = wordsOf(block);
  // Wherever the typing had got to, if it was still going.
  const from = block.classList.contains('is-typing')
    ? words.filter((w) => w.classList.contains('is-written')).length
    : words.length;
  stopTyping(block);
  words.forEach((w, i) => w.classList.toggle('is-written', i < from));
  const to = Math.min(teaserWords(block), from);
  if (from <= to) return fold();
  block.classList.add('is-untyping');
  run(block, words, from, to, typeTime(from - to) / UNTYPE_SPEED, () => {
    block.classList.remove('is-untyping');
    fold();
  });
}

/** The opening view's three texts. */
export function initWcTexts(): void {
  const texts = document.querySelector<HTMLElement>('.wc-texts');
  if (!texts) return;

  texts.addEventListener('click', (event) => {
    const target = targetElement(event);
    if (!target) return;
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
      if (block && !block.classList.contains('is-untyping')) {
        typeClose(block, () => {
          block.classList.remove('is-open');
          block.querySelector('.wc-more')?.setAttribute('aria-expanded', 'false');
          // Folding a long text can leave the reader staring past its end; bring the block's head
          // back if it has gone over the top.
          if (block.getBoundingClientRect().top < 0) {
            glide(topOf(block));
          }
        });
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
