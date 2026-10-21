const words = (text) => text.normalize('NFD').toLowerCase().match(/[a-z]+/g) ?? [];

const tex = (text) => text.replace(/[&%$#_]/g, '\\$&').replaceAll('\u2019', "'");

const verbatim = ['url', 'doi'];

export function bibtexEntry(type, { title, authors, year, fields }) {
  const firstWord = words(title).find((word) => !['a', 'an', 'the'].includes(word)) ?? '';
  const lead = authors[0].includes(',') ? authors[0].split(',')[0] : authors[0].match(/\b[A-Z]/g).join('');
  const key = words(lead).join('') + year.replace(/\D/g, '') + firstWord;
  const author = authors.map((name) => (name.includes(',') ? name : `{${name}}`)).join(' and ');
  const all = Object.entries({ title, author, ...fields, year });
  const width = Math.max(...all.map(([name]) => name.length));
  return {
    indent: width + 6,
    lines: [`@${type}{${key},`, ...all.map(([name, value]) => `  ${name.padEnd(width)} = {${verbatim.includes(name) ? value : tex(value)}},`), '}'],
  };
}
