---
layout: link.njk
title: "[Link] Circuit Tracing: Revealing Computational Graphs in Language Models"
category: ai
externalUrl: https://transformer-circuits.pub/2025/attribution-graphs/methods.html
date: 2025-03-30
tags:
  - post
  - link
  - ai
---

A group of Anthropic-affiliated scientists has released a paper where they study how human concepts are represented across Claude 3.5 Haiku's neurons and how these features interact to produce model outputs.

This is a specially difficult task since these concepts are not contained within a single neuron. Neurons are `polysemantic`, meaning that they encode multiple unrelated concepts in its representation. To make matters worse, `superposition` makes it so the representation of features are built from a combination of multiple neurons, not just one.

In this paper, the researches build a Local Replacement Model, where they replace the neural network's components with a simpler, interpretable function that mimics its behavior. Also, for each prompt, they show many Attribution Graph that help visualize how the model processes information and how the features smeared across the model's neurons influence its outputs.

Also check out the companion paper: <a href="https://transformer-circuits.pub/2025/attribution-graphs/biology.html" target="_blank">On the Biology of a Large Language Model</a>. In this paper the researchers also use interactive Attribution Graphs to study how models can think ahead of time to perform complex text generations that require the model to think through many steps to answer.
