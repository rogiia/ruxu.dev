---
layout: link.njk
title: "[Link] GPT-5"
category: ai
externalUrl: https://openai.com/gpt-5/
date: 2025-08-07
tags:
  - post
  - link
  - ai
---

OpenAI has finally released it's **GPT-5** model, and as we were already expecting, it's a hybrid reasoning model. Now the model itself chooses how much to think about each task, and you can force the reasoning effort as well. This probably means the end of the o series of reasoning models from OpenAI, as the regular language models and the reasoning models will now be unified.

Of course, the benchmarks look good but saturated. What stands out to me is that they announced a **74.9** score on SWE-bench (with high reasoning effort), which is just a tad over the score from Claude Opus 4.1 just announced this very same week (74.5).

With the GPT-5 iteration, come 4 new models: **GPT-5, GPT-5-mini, GPT-5-nano and GPT-5 Chat**. Free users will be allowed to use GPT-5, although when they hit the maximum quota, they will fallback to GPT-5-mini.

GPT-5 allows to **set the reasoning effort** using the "reasoning.effort" parameter, although you can also force it telling the model to "Think hard about this". These new models introduce a new reasoning tier called "minimal" which produces a few as possible reasoning tokens before answering. The output tokens can also be customized by setting the "verbosity" parameter, which didn't exist for past models. This parameter can be set to "high", "medium" or "low".

The new models also bring some new quality of life improvements for tool calling:
- **Tool choice:** While the models can choose to call zero, one or multiple tools, you can now set "tool_choice" to "forced" to force the invocation of at least one tool. You can also set a specific function that must be called by passing {"type": "function", "name": "function name"} to the "tool_choice" parameter. Finally, in "tool_choice" you can also specify a list of allowed tools from the list of tools provided to the model: {"type": "allowed_tools", "mode": "auto", "tools": []}.
- **Tool preambles:** New feature that makes the models explain the rationale behind why they are invoking a function. This provides transparency and better understanding on the model's process. By default, this feature is not enabled. To enable it, you have to include a system message like "Before you call a tool, explain why you are calling it.".
- **Custom tools:** This feature allows to define functions that allow unstructured, free-form text as input, which frees the model from using a structured JSON object to call the tool. This might improve the ability of the model to call these tools. This can be even more powerful when paired with Context-Free Grammar.
- **Context-Free Grammar:** This feature allows to set grammar rules for the free-form text, to make them follow a set of rules. You can define this rules using Lark or a regular expression.

The GPT-5 models are now available both in ChatGPT and in the OpenAI API, give them a try!

