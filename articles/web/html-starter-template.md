---
layout: article.njk
title: "How to Write a Good index.html File"
subtitle: ""
category: web
image: ""
date: 2025-03-23
tags:
  - post
  - article
  - web
---

Every web developer has been there: you're starting a new project and staring at an empty file called `index.html`. You try to remember, which tags were meant to go in the `<head>` again? Which are the meta tags that are best practice and which ones are deprecated?

Recently, I found myself in this exact situation. My first instinct was to copy the head section from a previous project, but as I reviewed the code, I realized some tags were outdated or simply didn't apply to my new project. What followed was a deep dive into HTML head tags – which ones are essential, which are optional, and which are just cluttering my code.

**If you're in a hurry and just want the template:** You can find my complete starter template on [GitHub](https://github.com/rogiia/html-starter-template). The repository contains two main files:
- `index.html`: A clean, minimalist template with just what you need and no unnecessary extras.
- `index-commented.html`: The same template but with detailed comments explaining how and why you should use each tag.

This article is essentially a deep dive into the comments from the `index-commented.html` file, providing more context and explanations for each decision made in the template.

This template represents my opinionated approach after researching current best practices. It aims to be a solid foundation for most web projects while maintaining good performance, accessibility, and search engine optimization.

Let's dive into the essential components of a well-structured HTML head.

### The tags you must include
These tags should be present in virtually every HTML document you create. They're essential for proper rendering, SEO, and accessibility.

#### `<!DOCTYPE html>` and `lang="en"`: Setting the document type and language

```html
<!DOCTYPE html>
<html lang="en">
```

Always begin your HTML document with the doctype declaration. This tells browsers which version of HTML you're using (in this case, HTML5) and helps ensure consistent rendering. The `lang` attribute on the `<html>` tag specifies the language of your page - this is crucial for screen readers, search engines, and browsers. If your content is in a different language, change the code accordingly (e.g., `lang="es"` for Spanish).

#### `<title>`: The page title
```html
<title>Hello world!</title>
```
Every HTML document must have a title tag. This text appears in browser tabs, bookmarks, and search engine results. Make your titles descriptive yet concise, ideally under 60 characters. A good title both informs users about your page content and includes relevant keywords for SEO.

#### `<meta name="viewport">`: Configuring viewport for responsive design
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0">
```
In today's mobile-first world, this meta tag is non-negotiable. It tells mobile browsers how to control the page's dimensions and scaling. Let's break down what each parameter does:
- `viewport-fit=cover`: Ensures content extends to the edge of the display (especially important for notched phones)
- `width=device-width`: Sets the width of the page to follow the screen width of the device
- `initial-scale=1.0`: Sets the initial zoom level when the page is first loaded
- `minimum-scale=1.0`: Prevents users from zooming out too much
- `maximum-scale=5.0`: Allows users to zoom in up to 5x (limiting this completely would harm accessibility)

Without this tag, mobile devices will render pages at a typical desktop screen width and then scale them down, resulting in tiny, unreadable text and forcing users to zoom and pan.

#### `<meta name="description">`, `<meta name="keywords">`, `<meta name="author">`: Essential meta information
```html
<meta name="description" content="">
<meta name="keywords" content="">
<meta name="author" content="">
```
These meta tags provide important information about your page:
- `description`: A concise summary of your page content (ideally 150-160 characters). This often appears in search engine results below your title.
- `keywords`: Relevant keywords for your page content. While less important for Google these days, other search engines and crawlers may still use this information.
- `author`: The name of the individual or organization that created the page.

While these tags don't directly affect page rendering, they're valuable for SEO and content categorization.

#### `<link rel="canonical">`: Avoiding duplicate indexation
```html
<link rel="canonical" href="" />
```
This tag helps search engines avoid indexing the same content multiple times when it's accessible via different URLs. For example, if your page is accessible via multiple URLs (like `example.com/page` and `example.com/page/index.html`), the canonical tag tells search engines which URL is the "official" version to index, preventing duplicate indexation which can harm your search rankings.

Fill in the `href` attribute with the primary URL you want search engines to associate with this content.

#### CSS loading strategies: Critical inline CSS vs. external stylesheets
```html
<style>
  body {
    background: #fefefe;
    color: #222;
    font-family: 'Roboto', sans-serif;
    padding: 1rem;
    line-height: 1.8;
  }
