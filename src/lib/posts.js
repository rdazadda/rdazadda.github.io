const files = import.meta.glob('../posts/*.md', { eager: true });
const LONG = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
const SHORT = { month: 'long', day: 'numeric', timeZone: 'UTC' };

const leading = (html) => {
  const found = [];
  let rest = html;
  while (rest.startsWith('<p>') && !rest.startsWith('<p><img')) {
    const end = rest.indexOf('</p>');
    const text = rest.slice(3, end);
    rest = rest.slice(end + 4).trimStart();
    found.push({ text, rest });
  }
  return found;
};

const read = async ([path, file]) => {
  const name = path.slice(path.lastIndexOf('/') + 1, -3);
  const { title, date, topic, picture } = file.frontmatter;
  const when = new Date(date);
  if (!title || Number.isNaN(when.getTime())) throw new Error(`src/posts/${name}.md needs a title and a date at its top`);
  const html = (await file.compiledContent()).trim();
  const paragraphs = leading(html);
  return {
    slug: name,
    link: `/blog/${name}/`,
    title,
    topic,
    picture,
    when,
    day: when.toLocaleDateString('en-US', LONG),
    short: when.toLocaleDateString('en-US', SHORT),
    year: String(when.getUTCFullYear()),
    html,
    open: (count) => {
      const shown = paragraphs.slice(0, count);
      return { shown: shown.map((paragraph) => paragraph.text), more: (shown.at(-1)?.rest ?? html) !== '' };
    },
  };
};

export const posts = (await Promise.all(Object.entries(files).map(read))).sort((a, b) => b.when - a.when);
