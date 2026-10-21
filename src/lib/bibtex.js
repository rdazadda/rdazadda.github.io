const words = (text) => text.normalize('NFD').toLowerCase().match(/[a-z]+/g) ?? [];

const tex = (text) => text.replace(/[&%$#_]/g, '\\$&').replaceAll('\u2019', "'");

export function bibtexEntry(type, { title, authors, year, fields }) {
  const firstWord = words(title).find((word) => !['a', 'an', 'the'].includes(word)) ?? '';
  const key = words(authors[0].split(',')[0]).join('') + year.replace(/\D/g, '') + firstWord;
  const all = Object.entries({ title, author: authors.join(' and '), ...fields, year });
  const width = Math.max(...all.map(([name]) => name.length));
  return {
    indent: width + 6,
    lines: [`@${type}{${key},`, ...all.map(([name, value]) => `  ${name.padEnd(width)} = {${tex(value)}},`), '}'],
  };
}
