// Builds a plain-text excerpt (for meta descriptions) from raw markdown/HTML content.
const MAX_LENGTH = 155;

function toPlainText(raw) {
  return String(raw || "")
    .replace(/\{%-?[\s\S]*?-?%\}/g, " ")          // nunjucks tags
    .replace(/\{\{[\s\S]*?\}\}/g, " ")            // nunjucks output
    .replace(/<!--[\s\S]*?-->/g, " ")             // html comments
    .replace(/<(figure|script|style|pre|table|h[1-6])\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")              // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")        // markdown images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")      // markdown links
    .replace(/<[^>]+>/g, " ")                     // remaining html tags
    .replace(/^\s{0,3}#{1,6}\s.*$/gm, " ")        // headings
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")      // list markers
    .replace(/^\s*>\s?/gm, "")                    // blockquote markers
    .replace(/[*_`~]+/g, "")                      // emphasis / inline code
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(raw, maxLength = MAX_LENGTH) {
  const text = toPlainText(raw);
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const clean = (lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength))
    .replace(/[\s,.;:!?-]+$/, "");
  return clean + "…";
}

module.exports = { excerpt, toPlainText };
