const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const CleanCSS = require("clean-css");

const STYLES_DIR = "styles";
const OUTPUT_PATH = "styles";

function minify(file) {
  const source = fs.readFileSync(path.join(STYLES_DIR, file), "utf8");
  // Level 1 only shortens values; it never reorders rules, so the cascade is untouched.
  const output = new CleanCSS({ level: 1 }).minify(source);
  if (output.errors.length) {
    throw new Error(`Failed to minify ${file}: ${output.errors.join("; ")}`);
  }
  return output.styles;
}

function buildMain() {
  const css = minify("main.css");
  const hash = crypto.createHash("sha256").update(css).digest("hex").slice(0, 10);
  return { css, fileName: `main.${hash}.css` };
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addWatchTarget(STYLES_DIR);

  // Critical CSS and the Prism theme are inlined into the page.
  eleventyConfig.addShortcode("criticalCss", () => minify("critical.css"));
  eleventyConfig.addShortcode("prismCss", () => minify("prism-okaidia.css"));

  // The remaining CSS is a separate content-hashed file, so it can be cached forever.
  eleventyConfig.addShortcode("mainCssUrl", () => `/${OUTPUT_PATH}/${buildMain().fileName}`);

  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const { css, fileName } = buildMain();
    const outputDir = path.join(dir.output, OUTPUT_PATH);
    fs.mkdirSync(outputDir, { recursive: true });
    for (const existing of fs.readdirSync(outputDir)) {
      if (/^main\..+\.css$/.test(existing) && existing !== fileName) {
        fs.unlinkSync(path.join(outputDir, existing));
      }
    }
    fs.writeFileSync(path.join(outputDir, fileName), css);
  });
};
