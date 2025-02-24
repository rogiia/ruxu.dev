---
layout: article.njk
title: Bun - What can I use it for?
date: Last Modified
subtitle: "What is Bun, the new hot thing in the Javascript world? Why is it so fast and can I use it for my projects?"
category: languages-and-frameworks
image: assets/images/bun.png
publishedDate: 2022-07-26
tags:
  - article
  - languages-and-frameworks
---


In recent years, the web development landscape has discovered that, while super stylized websites and web applications with tons of very rich interactions made with Javascript might be appealing to users, the loading time of the page can be a hundred times more influential to the user's perspective of the experience. As a result, there has been a ton of effort to reduce the loading time metrics of websites. Many frameworks and patterns have (re-)emerged to give solutions to this problem, like Server-Side Rendering and Static Site Generation.

Enter Jarred Sumner. Jarred noticed that an action as simple as printing to the console was extremely slow in Node.js. Here's an example of the time it takes to execute a "Hello world" program in Node.js and Rust.

`log.js`

```js
console.log('Hello world!')
```
```bash
$ time node log.js
Hello world!
node log.js  0,13s user 0,02s system 100% cpu 0,152 total
```

`log.rs`

```rust
fn main() {
  println!("Hello world!");
}
```
```bash
$ rustc log.rs
$ time ./log
Hello world!
./log  0,00s user 0,00s system 86% cpu 0,004 total
```

Jarred said he was very bothered by this fact, as well as other realities from the Javascript world, like having to choose and harmonize multiple tools - the runtime, the bundler, the transpiler... He was sure this didn't have to be the case and he set out on a one-man journey to build Bun.

### What exactly is Bun?
Bun is first and foremost a Javascript runtime like Node.js and Deno. It is designed to be **a blazingly fast Javascript runtime**. But don’t worry, embracing this new runtime does not mean having to refactor all of your existing code. Bun implements most of the Node APIs and Web APIs like fs, fetch, Buffer, WebSocket, and much more. Furthermore, **Bun is also compatible with most NPM packages**, even though it uses its own package manager, which is, again, built for speed.

But Bun is not just a Javascript runtime, it comes with batteries included. **It comes with all the tools that are usually needed in a Javascript project: a package manager, a bundler, and a transpiler that not only works for Javascript, it also works for Typescript and JSX out-of-the-box**. Moreover, it also includes a native implementation for **dotenv configuration loading and an SQLite3 client**.

Here's an example of installing a regular-sized package.json using NPM v8.15 and the Bun package manager v0.1.5:

```bash
$ time npm install

added 563 packages, and audited 564 packages in 3m

npm install  166,14s user 16,06s system 92% cpu 3:16,08 total
```

```bash
$ bun install
bun install v0.1.5

 563 packages installed [9.70s]

```

### But how is Bun so fast?

The speed of Bun can be explained by two main factors: The choice of Javascript engine and low-level optimization of native implementations.

Both Node.js and Deno use the V8 Javascript engine. While V8 is an awesome engine that powers the Chrome web browser, Bun chose to go for the option that would yield the best performance at any cost. Jarred chose to use **the JavascriptCore engine** for building Bun, which is the engine that powers Webkit and it seems that performs better in start time as well as in some specific cases.

Another decision that helped optimize Bun to the extreme is the choice of **Zig** as the language it is built in. Zig is a low-level programming language without a garbage collector, like C or Rust. While those two could have been great choices to build Bun in, Zig has some unique features that Jarred valued, which ultimately led him to choose Zig over other languages. First, Zig has no hidden control flow, which makes it easier to ensure that no secondary functions are unexpectedly called when running it. Also, Zig has a feature named "CompTime". With CompTime you can mark a piece of code to be executed at compile time instead of execution time, saving any precious time that can be scratched from the final execution time.

### Using Bun

To use Bun, first install it with the following command:

```bash
curl https://bun.sh/install | bash
```

Yes, it is a shell command. No, (at the time of writing this article) it does not work for Windows. You can now start using Bun.

For this example, we will build a web server. Bun comes with an HTTP server out-of-the-box. If the file used to start bun has a default export with a fetch function, it will start the HTTP server, but you can also use `Bun.serve()` for clarity. Here's a basic example:

`http.ts`
```typescript
export default {
  port: 3000,
  fetch(request: Request): Response {
    return new Response("Hello world!");
  }
};
```

Note that for this example no library is needed. Both Typescript and the HTTP server just work. Now, let's run the code and check that the server is up and running:

```bash
$ bun run http.ts
```

```bash
$ curl http://localhost:3000
Hello world!
```

Excellent! We can now introduce new features to the server. We could use the improved Node.js API for reading and returning the contents of a file. We can also use the built-in SQLite client to fetch records from a database. Using the tools that Bun provides, we can implement this easily:

```typescript
import {
  readFileSync
} from 'fs';
import {
  Database
} from 'bun:sqlite';

export default {
  port: 3000,
  async fetch(request: Request): Promise<Response> {
    const urlParts = request.url.match(/https?:\/\/.+\/(.*)/);

    const [_, resource] = urlParts;

    if (resource === 'file') {
      const file: string = readFileSync('/home/roger/Projects/experiments/log/file.txt', { encoding: 'utf-8' });
      return new Response(file);
    }
    else if (resource === 'db') {
      const db = new Database('db.sqlite');
      const query = db.query('SELECT * FROM foo');
      const result = query.run();
      db.close();
      return new Response(result);
    }

    return new Response('Hello world!');
  }
};
```

### What can I use Bun for?

Let's be clear: **Bun is not ready for production applications**. At the time of writing this article, the last version of Bun is the beta version 0.1.5. It still has a small ecosystem and community, many missing APIs, and some bugs and performance issues in edge cases. Nevertheless, this is a temporary problem; Jarred and the community are working tirelessly to build all the missing tools and APIs and fix all bugs. When first writing this article, I described some problems like performance spikes and illegal hardware instructions. But these problems are being solved so quickly that this article would be constantly out-of-date. Also, libraries specifically built for Bun are appearing constantly. Probably, in the not-so-distant future, Bun will be a great tool to be used in production environments, so it would be wise to keep an eye on it.

That doesn't mean that you shouldn't use Bun right now. If you need to build **an application that is not production-sensitive** it could be the way to go. If you want to build a quick proof-of-concept app and don't want to fiddle with Typescript and transpiler libraries it could be a great solution. Another possible use could be if you need to write a script that needs to perform at it's best and you cannot be bothered to write it in Rust or C.

In conclusion, keep an eye in Bun. What Jarred has built in just a year has already made a big impact in the Javascript community and it has the potential to completely revolutionize it.