</style>
<link rel="preload" href="main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="main.css"></noscript>
```
This strategy for CSS loading optimizes performance in two ways:
1. **Inline critical CSS**: By embedding essential styles directly in the HTML document, you avoid making an additional network request that would block rendering. This makes critical styles load blazingly fast and prevents the Flash of Unstyled Content (FOUC) that can occur when styles load after content.
2. **Asynchronous loading for non-critical CSS**: The preload technique with the onload handler allows the main stylesheet to load without blocking rendering. This means your page can start displaying while the rest of the styles are still loading, creating a better user experience. The noscript tag provides a fallback for users with JavaScript disabled.

Alternatively, if your site doesn't have significant styling needs above the fold, you can use a simpler approach:
```html
<link href="main.css" rel="stylesheet" />
```
This is more straightforward but can slow initial rendering as the browser must download and parse the CSS before displaying content.

#### `<script>`: Script loading best practices
```html
<script type="module" src="app.js"></script>
```
For JavaScript, the `type="module"` attribute offers several advantages:
- Automatically defers script loading until the DOM is ready
- Enables ECMAScript modules for better code organization
- Runs in strict mode by default
- Allows for cleaner dependency management

For scripts that don't depend on DOM elements and should run as soon as possible, consider adding the `async` attribute:
```html
<script type="module" async src="analytics.js"></script>
```

Additionally, it's good practice to register a service worker for offline capabilities:
```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js');
    });
  }
