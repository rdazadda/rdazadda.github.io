import { boxes } from '../data/boxes.js';
import { entries as projects } from '../data/research.js';
import { entries as software } from '../data/software.js';
import { entries as visualizations } from '../data/visualizations.js';
import { entries as strategies } from '../data/memory.js';
import { posts } from '../lib/posts.js';

const addresses = [
  '/',
  ...boxes.map((box) => box.link).filter((link) => link.endsWith('/')),
  ...projects.slice(1).map((project) => `/research/${project.slug}/`),
  ...software.slice(1).map((entry) => `/software/${entry.slug}/`),
  ...[...visualizations, ...strategies, ...posts].map((entry) => entry.link),
];

export function GET({ site }) {
  const lines = addresses.map((address) => `  <url><loc>${new URL(address, site)}</loc></url>`);
  const text = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...lines, '</urlset>', ''].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'application/xml' } });
}
