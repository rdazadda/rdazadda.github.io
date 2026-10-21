// intro: the line at the top (HTML)
// sections, in order: optional heading, then entries, a list, or both
//   entry: title, link, description (HTML) or items, optional image (in public/images/) and alt
//   list item: title, link, description (HTML)
const description = 'One or two sentences describing this software, with a <a href="#">link</a>.';

export const intro = 'One or two sentences introducing this page, with a <a href="#">link</a>.';

export const sections = [
  {
    entries: [
      { title: 'Software name', link: '#', description },
      { title: 'Software name', link: '#', description },
      { title: 'Software name', link: '#', description },
    ],
  },
  {
    heading: 'Section heading',
    entries: [
      {
        title: 'Group name',
        link: '#',
        items: [
          { title: 'Item name', link: '#', description: 'does one thing, in one sentence.' },
          { title: 'Item name', link: '#', description: 'does another thing, in one sentence.' },
          { title: 'Item name', link: '#', description: 'does a third thing, in one sentence.' },
        ],
      },
      { title: 'Software name', link: '#', description },
    ],
  },
  {
    heading: 'Section heading',
    list: [
      { title: 'Software name', link: '#', description: 'One sentence describing it.' },
      { title: 'Software name', link: '#', description: 'One sentence describing it.' },
      { title: 'Software name', link: '#', description: 'One sentence describing it.' },
    ],
  },
];
