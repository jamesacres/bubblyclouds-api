// nanoid v5 is ESM-only which does not play nicely with the CommonJS ts-jest
// transform used for tests. This lightweight CommonJS-compatible replacement
// generates URL-safe random ids that are good enough for tests.
const alphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export const nanoid = (size = 21): string => {
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet[(Math.random() * alphabet.length) | 0];
  }
  return id;
};

export const customAlphabet =
  (chars: string, defaultSize = 21) =>
  (size = defaultSize): string => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += chars[(Math.random() * chars.length) | 0];
    }
    return id;
  };
