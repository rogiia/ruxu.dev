---
layout: article.njk
title: "The Rise Of Reasoner Models: Scaling Test-Time Compute"
date: Last Modified
subtitle: ""
category: ai
image: "assets/images/test-time-compute/thethinker-sm.jpg"
publishedDate: 2025-01-11
tags:
  - article
  - ai
---

<figure>
<img style="aspect-ratio: 897/467" alt="Le Penseur statue" src="{{ image }}" />
</figure>

## Introduction

A new kind of LLM has recently been popping out everywhere: Reasoner models. Kickstarted by OpenAI's o1 and o3, these models are a bit different from the rest. These models particularly shine when dealing with mathematical problems and coding challenges, where success depends on following precise, logical steps to reach a correct solution. On the other hand, these models take much longer to answer than any conventional model.

The approach to problem-solving used by these models mirrors a well-known distinction in human cognition: System 1 versus System 2 thinking. Traditional LLMs operate much like System 1 thinking - quick, intuitive, and based on pattern recognition. They generate responses rapidly based on their trained neural networks. In contrast, Reasoner models embody System 2 thinking - deliberate, methodical, and self-correcting. They can pause, reflect on their reasoning, and even backtrack when they detect potential errors in their logic.

The key innovation enabling these capabilities isn't found in revolutionary architectures or training methods, but rather in a different approach to computation: scaling test-time compute.

## What is Test-time Compute?

At its core, test-time compute represents a fundamental shift in how we allocate computational resources in AI systems. While traditional models focus on scaling training time and data (train-time compute) to improve, Reasoner models invest those computational resources during the actual problem-solving phase (test-time compute). This approach essentially gives the model more time to "think" about its answers.

The concept of "thinking longer" might seem similar to existing techniques like Chain-of-Thought (CoT) prompting, but there's a crucial difference. CoT prompting encourages models to spell out its reasoning and train of thought, but the intermediate steps are not validated or weighted against alternatives. Therefore, even if most steps are spot on, any error in the intermediate reasoning steps will compound, leading to incorrect final answers. Test-time compute solves this by enabling models to actively verify and correct their reasoning process.

## How Does Test-time Compute Work?

The simplest method to implement test-time compute is **iterative self-refinement**. In this method, the model outputs its reasoning and thoughts to solve a problem. Then, all the previous model outputs are passed through the same model again, making it pay attention to its reasoning and try to find errors and correct them. After sufficient iterations, the quality of the response should be much higher than the first output. This is however a naïve approach, that doesn’t allow the model to be creative to find the right solution.

A better approach is **Verifier-guided search**. In this approach, the model generates multiple different answers and a verifier selects the best one. A high temperature is often used to encourage the model to be creative and explore many different solutions. The same model used to generate can be the verifier, however, it’s a much better approach to train a smaller, separate model for that role.

The verifier can score the correctness of the overall solution (**ORM - Outcome Reward Model**) or it can score each of the steps of the solution separately (**PRM - Process Reward Model**). A PRM is much more expensive to run on all the steps than an ORM, however it is a better approach since ORM will mark a solution with all correct steps except one as incorrect. PRM, on the other hand, will mark all correct steps as correct and will encourage the model to rethink the only incorrect step to get to the correct solution.

Since the PRM will need to evaluate many different approaches to the solution, which branch for each different step proposed, we need efficient search strategies to find the path to the correct solution. The following are few different search strategies to find the correct solution path:
- **Best of N**: Generate N independent solutions and score each step using the reward model. Select the solution with the highest score in all its steps.
- **Best of N Weighted**: The implementation is the same as Best of N, however, identical responses are aggregated together. Therefore, the most common solutions will have higher scores.
- **Beam Search**: Generate N solutions for the first step. All generated solutions are scored and the top N/M will be selected for further investigation. For each of the top solutions, M different possible next steps will be generated, and therefore, N steps will be graded for the next step. This continues until getting to the final solution.
- **DVTS (Diverse Verifier Tree Search)**: Very similar to Beam Search, but we start with N/M different subtrees and we select only the best step for each of them. Then, for each of the best steps, we generate M new next steps and we score and select the best of them until we get to the final answer.
- **Lookahead search**: Also similar to Beam Search, but in order to grade each step, we generate the next step for that path and we also grade that next step. We use the score from the next step to score the previous step. Using this information, we end up selecting the paths that will be further explored and the ones that will be discarded. This method is also similar to the Monte Carlo Tree Search algorithm.

