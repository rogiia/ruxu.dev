const fs = require("fs");

const { DateTime } = require("luxon");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");

const striptags = require("striptags");
const optimizeImages = require("./config/optimize-images");
const cssPipeline = require("./config/css");
const minifyHtml = require("./config/minify-html");

const site = require("./_data/site.json");
const { excerpt } = require("./config/excerpt");

module.exports = function(eleventyConfig) {
  // Copy the `assets` folder to the output (styles are built by config/css.js)
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("scripts");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("service-worker.js");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("robots.txt");


  // Critical CSS (inlined), Prism (inlined when needed) and the hashed main.css
  eleventyConfig.addPlugin(cssPipeline);

  // Convert local content images to AVIF/WebP with responsive srcsets
  eleventyConfig.addPlugin(optimizeImages);

  // Minify the final HTML (registered after the image transform on purpose)
  eleventyConfig.addPlugin(minifyHtml);

  // Add plugins
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSyntaxHighlight);
  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
  });

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  });

  // Turns a site-relative path (with or without leading slash) into an absolute URL.
  eleventyConfig.addFilter('absoluteSiteUrl', (path) => {
    if (!path) {
      return site.url + '/';
    }
    if (/^https?:\/\//.test(path)) {
      return path;
    }
    return site.url + '/' + path.replace(/^\/+/, '');
  });

  eleventyConfig.addFilter('hasCategoryPage', (categories, slug) => {
    return (categories || []).some(category => category.data.slug === slug);
  });

  // Falls back to a humanized slug ("ai-security" -> "Ai security") for
  // categories that don't have their own page.
  eleventyConfig.addFilter('getCategoryTitle', (categories, slug) => {
    for (const category of categories || []) {
      if (category.data.slug === slug) {
        return category.data.title;
      }
    }
    if (!slug) {
      return '';
    }
    const humanized = String(slug).replace(/-/g, ' ');
    return humanized.charAt(0).toUpperCase() + humanized.slice(1);
  });

  // Estimated reading time in minutes (never less than 1).
  // Only prose counts as words; code blocks and images get a flat allowance
  // because they are skimmed rather than read.
  const WORDS_PER_MINUTE = 230;
  const SECONDS_PER_CODE_BLOCK = 20;
  const SECONDS_PER_IMAGE = 10;
  eleventyConfig.addFilter('readTime', (html) => {
    const source = String(html || '');
    const prose = striptags(source.replace(/<(pre|script|style)\b[\s\S]*?<\/\1>/gi, ' '));
    const words = prose.split(/\s+/).filter(Boolean).length;
    const codeBlocks = (source.match(/<pre\b/gi) || []).length;
    const images = (source.match(/<img\b/gi) || []).length;
    const seconds = (words / WORDS_PER_MINUTE) * 60
      + codeBlocks * SECONDS_PER_CODE_BLOCK
      + images * SECONDS_PER_IMAGE;
    return Math.max(1, Math.ceil(seconds / 60));
  });

  // Plain-text summary cut at a word boundary (adds an ellipsis only when cut).
  eleventyConfig.addFilter('truncText', (text) => excerpt(text, 280));

  eleventyConfig.addFilter('hasLinkTag', (tags) => {
    return Array.isArray(tags) && tags.indexOf('link') !== -1;
  });

  eleventyConfig.addFilter('hasProjectTag', (tags) => {
    return Array.isArray(tags) && tags.indexOf('project') !== -1;
  });


  // Fail the build when a post uses a category that has no category page, or
  // when its tags don't include its category (it would be missing from the
  // category listing). Projects are exempt: they don't have category pages.
  eleventyConfig.addCollection("categoryValidation", (collectionApi) => {
    const known = new Set(collectionApi.getFilteredByTag("category").map(page => page.data.slug));
    const errors = [];
    for (const item of collectionApi.getFilteredByTag("post")) {
      const { category, tags } = item.data;
      if (!category) {
        errors.push(`${item.inputPath}: missing "category"`);
      } else if (!known.has(category)) {
        errors.push(`${item.inputPath}: unknown category "${category}" (known: ${[...known].join(", ")})`);
      } else if (!tags.includes(category)) {
        errors.push(`${item.inputPath}: tags must include the category "${category}"`);
      }
    }
    if (errors.length) {
      throw new Error("Invalid post categories:\n  " + errors.join("\n  "));
    }
    return [];
  });

  // Get the first `n` elements of a collection.
  eleventyConfig.addFilter("head", (array, n) => {
    if(!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if( n < 0 ) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  // Customize Markdown library and settings:
  let markdownLibrary = markdownIt({
    html: true,
    linkify: true
  }).use(markdownItAnchor, {
    slugify: eleventyConfig.getFilter("slugify"),
    // Wraps the heading text in a link to its own id, so sections can be shared.
    permalink: markdownItAnchor.permalink.headerLink()
  });
  eleventyConfig.setLibrary("md", markdownLibrary);

  // Pre-render markdown content into a data property so it's available
  // for the RSS feed without triggering templateContent timing issues.
  // This avoids the TemplateContentPrematureUseError with chained layouts.
  eleventyConfig.addPreprocessor("renderMarkdownForRss", "md", (data, content) => {
    data.renderedContent = markdownLibrary.render(content);
  });

  // Override Browsersync defaults (used only with --serve)
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, browserSync) {
        const content_404 = fs.readFileSync('_site/404.html');

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.writeHead(404, {"Content-Type": "text/html; charset=UTF-8"});
          res.write(content_404);
          res.end();
        });
      },
    },
    ui: false,
    ghostMode: false
  });

  return {
    // Control which files Eleventy will process
    // e.g.: *.md, *.njk, *.html, *.liquid
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid"
    ],

    // Pre-process *.md files with: (default: `liquid`)
    markdownTemplateEngine: "njk",

    // Pre-process *.html files with: (default: `liquid`)
    htmlTemplateEngine: "njk",

    // -----------------------------------------------------------------
    // If your site deploys to a subdirectory, change `pathPrefix`.
    // Don’t worry about leading and trailing slashes, we normalize these.

    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for link URLs (it does not affect your file structure)
    // Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

    // You can also pass this in on the command line using `--pathprefix`

    // Optional (default is shown)
    pathPrefix: "/",
    // -----------------------------------------------------------------

    // These are all optional (defaults are shown):
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
