---
layout: link.njk
title: "[Link] AGI is not multimodal"
category: ai
externalUrl: https://thegradient.pub/agi-is-not-multimodal/
date: 2025-06-05
tags:
  - post
  - link
  - ai
---

> A true AGI must be general across all domains. Any complete definition must at least include the ability to solve problems that originate in physical reality, e.g. repairing a car, untying a knot, preparing food, etc.

In this excellent article, Benjamin Spiegel argues that our current approach to building LLMs cannot lead to an AGI. While the current next-token prediction approach is really good at reflecting human-understanding of the world, not everything in this world can be expressed with language and not all valid language constructs are consistent with the world. Therefore, they are not actually learning world models, but just the minimum language patterns that are useful in our written mediums.

Multimodal models can be seen as solving this problem, since they unite multiple ways to see the world in a single embedding space. However, in multimodal models different modalities are unnaturally separated in the training process. Instead of learning about something by interacting with it via different modalities, two models are separately trained for each modality and then artificially sewn together in the same embedding space.

> Instead of pre-supposing structure in individual modalities, we should design a setting in which modality-specific processing emerges naturally.

In conclusion, while LLMs are still getting more capable, those gains are already diminishing and might hit a wall soon. To build a general model that is not constrained by the limitations of human language we should go back to the drawing board and come up with a perception system that can seamlessly unite all modalities.

This article has also made me think about AI capabilities that are thriving today because they might not need to unite multiple modalities to form an understanding of that world. For example, programming. Software is built and executed in a digital environment and ruleset that can be easily encoded into plain text. I'm genuinely curious if you need to know about anything about how the world works, apart from just how programming languages can be used (and maybe architecture of the computer and networks), to be a good programmer. 
