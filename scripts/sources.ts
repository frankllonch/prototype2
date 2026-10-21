/**
 * Where a picture's file is.
 *
 * Most images were extracted from claudiavalsells.com and carry that URL as
 * their `source`; they are downloaded once into content/raw/media. A painting
 * that was never on the site has nowhere to be fetched from, so its source is
 * a path under content/raw instead — `local/2019/gouache 72x62.jpg` — and the
 * file itself is the record. Both kinds are kept out of git with the rest of
 * content/raw.
 */
import path from 'node:path';

const RAW = path.resolve(import.meta.dirname, '..', 'content', 'raw');

export const isLocal = (source: string): boolean => source.startsWith('local/');

/** Extension of the file the source names, `.jpg` when it has none. */
export const sourceExt = (source: string): string =>
  path.extname(isLocal(source) ? source : new URL(source).pathname) || '.jpg';

/** Absolute path of a local source; null for one that has to be downloaded. */
export const localFile = (source: string): string | null =>
  (isLocal(source) ? path.join(RAW, source) : null);
