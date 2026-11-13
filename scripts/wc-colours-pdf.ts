/**
 * The colours of What's Color?, all three editions on one document, laid out
 * the way Claudia's own sheets are: a line for the person, their swatch, and
 * the colour's values under it.
 *
 * It is drawn from the same record the site paints from
 * (src/content/whats-color-colours.ts), so what it shows is what the pages
 * show. This writes the page; a browser prints it:
 *
 *   node --experimental-strip-types scripts/wc-colours-pdf.ts out.html
 *   chromium --headless --no-pdf-header-footer --print-to-pdf=docs/whats-color-colours.pdf out.html
 */
import fs from 'node:fs';
import { EDITIONS_ALL, swatchFor } from '../src/content/whats-color.ts';
import { FINAL_COLOURS } from '../src/content/whats-color-colours.ts';

const out = process.argv[2];
if (!out) throw new Error('usage: wc-colours-pdf.ts <out.html>');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const r2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace('-0.00', '0.00');

function values(hex: string): string[] {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [rf, gf, bf] = [r / 255, g / 255, b / 255];
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
  const k = 1 - max;
  const cmyk = max === 0 ? [0, 0, 0, 100] : [(max - rf) / max, (max - gf) / max, (max - bf) / max, k].map((v) => Math.round(v * 100));
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(rf), lin(gf), lin(bf)];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const fy = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const fz = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [
    `HEX ${hex.toUpperCase()}`,
    `RGB ${r} ${g} ${b}`,
    `CMYK ${cmyk.join(' / ')}`,
    `HSL ${r2(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`,
    `LAB ${r2(116 * fy - 16)}, ${r2(500 * (fx - fy))}, ${r2(200 * (fy - fz))}`,
  ];
}

const TITLES: Record<string, string> = {
  I: 'What’s Color? I',
  II: 'What’s Color? II — for architects and designers',
  III: 'What’s Color? III',
};
const order = ['I', 'II', 'III'];
const editions = [...EDITIONS_ALL].sort((a, b) => order.indexOf(a.numeral) - order.indexOf(b.numeral));

let total = 0;
const body = editions.map((edition) => {
  const rows = edition.participants.map((p) => {
    const final = FINAL_COLOURS.find((c) => c.edition === edition.numeral && c.name === p.name);
    const who = [p.name + (p.alias ? ` (${p.alias})` : ''), p.role].filter(Boolean).join(', ');
    const ref = [p.code, p.colourName?.toUpperCase()].filter(Boolean).join(' ');
    if (!final) {
      return `<article class="entry"><h2>${esc(who)}</h2><p class="pending">No colour on Claudia’s sheets or the designer’s. The site shows ${swatchFor(p).toUpperCase()} from its own palette until one is given.</p></article>`;
    }
    total++;
    const light = values(final.hex)[1]!.split(' ').slice(1).every((v) => Number(v) > 225);
    return `<article class="entry">
      <div class="who"><h2>${esc(who)}${ref ? ` <span class="ref">/ ${esc(ref)}</span>` : ''}</h2>
      <p class="from">${final.from === 'client' ? 'Claudia’s sheet' : 'Designer’s sheet, not corrected by Claudia'}</p></div>
      <div class="colour"><span class="dot${light ? ' light' : ''}" style="background:${final.hex}"></span>
      <p class="vals">${values(final.hex).join('<br>')}</p></div>
    </article>`;
  });
  return `<section><h1>${esc(TITLES[edition.numeral] ?? edition.numeral)} <span>${rows.length} names</span></h1>${rows.join('\n')}</section>`;
}).join('\n');

fs.writeFileSync(out, `<!doctype html><html lang="en"><meta charset="utf-8"><title>What’s Color? — names and colours</title>
<style>
  @page { size: A4; margin: 18mm 18mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #000; }
  section { break-before: page; }
  section:first-of-type { break-before: auto; }
  h1 { font-size: 11pt; font-weight: 400; letter-spacing: .04em; text-transform: uppercase; margin: 0 0 6mm; padding-bottom: 2.5mm; border-bottom: .3mm solid #000; display: flex; justify-content: space-between; }
  h1 span { color: #777; }
  .entry { display: flex; justify-content: space-between; align-items: center; gap: 10mm; min-height: 50mm; padding: 4mm 0; break-inside: avoid; }
  .who { flex: 1; }
  h2 { font-size: 15pt; line-height: 1.2; font-weight: 700; margin: 0; }
  .ref { white-space: nowrap; }
  .from { font-size: 8pt; color: #777; margin: 2mm 0 0; }
  .pending { font-size: 9.5pt; color: #c00; max-width: 80mm; margin: 0; }
  .colour { width: 46mm; flex: none; }
  .dot { display: block; width: 25mm; height: 25mm; border-radius: 50%; }
  .dot.light { outline: .15mm solid #ccc; }
  .vals { font-size: 7.5pt; line-height: 1.5; margin: 2.5mm 0 0; }
</style>
${body}
</html>`);
console.log(`${total} colours written to ${out}`);
