'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// A changed transform policy gets a new URL even when the CMS original is unchanged.
const POLICY = Object.freeze({ widths: [480, 800, 1200, 1600], quality: 82, format: 'webp', autoOrient: true, version: 1 });
const ORIGIN = 'https://deadlinejournal.org';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function localPath(source) {
  if (typeof source !== 'string' || !source.trim()) return null;
  try {
    const url = new URL(source, ORIGIN + '/');
    if (url.origin !== ORIGIN) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) return null;
    return pathname;
  } catch { return null; }
}

function within(directory, pathname) {
  const filename = path.resolve(directory, '.' + pathname);
  const relative = path.relative(directory, filename);
  return relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative) ? filename : null;
}

function decodeAttribute(value) {
  return value.replace(/&amp;/gi, '&').replace(/&#(x[0-9a-f]+|\d+);/gi, (match, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

function articleImages(articles) {
  const sources = new Set();
  const add = source => { if (typeof source === 'string' && source.trim()) sources.add(source); };
  const richText = html => {
    const pattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    for (const match of String(html || '').matchAll(pattern)) add(decodeAttribute(match[1] ?? match[2] ?? match[3]));
  };
  for (const article of articles) {
    if (article.status && article.status !== 'published') continue;
    add(article.hero_image);
    richText(article.body);
    for (const section of article.sections || []) {
      if (section?.type === 'image') add(section.image);
      if (section?.type === 'text') richText(section.body);
    }
  }
  return sources;
}

async function listSvg(directory, prefix) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(entries.map(entry => {
      const filename = path.join(directory, entry.name);
      const publicPath = prefix + '/' + entry.name;
      if (entry.isDirectory()) return listSvg(filename, publicPath);
      return entry.isFile() && /\.svg$/i.test(entry.name) ? [publicPath] : [];
    }));
    return groups.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function concurrent(items, count, task) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(count, items.length) }, async () => {
    while (cursor < items.length) await task(items[cursor++]);
  }));
}

/**
 * Run after the build has created dist and copied media/assets/flags.
 * Original files remain untouched. Returns a synchronous HTML image renderer.
 * Unknown/remote images retain their original URL; this helper never fetches them.
 */
async function prepareImages({ root, dist, articles }) {
  const sharp = require('sharp');
  root = path.resolve(root);
  dist = path.resolve(dist);
  const manifest = Object.create(null);
  const originals = articleImages(articles || []);
  const svgGroups = await Promise.all(['assets', 'flags'].map(async directory => {
    const staged = await listSvg(path.join(dist, directory), '/' + directory);
    return staged.length ? staged : listSvg(path.join(root, directory), '/' + directory);
  }));
  const sources = [...new Set([...originals, ...svgGroups.flat()].map(localPath).filter(Boolean))];
  const outputs = new Map();
  const outputDirectory = path.join(dist, 'responsive');
  await fs.mkdir(outputDirectory, { recursive: true });

  await concurrent(sources, 3, async source => {
    let buffer;
    for (const directory of [dist, root]) {
      const filename = within(directory, source);
      if (!filename) continue;
      try { buffer = await fs.readFile(filename); break; } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
      }
    }
    if (!buffer) return;
    try {
      const metadata = await sharp(buffer).metadata();
      const swap = metadata.orientation >= 5 && metadata.orientation <= 8;
      const width = swap ? metadata.height : metadata.width;
      const height = swap ? metadata.width : metadata.height;
      if (!width || !height) return;
      const entry = { width, height, variants: [] };
      manifest[source] = entry;
      // Preserve vector artwork, animations, and unusual CMS formats as supplied.
      if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format) || metadata.pages > 1) return;
      const hash = crypto.createHash('sha256').update(buffer).update(JSON.stringify(POLICY)).digest('hex').slice(0, 24);
      if (!outputs.has(hash)) outputs.set(hash, (async () => {
        const widths = [...new Set(POLICY.widths.map(size => Math.min(size, width)))];
        const variants = [];
        for (const size of widths) {
          const basename = `${hash}-${size}.webp`;
          const target = path.join(outputDirectory, basename);
          try { await fs.access(target); } catch {
            await sharp(buffer).rotate().resize({ width: size, withoutEnlargement: true })
              .webp({ quality: POLICY.quality }).toFile(target);
          }
          variants.push({ width: size, src: '/responsive/' + basename });
        }
        return variants;
      })());
      entry.variants = await outputs.get(hash);
    } catch (error) {
      // A bad/unsupported upload must not remove the image or break the article build.
      console.warn(`Image optimization skipped for ${source}: ${error.message}`);
    }
  });

  function image(source, { alt = '', priority = false, lazy = true, sizes = '100vw' } = {}) {
    if (typeof source !== 'string' || !source.trim()) return '';
    const pathname = localPath(source);
    const info = manifest[pathname] || (pathname && /^\/flags\/[^/]+\.svg$/i.test(pathname) ? { width: 4, height: 3, variants: [] } : null);
    const variants = info?.variants || [];
    const fallback = variants.find(item => item.width >= 1200) || variants[variants.length - 1];
    const attributes = [`src="${escape(fallback?.src || source)}"`, `alt="${escape(alt)}"`];
    if (info) attributes.push(`width="${info.width}"`, `height="${info.height}"`, `style="--image-ratio:${info.width}/${info.height}"`);
    if (variants.length) attributes.push(`srcset="${variants.map(item => escape(item.src) + ' ' + item.width + 'w').join(', ')}"`, `sizes="${escape(sizes)}"`);
    attributes.push(`loading="${priority || lazy === false ? 'eager' : 'lazy'}"`, 'decoding="async"');
    if (priority) attributes.push('fetchpriority="high"');
    return '<img ' + attributes.join(' ') + '>';
  }

  // Available for build assertions or a compact client-side image manifest.
  image.manifest = Object.fromEntries(Object.keys(manifest).sort().map(source => [source, manifest[source]]));
  return image;
}

module.exports = { prepareImages };
