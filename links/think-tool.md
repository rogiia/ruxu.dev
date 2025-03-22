---
layout: link.njk
title: "[Link] Claude Think Tool"
category: ai
externalUrl: https://www.anthropic.com/engineering/claude-think-tool
date: 2025-03-22
tags:
  - post
  - link
  - ai
---

The Anthropic team has discovered an interesting approach to LLM thinking capabilities. Instead of making the model think deeply before answering or taking an action, they experimented with giving the model a **think tool**. The think tool does nothing but register a thought in the state. However, it does allow the model to decide when it's appropriate to stop and think more carefully about the current state and the best approach to move forward.

The thinking done using the think tool will not be as deep and it will be more focused on newly obtained information. Therefore, the think tool is specially useful when the model has to carefully analyze the outputs of complex tools and act on them thoughtfully.

