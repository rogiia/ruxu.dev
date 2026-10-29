const { excerpt } = require("../config/excerpt");

module.exports = {
  // Meta description: explicit `description`, then `subtitle`, then an
  // excerpt of the page content.
  metaDescription: data => {
    if (data.description) return data.description;
    if (data.subtitle) return data.subtitle;
    return excerpt(data.page && data.page.rawInput);
  }
};
