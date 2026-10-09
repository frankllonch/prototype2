import { firstBlock } from './sections.ts';

/**
 * The About page, cut into the three parts the layout sets differently.
 *
 * The source is one run of HTML. The design asks for a heading, an opening
 * statement set large, a column of prose beside the photographs, and then — from
 * the private collections to the end — a centred list that runs the full width.
 * Nothing in the markup says where those parts begin, so they are found here.
 *
 * Cut on balanced top-level blocks rather than at a string offset. The
 * collections are followed by four nested divs, and a split by index lands
 * inside them and leaves the tags unclosed — which is how this page lost its
 * photographs the first time something tried to divide it.
 */
export interface AboutParts {
  /** Her name and where she is, the line the page opens on. */
  readonly heading: string;
  /** The opening statement, set large. */
  readonly lead: string;
  /** The rest of the biography, beside the photographs. */
  readonly body: string;
  /** Private collections, the exhibition list, contact — centred. */
  readonly tail: string;
}

/** Where the centred part begins. */
const TAIL = /^\s*private\s+collections\s*$/i;

const strip = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function splitAbout(html: string): AboutParts {
  const blocks: string[] = [];
  let rest = html;
  for (;;) {
    const split = firstBlock(rest);
    if (!split) break;
    blocks.push(split.block);
    rest = split.rest;
  }
  // Nothing parsed as blocks: hand the whole thing back as the body rather than
  // dropping it. A page that is laid out wrongly is recoverable; one that is
  // empty is not.
  if (blocks.length < 3) return { heading: '', lead: '', body: html, tail: '' };

  const at = blocks.findIndex((block) => TAIL.test(strip(block)));
  const end = at === -1 ? blocks.length : at;

  return {
    heading: blocks[0] ?? '',
    lead: blocks[1] ?? '',
    body: blocks.slice(2, end).join('\n') + (at === -1 ? rest : ''),
    tail: at === -1 ? '' : blocks.slice(at).join('\n') + rest,
  };
}
