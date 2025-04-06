---
layout: link.njk
title: "[Link] The Llama 4 herd"
category: ai
externalUrl: https://ai.meta.com/blog/llama-4-multimodal-intelligence/
date: 2025-04-06
tags:
  - post
  - link
  - ai
---

Meta has finally released the Llama 4 family of models that Zuckerberg hyped up so much. The Llama 4 models are open-source, multi-modal, mixture-of-experts models. First impression, these models are massive. None of these models will be able to run in the average computer with a decent GPU or any single Mac Mini. This is what we have:

### Llama 4 Scout
The small model in the family. A mixture-of-experts with 16 experts, totaling 109B parameters. According to Meta, after an int-4 quantization, it fits in an H100 GPU, which is 80GB of VRAM. It's officially the model with the largest context window ever, with a supported 10M context window. However, a large context window takes a big toll on the already high VRAM requirements, so you might want to keep the context window contained. As they <a href="https://github.com/meta-llama/llama-cookbook/blob/main/getting-started/build_with_llama_4.ipynb" target="_blank">themselves write in their new cookbook example notebook for Llama 4</a>:
> Scout supports up to 10M context. On 8xH100, in bf16 you can get upto 1.4M tokens.

### Llama 4 Maverick
The mid-sized model. This one has 128 experts, totaling 400B parameters. This one "only" features a 1M context window, due to its larger size. Maverick, as of today, has reached the second place in <a href="https://lmarena.ai/?leaderboard" target="_blank">LMArena</a> with 1417 ELO, only surpassed by Gemini 2.5 Pro. Which is scary, knowing this is not even the best model in the family.

### Llama 4 Behemoth
The big brother in the family. 16 experts, 2 **TRILLION** parameters. Easily surpasses Llama 3.1 405B, which was the largest Llama model until today. This model has not yet been released, as according to Meta is still training, so we don't know anything about its capabilities.

### Llama 4 Reasoning
We have no details on what it's going to be, just the announcement that <a href="https://www.llama.com/llama4-reasoning-is-coming/" target="_blank">it's coming soon</a>.

Overall, these look like very capable frontier models that can compete with OpenAI, Anthropic and Google while at the same time being open-source, which is a huge win. Check out Meta's <a href="https://ai.meta.com/blog/llama-4-multimodal-intelligence/" target="_blank">post on the models' architecture and benchmarks</a> and also check the models on <a href="https://huggingface.co/collections/meta-llama/llama-4-67f0c30d9fe03840bc9d0164" target="_blank">HuggingFace</a>.
