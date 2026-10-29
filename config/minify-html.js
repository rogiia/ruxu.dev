const { minify } = require("html-minifier-terser");

module.exports = function(eleventyConfig) {
  // Must be registered after the image transform so it sees the final markup.
  eleventyConfig.addTransform("minifyHtml", async function(content) {
    const outputPath = this.page && this.page.outputPath;
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html")) {
      return content;
    }
    return minify(content, {
      collapseWhitespace: true,
      conservativeCollapse: true, // keep one space between inline elements
      removeComments: true,
      decodeEntities: false,
      minifyCSS: false, // CSS is already minified at build time
      minifyJS: false
    });
  });
};
