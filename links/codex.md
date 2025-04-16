---
layout: link.njk
title: "[Link] OpenAI Codex CLI"
category: ai
externalUrl: https://github.com/openai/codex
date: 2025-04-16
tags:
  - post
  - link
  - ai
---

Together with the <a href="https://openai.com/index/introducing-o3-and-o4-mini/" target="_blank">launch of the o3 and o4-mini reasoning models</a>, OpenAI has released a coding assitant for the terminal: Codex.

Codex is meant to be used with OpenAI models. You can use it to create new projects, make changes to existing projects or ask the model to explain code to you, all in the terminal. It can use multimodal input (e.g. screenshots). It also allows sandboxing your development environment to secure your computer. It also allows the use of context files, `~/.codex/instructions.md` for global instructions for Codex and `codex.md` in the project root for project-specific context.

In `Full-auto` mode, Codex can not only read and write files, but also run shell commands in an environment confined around the current directory and with network disabled. However, OpenAI suggests that in the future, you will be able to whitelist some shell commands to run with network enabled, once they have polished some security concerns.

You can install codex via npm:
```bash
npm i -g @openai/codex
```

