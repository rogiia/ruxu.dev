---
layout: link.njk
title: "[Quote] GPT-5 variants"
category: ai
externalUrl: https://openai.com/gpt-5/
date: 2025-08-07
tags:
  - post
  - link
  - ai
---

It's not at all straightforward to understand the variants of the GPT-5 model released today. The API docs describe four models: gpt-5, gpt-5-mini, gpt-5-nano and gpt-5-chat. However, the system card describes 6 models to replace older models, and none of the names match with the API:

> It can be helpful to think of the GPT-5 models as successors to previous models:
> *Table 1: Model progressions*
|Previous model|GPT-5 model|
----
|GPT-4o|gpt-5-main|
|GPT-4o-mini|gpt-5-main-mini|
|OpenAI o3|gpt-5-thinking|
|OpenAI o4-mini|gpt-5-thinking-mini|
|GPT-4.1-nano|gpt-5-thinking-nano|
|OpenAI o3 Pro|gpt-5-thinking-pro|

The answer is that the gpt-5 model is composed of the gpt-5-main model, the gpt-5-thinking model and a router that selects the model to send the prompt to:

> GPT-5 is a unified system with a smart and fast model that answers most questions, a deeper reasoning model for harder problems, and a real-time router that quickly decides which model to use...

The same applies to the mini model. Gpt-5-mini is made of a gpt-5-main-mini model, a gpt-5-thinking-mini model and a router. The nano model only seems to have a thinking variant, not a main, but this makes sense as a single model without a router will allow the model to be faster. This leaves only the gpt-5-thinking-pro model, which **cannot** be used via API, only via ChatGPT, with a Pro subscription:

> In the API, we provide direct access to the thinking model, its mini version, and an even smaller and faster nano version of the thinking model, made for developers (gpt-5-thinking-nano). In ChatGPT, we also provide access to gpt-5-thinking using a setting that makes use of parallel test time compute; we refer to this as gpt-5-thinking-pro.
