---
layout: link.njk
title: "[Quote] How we built our multi-agent research system"
category: ai
externalUrl: https://www.anthropic.com/engineering/built-multi-agent-research-system
date: 2025-06-15
tags:
  - post
  - link
  - ai
---

While reading Anthropic's great article "[How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)", I stumbled upon this quote where Anthropic researchers present the results where they found that multi-agent systems outperform single-agents for complex tasks:

> For example, when asked to identify all the board members of the companies in the Information Technology S&P 500, the multi-agent system found the correct answers by decomposing this into tasks for subagents, while the single agent system failed to find the answer with slow, sequential searches.

This makes a ton of sense to me. We know that LLMs do their best when the scope of the task they are given is as narrow as possible and when they have as much relevant context as possible. By using an orchestrator agent to decompose tasks and give them to sub-agents, we are effectively narrowing down the scope of the task, as well as slimming down the amount of context not relevant to the specific subtask that the sub-agent will do.

Another interesting finding from this article is that Anthropic claims that 80% of the variance of results in the BrowseComp benchmark can be explained by more token usage:

> In our analysis, three factors explained 95% of the performance variance in the BrowseComp evaluation (which tests the ability of browsing agents to locate hard-to-find information). We found that token usage by itself explains 80% of the variance, with the number of tool calls and the model choice as the two other explanatory factors.

This also makes using multiple agents more optimal, because they can use more tokens (because they do so in parallel) more efficiently (because agents are less likely to hit a context window limit where the performance starts to degrade if the context is separated for each subtask). It is also in the best interest of Anthropic that you burn tokens at 15x (according to them) the token rate with multi-agent architectures, so they get paid more. So take this with a grain of salt.

I encourage you to read the whole article, as there are many very interesting tips for designing multi-agent applications.

