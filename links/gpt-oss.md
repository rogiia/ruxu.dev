---
layout: link.njk
title: "[Link] GPT-OSS"
category: ai
externalUrl: https://openai.com/index/introducing-gpt-oss/
date: 2025-08-06
tags:
  - post
  - link
  - ai
---

Just like Sam Altman hinted at a while ago, OpenAI just released two open-weight models trying to appease the common criticism of being a company with "Open" in the name that hasn't released any open language models in a long while (since GPT-2!).

The new open-weights models (not open-source like the name seems to imply) are Mixture-of-experts models with:
- **116.83 billion** parameters with **5.13 billion active parameters**. It has **128 experts** and activates 4 experts for each token.
- **20.91 billion parameters** with **3.61 billion active parameters**. It has **32 experts** and activates 4 experts for each token.

Both models are **reasoning models** and therefore OpenAI compares them to their own o3 and o4 models. It seems like the 120b version is comparable to o4-mini and the 20b version is comparable to o3-mini. The new models have been throughoutly trained for agentic tasks as in the post-training stage, they were trained specifically to use a **browser tool** and a **python code execution tool**, as well as other generic tools.

OpenAI has also introduced a new tokenized specially for these new models called **harmony**. What stands out about this tokenizer from others is that it introduces a **"channels"** concept that allows the model to separate the output between user-facing text and internal-facing outputs. Another interesting concept that it introduces is the **"system message"**, which differs from the already known "system prompt". The system message allows for **configuration of dates** like: "Knowledge cutoff: 2024-06", "Current date: 2025-06-28". It also allows to **set the reasoning effort** with "Reasoning: high". Finally, it also allows the **configuration of channels** and what are they used for and **tools that the model can use**.

A great feature of these models is that it seems that OpenAI has optimized them to be able to easily fit in **a single H100 80GB GPU** for the largest model and in **a 16GB consumer GPU** for the small one. This was achieved using **MXFP4 quantization** after training to 4.25 bits per parameter, which very significantly reduces the model size. While it is possible to natively train models in this quantization to reduce model quality degradation, it looks that in this case the quantization was applied after training.

You can easily start using these models locally using Ollama. I recommend downloading the 20b model that fits in a consumer GPU. It runs really fast in my Macbook!
