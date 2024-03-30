---
layout: article.njk
title: "Understanding LLMs: Mixture of Experts"
date: Last Modified
subtitle: ""
category: ai
image: "assets/images/collaboration.jpg"
publishedDate: 2024-03-30
tags:
  - article
  - ai
---

<figure>
<img style="aspect-ratio: 897/467" alt="Collaboration" src="{{ image }}" />
</figure>

Unlike the Transformers architecture, Mixture of Experts is not a new idea. Still, it is the latest hot topic in Large Language Model architecture. This architecture has been rumored to power OpenAI's GPT-4 (and maybe GPT3.5-turbo) and is the backbone of Mistral's Mixtral 8x7B, Grok-1 and Databricks' DBRX, which rival or even surpass GPT 3.5 with a relatively smaller size. Follow along to learn more about how this kind of architecture works and why does it lead to such great results for LLMs.

### Architecture

A Mixture of Experts is a model with a sparse layer and a router. The experts reside in the sparse layer, and they are models unconnected between them. Each expert specializes in a specific task. The router is a gating mechanism that learns and decides which experts is best equipped to deal with the input. The simplicity of this concept allows this architecture to work with any type of model. In this article we will focus on Transformers where the experts are feed-forward networks, but they might as well be RNNs, SVMs or even Linear Regression models. Another possibility is Hierarchical experts, which use multiple routers at different levels.

<figure>
<img alt="Mixture of Experts Architecture" height="600" src="assets/images/moe.svg" />
</figure>

The big advantage of this kind of architecture is conditional computation. Every single inference doesn’t need to use all the model’s weights. The gating mechanism is trained to choose the top k experts and route the input only to those. This choice also has a degree of random noise, which prevents overloading the most popular experts and ensures that other experts are also trained on all kinds of data.

### History

The first sentence of this article stated that Mixture of Experts is not a recent idea. In fact, it was first proposed in 1991 in the paper Adaptive Mixture of Local Experts. In this article, the authors proposed that when the model had to perform different tasks, it was beneficial to have different experts with decoupled weights that weren’t affected by other experts fitting their weights to their own task.

Even though the idea is old, the Mixture of Experts architecture benefits a lot of today’s computing power and horizontal scaling. MoE models can easily be distributed between multiple devices. Since not all weights of the model activate on each inference, each expert can be located to a different device, which frees up the devices with other experts to handle other tasks in parallel.

<figure>
<img alt="Mixture of Experts Communication Example" src="assets/images/moe-comm.svg" />
</figure>

### How many experts should a model have?

When we train a Mixture of Experts model, we expect each expert to learn and be proficient with specific tasks. Experts do seem to specialize in handling specific inputs. For example, for a language model experts tend divide their expertise in handling nouns, verbs, punctuation, numbers and counting, etc. However, they don’t specialize in other tasks that we would consider obvious to divide. When we train a MoE model in a multilingual corpus, different experts don’t learn different languages, they all seem to try to learn all of them.

A crucial decision when designing a Mixture of Experts model is the number of experts it will have. Normally, more experts mean more efficiency, since a smaller part of the whole model will need to be used for each inference. However, there are some caveats. The advantages of adding another expert diminish the more experts we have; 4 to 16 experts seem to be a sweet spot. Also, even though it doesn’t use all weights for every inference, reducing computing time, it still must always hold all the weights in VRAM. Looking at some popular models, DBRX has 16 experts (4 activate at any inference), while Mixtral and Grok have 8 (2 activate).

### Fine-tuning MoE

A particular problem with Mixture of Experts is that they are hard to fine-tune. MoEs are very prone to overfitting. After fine tuning, they are bad at reasoning tasks, but still good at knowledge tasks. A way to mitigate this is to reduce the number of experts, as fewer experts lead to better fine tuning. Also, a recent study has shed some hope for MoE fine tuning. It had great success at finetuning a Flan MoE, suggesting that Moe's might benefit from instruction fine tuning.

### Scaling MoE

In the other hand, Mixture of Experts are great for high-throughput scenarios, as opposed to dense models. MoEs can be scaled with many techniques.

A paper by Google named GShard explored solving device underutilization to successfully scale a MoE horizontally across many devices. They replicated all non-MoE layers between all devices, but MoE layers had a different expert for each device. They also introduced the concept of expert capacity, which is the maximum number of tokens an expert can take before it is considered overflowed, after when the next expert in line would take over.

<figure>
<img alt="Mixture of Experts Capacity Factor Example" src="assets/images/moe_capacity_factor.svg" />
</figure>

Another paper, named Switch Transformers, looked at techniques to reduce communication costs between devices and reduce training instabilities. To optimize parallelism, they proposed to use a single expert approach and reduce the capacity factor to almost all tokens being equally divided between the experts (with some small wiggle room for over choosing a specific expert). Switch Transformers also proposed to only use bfloat16 precision for expert layers and use full precision for other layers. This stabilizes training, as other layers like the router need better precision due to an exponentiating function, while still reducing communication costs between experts.

### Optimizing MoE

Mixture of Expert models can also be optimized through different means. Distillation of a sparse model into a dense model keeps 30% of sparsity gains while being much smaller in total model size. Another technique is Aggregation of MoE, which merges weights of all experts into one, which still performs very good on all tasks. Also, QMoE is a quantization technique that can store 1.6 trillion parameters in less than 160GB (0.8 bits per parameter!).

### Conclusion

In conclusion, given that there’s a need today for models that perform a multitude of different tasks for a group of millions of people (think ChatGPT or similar products), MoE’s excellence in high-throughput, distributed scenarios shines. Being training and inference efficient will also mean lower costs and faster innovation. Of course, not everything is great, there are some drawbacks. Being hard to fine tune is a problem, as needing a lot of VRAM to operate. What is certain is that in the future we will keep seeing better techniques to optimize sparse models and it will lead to better LLMs.


