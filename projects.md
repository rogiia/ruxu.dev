---
layout: base.njk
title: "🚧 My Projects"
slug: recent
pagination:
  data: collections.project
  size: 10
  alias: posts
  reverse: true
---

<h2>{{title}}</h2>
<ul class="blog-entry-list">
  {%- for post in posts -%}
  <li class="blog-entry-summary">
    <div>
      <div class="blog-entry-summary-content" tabindex="0" role="link" onclick="window.location='{{post.url}}'" aria-label="{{post.data.title}}">
        {% if post.data.image %}
        <img width="200" src="{{post.data.image}}" alt="{{post.data.title}}" title="{{post.data.title}}" onclick="window.location='{{post.url}}'" />
        {% endif %}
        <div class="blog-entry-summary-title">
          <h2>{{post.data.title}}</h2>
          {% if post.data.subtitle %}
            <p>{{post.data.subtitle}}</p>
          {% else %}
            <p>{{post.content | truncText}}...</p>
          {% endif %}
        </div>
      </div>
      {% if post.data.github_link %}<a href="{{post.data.github_link}}">[[ Github repo ]]</a>{% endif %}
      {% if post.data.github_link and post.data.project_link %}<span class="inline-separator">·</span>{% endif %}
      {% if post.data.project_link %}<a href="{{post.data.project_link}}">[[ Go to project ]]</a>{% endif %}
    </div>
  </li>
  {%- endfor -%}
</ul>
<ul class="pagination blog-entry-list">
  <li>{% if pagination.href.previous %}<a href="{{ pagination.href.previous }}">Previous</a>{% else %}Previous{% endif %}</li>
  {%- for pageEntry in pagination.pages %}
  <li>
    <a href="{{ pagination.hrefs[ loop.index0 ] }}"{% if page.url == pagination.hrefs[ loop.index0 ] %} class="current" aria-current="page"{% endif %}>
    {{ loop.index }}
    </a>
  </li>
  {%- endfor %}
  <li>{% if pagination.href.next %}<a href="{{ pagination.href.next }}">Next</a>{% else %}Next{% endif %}</li>
</ul>

