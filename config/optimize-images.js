const fs = require("fs");
const path = require("path");

// Local content images only (SVGs, GIFs and remote images are left untouched).
// The optimized files are written to _site/img/; the originals stay in
// assets/images/ because og:image and the RSS feed still reference them.
const LOCAL_IMAGE = /^\/?assets\/images\/.+\.(jpe?g|png|webp)$/i;
const IMG_TAG = /<img\b[^>]*>/gi;
const ATTRIBUTE = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const WIDTHS = [400, 800, 1600];
const DEFAULT_SIZES = "(min-width: 960px) 900px, 100vw";
// Images are generated into a cache directory that can be persisted between
// builds (generated files are skipped when they already exist), then the ones
// used by the current build are copied to the site output.
const CACHE_DIR = ".cache/eleventy-img/";
const usedFiles = new Set();
const URL_PATH = "/img/";

function parseAttributes(tag) {
  const attributes = new Map();
  for (const match of tag.matchAll(ATTRIBUTE)) {
    attributes.set(match[1].toLowerCase(), match[2] !== undefined ? match[2] : match[3]);
  }
  return attributes;
}

function escapeAttribute(value) {
  return String(value).replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/"/g, "&quot;");
}

function renderAttributes(attributes) {
  return [...attributes]
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
}

// If the image is displayed at a fixed size via inline style, tell the browser
// so that it doesn't download a larger candidate than needed.
function sizesFor(attributes, intrinsicWidth) {
  if (attributes.has("sizes")) {
    return attributes.get("sizes");
  }
  const style = attributes.get("style") || "";
  const pixelWidth = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);
  if (pixelWidth) {
    return `${pixelWidth[1]}px`;
  }
  if (/(?:^|;)\s*width\s*:\s*auto/i.test(style)) {
    return `${intrinsicWidth}px`;
  }
  return DEFAULT_SIZES;
}

async function optimizeImage(src, attributes, isFirstArticleImage) {
  const inputPath = path.join(process.cwd(), src.replace(/^\/+/, ""));
  if (!fs.existsSync(inputPath)) {
    console.warn(`[optimize-images] Image not found, leaving as is: ${src}`);
    return null;
  }

  // AVIF first, WebP as the final <img> (supported by all current browsers).
  const formats = ["avif", "webp"];

  // eleventy-img is ESM-only, so it has to be loaded with a dynamic import.
  const { default: Image } = await import("@11ty/eleventy-img");
  const metadata = await Image(inputPath, {
    widths: WIDTHS,
    formats,
    outputDir: CACHE_DIR,
    urlPath: URL_PATH,
    sharpAvifOptions: { quality: 60, effort: 4 },
    sharpWebpOptions: { quality: 78 },
    filenameFormat: (id, imageSrc, width, format) => {
      const name = path.basename(imageSrc, path.extname(imageSrc));
      return `${name}-${id.slice(0, 8)}-${width}w.${format}`;
    }
  });

  for (const entries of Object.values(metadata)) {
    for (const entry of entries) usedFiles.add(entry.outputPath);
  }

  const fallbackEntries = metadata[formats[formats.length - 1]];
  const largest = fallbackEntries[fallbackEntries.length - 1];
  const sizes = sizesFor(attributes, largest.width);

  const imgAttributes = new Map(attributes);
  imgAttributes.delete("src");
  imgAttributes.delete("srcset");
  imgAttributes.delete("sizes");

  const finalAttributes = new Map();
  finalAttributes.set("src", largest.url);
  finalAttributes.set("srcset", fallbackEntries.map(entry => entry.srcset).join(", "));
  finalAttributes.set("sizes", sizes);
  for (const [name, value] of imgAttributes) {
    finalAttributes.set(name, value);
  }
  if (!finalAttributes.has("width") && !finalAttributes.has("height")) {
    finalAttributes.set("width", largest.width);
    finalAttributes.set("height", largest.height);
  } else if (finalAttributes.has("width") && !finalAttributes.has("height")) {
    // Reserve the right amount of space to avoid layout shift.
    const width = parseInt(finalAttributes.get("width"), 10);
    if (width > 0) {
      finalAttributes.set("height", Math.round(width * largest.height / largest.width));
    }
  }
  if (isFirstArticleImage) {
    // Likely the LCP element: don't lazy load it.
    if (!finalAttributes.has("loading")) finalAttributes.set("fetchpriority", "high");
  } else if (!finalAttributes.has("loading")) {
    finalAttributes.set("loading", "lazy");
  }
  if (!finalAttributes.has("decoding")) finalAttributes.set("decoding", "async");

  const sources = formats
    .slice(0, -1)
    .map(format => {
      const entries = metadata[format];
      return `<source type="${entries[0].sourceType}" srcset="${entries.map(entry => entry.srcset).join(", ")}" sizes="${escapeAttribute(sizes)}">`;
    })
    .join("");

  return `<picture>${sources}<img ${renderAttributes(finalAttributes)}></picture>`;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const target = path.join(dir.output, "img");
    fs.mkdirSync(target, { recursive: true });
    for (const file of usedFiles) {
      fs.copyFileSync(file, path.join(target, path.basename(file)));
    }
  });

  eleventyConfig.addTransform("optimizeImages", async function(content) {
    const outputPath = this.page && this.page.outputPath;
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html")) {
      return content;
    }

    const articleStart = content.indexOf("<article");
    const tags = [...content.matchAll(IMG_TAG)];
    const replacements = new Map();
    let firstArticleImageSeen = false;

    for (const match of tags) {
      const tag = match[0];
      const attributes = parseAttributes(tag);
      const src = attributes.get("src");
      if (!src) continue;

      const insideArticle = articleStart !== -1 && match.index > articleStart;
      const isFirstArticleImage = insideArticle && !firstArticleImageSeen;
      if (insideArticle) firstArticleImageSeen = true;

      if (LOCAL_IMAGE.test(src)) {
        const html = await optimizeImage(src, attributes, isFirstArticleImage);
        if (html) {
          replacements.set(match.index, { tag, html });
          continue;
        }
      }

      // Images we don't convert (SVG, remote, ...) still get lazy loading
      // when they are inside the article body and below the first image.
      if (insideArticle && !isFirstArticleImage && !attributes.has("loading")) {
        const html = tag.replace(/\s*\/?>$/, ' loading="lazy" decoding="async">');
        replacements.set(match.index, { tag, html });
      }
    }

    if (!replacements.size) return content;

    let result = "";
    let cursor = 0;
    for (const [index, { tag, html }] of replacements) {
      result += content.slice(cursor, index) + html;
      cursor = index + tag.length;
    }
    return result + content.slice(cursor);
  });
};
