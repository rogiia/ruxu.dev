---
layout: category.njk
title: "🔗 Shared Links"
slug: recent
permalink: "/links/recent/{% if pagination.pageNumber > 0 %}{{ pagination.pageNumber }}/{% endif %}"
subtitle: "Interesting links shared by Roger Oriol, with short commentary."
pagination:
  data: collections.link
  size: 10
  alias: posts
  reverse: true
---
