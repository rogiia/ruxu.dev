---
layout: link.njk
title: "[Link] Claude Fable 5 and Mythos 5"
category: ai
externalUrl: https://www.anthropic.com/news/claude-fable-5-mythos-5
date: 2026-06-09
tags:
  - post
  - link
  - ai
---

Anthropic has announced it's most capable model with the name **Fable 5**. This model was previously hidden from the public and only made available only to a select number of companies with the name **Claude Mythos Preview**. The reported reason for hiding it was that it was "too powerful" to be made available to the broad public and therefore bad actors out there.

Apparently, now Anthropic is sufficiently confident in Fable's safeguards to be released to the broad public.

Two models have been released, **Mythos 5**, which is the same as the previous model only been released to some select people, now with a bit better benchmark results but still not publicly available. Then also **Fable 5**, which is Mythos 5 (they share the exact same benchmark results so it doesn't look like they are different models or finetuned) with a safeguard that appears to be a classifier that if it detects a query on **cybersecurity, biology, chemistry or attempts to distill**, it automatically degrades to Opus 4.8.

Still, unless you have a big budget you will probably not be playing around with this model a lot. Opus was already the big, expensive model from Anthropic and this is one is even bigger and more expensive. The price is $10 per million input tokens and $50 per million of output tokens. Opus was $5/$25, so double the price. When Mythos Preview was first announced, the price was even steeper, at $25/$125 per million tokens, so it looks like for now Anthropic has found a way to serve this model for cheaper. If you have a Pro or Max subscription, you will be able to use those models at no cost until June 22, from then those models will cost usage credits.

Another interesting point of the presentation is that Anthropic will require a 30-day retention for all traffic to Fable, Mythos and future models, for all platforms where those models are deployed. According to Anthropic, this is to help them defend against attacks and won't be used to finetune models.
