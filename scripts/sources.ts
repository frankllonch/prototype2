/** Where a picture's file is. */
import path from 'node:path';

const RAW = path.resolve(import.meta.dirname, '..', 'content', 'raw');

export const isLocal = (source: string): boolean => source.startsWith('local/');

/** Extension of the file the source names, `.jpg` when it has none. */
export const sourceExt = (source: string): string =>
  path.extname(isLocal(source) ? source : new URL(source).pathname) || '.jpg';

/** Absolute path of a local source; null for one that has to be downloaded. */
export const localFile = (source: string): string | null =>
  (isLocal(source) ? path.join(RAW, source) : null);