So, which of these strategies is the best? It depends. For simpler problems and lower compute iteration budget, Best of N weighted seems to be best. But for harder problems and higher compute budgets, Beam Search and its derivatives are definitely better. To achieve the best performance for both simple and complex problems, a “compute-optimal” strategy can be chosen. This strategy will estimate the difficulty of the problem using a model and choose the search strategy accordingly.

When correct solutions to hard problems are finally found using search, the data from the reasoning of the whole solution can then be used to further improve both the reasoning model and the reward model using reinforcement learning. This further improves the model on its reasoning abilities and makes it able to get to the correct answer faster in subsequent iterations.

## Performance Improvements Through Test-time Compute

When we evaluate models that use test-time compute using math and coding benchmarks we find remarkable improvements. In an article from HuggingFace, *“Scaling Test-time Compute with Open Models”*, Llama-3.2 3B using 256-iteration test-time compute was found to be better than Llama-3.1 70B, **a model over 20 times larger**. The paper *“Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters”* also finds that a PaLM 2-S small model can **outperform a 14 times larger** model using test-time compute.

These findings suggest that some problems, especially reasoning-heavy ones like math and coding, can be solved not by using bigger models, but by making the model “think longer”.

## Limitations of Test-time Compute

Does the improvement that reasoning models show mean that, to get better models, we should always let them “think for longer” instead of pretraining bigger models with more data? The already mentioned paper *“Scaling Test-time Compute with Open Models”* shows that this does not seem to be the case. The authors of the paper tested which was more effective for solving harder problems; pretraining or scaling test-time compute, and their conclusion is the following:

> ​​Test-time and pretraining compute are not 1-to-1 “exchangeable”. On easy and medium questions, which are within a model’s capabilities, or in settings with small inference requirement, test-time compute can easily cover up for additional pretraining. However, on challenging questions which are outside a given base model’s capabilities or under higher inference requirement, pretraining is likely more effective for improving performance.

Therefore, although scaling test-time compute can help models get to the correct answer even if they struggle to get it right, for test-time to work, the solution has to be in the models capabilities and knowledge to begin with. Scaling test-time compute is not a solution that can solve any problem just by giving it more time.

## Conclusion

Reasoner models like o1 and o3 are indeed impressive, and this leads many people to wonder if they are close to achieving Artificial General Intelligence (AGI). Of course, reasoning through test-time compute is not AGI at all. Test-time compute, while powerful, is not sufficient on its own to bridge the gap to AGI and, as we have established, has many shortcomings. Plus it only seems to work well on tasks that have steps that have to be objectively correct to get to the right solution, namely math and coding tasks.

However, this step to achieve strong reasoning with smaller models does seem to fit with OpenAI’s 5 step plan to AGI. Step 1 is conversational AI and step 2 is reasoning AI, which seems to have been achieved. The third step will be autonomous AI, which is already in the crosshair of many agentic models and agentic systems that are currently being developed.

So, should you use Reasoner models instead of regular ones? The decision should depend on your specific use case. These models excel at tasks requiring careful reasoning and verification, particularly in domains like mathematics, coding, and logical problem-solving. However, for tasks that require quick responses or deal with more subjective matters, traditional LLMs might still be the better choice.

## References
- Scaling Test-Time Compute with Open Models. Edward Beeching, Lewis Tunstall, Sasha Rush (HuggingFace). URL: https://huggingface.co/spaces/HuggingFaceH4/blogpost-scaling-test-time-compute.
- Scaling of Search and Learning: A Roadmap to Reproduce o1 from Reinforcement Learning Perspective. Zhiyuan Zeng, Qinyuan Cheng, Zhangyue Yin, Bo Wang, Shimin Li, Yunhua Zhou, Qipeng Guo, Xuanjing Huang, Xipeng Qiu. URL: https://arxiv.org/abs/2412.14135.
- Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters. Charlie Snell, Jaehoon Lee, Kelvin Xu, Aviral Kumar. URL: https://huggingface.co/papers/2408.03314