</script>
```
This script is placed without `defer` or `async` attributes so it loads and executes as soon as possible, enabling offline capabilities early in the page load process. The service worker runs in the background, independent of your web page, allowing it to handle network requests and caching even when the user navigates away from your site.

### The tags you maybe should include
These tags aren't necessary for every project but can be valuable in specific situations. Include them based on your project's needs.

#### `<meta charset="utf-8">`: Character encoding
```html
<meta charset="utf-8">
```
This meta tag specifies the character encoding for your HTML document. UTF-8 is already the default character encoding in HTML5, so this tag isn't strictly necessary in many cases. However, including it explicitly ensures consistency across all browsers and prevents potential character rendering issues, especially with special characters or non-Latin alphabets.

#### `<base href="/">`: Defining a base URL
```html
<base href="/">
```
The base tag specifies the base URL for all relative URLs in a document. If all your site's URLs are already relative to the root path ("/"), you don't need to include this tag. It's primarily useful when your site is hosted in a subdirectory but you want paths to be relative to the domain root, or when developing single-page applications with client-side routing.

#### `<meta name="application-name">`: Application details
```html
<meta name="application-name" content="">
```
If your Progressive Web App (PWA) should have a different name than what's specified in your title tag, use this meta tag. It defines the name that will appear when your web application is installed on a device or pinned to a user's start menu or taskbar.

#### `<meta name="theme-color">`: Browser UI theme color
```html
<meta name="theme-color" content="#33d">
```
This meta tag defines the color used by the user agent in the UI elements around your page, such as the browser's address bar in mobile browsers or the title bar in some desktop browsers. Choose a color that reflects your brand identity to create a more integrated visual experience.

#### `<meta name="color-scheme">`: Light and dark mode support
```html
<meta name="color-scheme" content="light dark">
```
This tag informs the browser if your site supports light mode, dark mode, or both. The value `"light dark"` means that both schemes are supported, with light being preferred. This helps browsers render form controls, scrollbars, and other UI elements in the appropriate color scheme, creating a better user experience that respects system preferences.

#### `<meta property="og:">`: Social media integration with Open Graph
```html
<meta property="og:title" content="" />
<meta property="og:type" content="website" />
<meta property="og:url" content="" />
<meta property="og:image" content="" />
```
Open Graph meta tags optimize how your content appears when shared on social media platforms like Facebook, LinkedIn, and X (formerly Twitter). While not essential for basic functionality, they significantly improve the appearance and engagement of your content when shared.

Key Open Graph tags include:
- `og:title`: The title of your page/content (can differ from your HTML title)
- `og:type`: The type of content (website, article, product, etc.)
- `og:url`: The canonical URL of your page
- `og:image`: The URL to an image representing your content

If your site's content is likely to be shared on social platforms, filling these tags with appropriate values can dramatically improve click-through rates and engagement.

#### `<link rel="manifest">` and `<link rel="icon">`: PWA support and favicons
```html
<link rel="manifest" href="manifest.json">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
```
For Progressive Web Apps, use the manifest link to point to a JSON file that contains your app's metadata, including icons. The manifest should include your app's icons in various sizes for different devices and contexts.

For regular websites that aren't PWAs, use the icon link to define your site's favicon. While technically optional, a favicon helps with brand recognition and user experience, so most sites should include one.

#### `<link rel="alternate">`: Alternate Content Types for your site
```html
<link rel="alternate" type="application/rss+xml" href="/feed.xml">
<link rel="alternate" type="text/markdown" href="/llms.txt">
```
This link tag serves multiple purposes:

1. It helps RSS readers and other feed aggregators discover your site's RSS feed. Include it if your site provides an RSS feed (common for blogs, news sites, or regularly updated content collections).

2. It can also be used to specify an `llms.txt` file for your site as a `type="text/markdown"` alternate link. This file provides your site's content in an easy to digest format for Large Language Models scanning your site. **Note:** I stole that idea from [Giles Thomas](https://www.gilesthomas.com/2025/03/llmstxt).

If your site doesn't offer these features, you can safely omit these tags.

#### `<link rel="preload">`, `<link rel="preconnect">`, `<link rel="prefetch">`: Resource optimization
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<link rel="preconnect" href="https://fonts.gstatic.com">
<link rel="prefetch" href="/next-page.html">
```
These link tags help optimize resource loading:
- `preload`: Tells the browser to download and cache a resource as soon as possible. Useful for critical resources needed early in the rendering process, like fonts or important images.
- `preconnect`: Establishes an early connection to external domains from which you'll fetch resources later. This saves time by having the connection ready when needed.
- `prefetch`: Suggests to the browser that a resource might be needed for future navigation. The browser will download it when idle, making subsequent page loads faster.

Use these selectively based on your performance needs. Over-using them can waste bandwidth, so focus on truly critical resources.

### Conclusion
This template gives you a solid starting point for any web project. Of course, this template is completely opinionated and the best setup for your needs may vary. If I left out some common tags from the template, it's probably because they are not needed, at least for most cases.

I welcome your feedback! If you think I've missed something important, please open an issue or submit a pull request on the [GitHub repository](https://github.com/rogiia/html-starter-template).

Also, if you want a starter template that goes further than just the index.html file, you might want to check out [HTML5 Boilerplate](https://html5boilerplate.com/). It's a great resource to get up an running really fast when building a Progressive Web App.

### Resources
If you want to read more about HTML head tags, I suggest starting here:

- [Mozilla Web Documentation: Metadata in HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Webpage_metadata)
- [web.dev by Google](https://web.dev/learn/html/metadata)
- [The Open Graph Protocol](https://ogp.me/)
- [Web App Manifest specification](https://w3c.github.io/manifest/)

And once more, you can find the my index.html template on [GitHub](https://github.com/rogiia/html-starter-template). 

