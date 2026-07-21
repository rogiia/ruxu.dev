---
layout: link.njk
title: HuggingFace Security Incident
date: 2026-07-21
category: ai security
externalUrl: https://huggingface.co/blog/security-incident-july-2026
tags:
  - post
  - link
  - ai
  - security
---

Last week, HuggingFace suffered an AI-assisted cyberattack. The experience for HuggingFace trying to defend themselves from the attack is pretty surprising and damning for all people who think cybersecurity-capable models need to be restricted. From HuggingFace:

> the analysis requires submitting large volumes of real attack commands, exploit payloads, and C2 artifacts, and these requests were blocked by the providers' safety guardrails, which cannot distinguish an incident responder from an attacker. We ran the forensic analysis instead on GLM 5.2, an open-weight model, on our own infrastructure. This had a second benefit: no attacker data, and none of the credentials it referenced, left our environment.

HuggingFace was left unable to analyze the attack using frontier models because those refused to work on anything related to cybersecurity, even if it's for defense! 

Instead, the chinese open model was happy to help, and could be deployed locally so the sensitive security data wouldn't have to go to Anthropic's or OpenAI's servers.

My takeaway from this incident is that blocking frontier model's capabilities doesn't make the world safer from cyberthreats, but the opposite. Attackers will find workaround to use the models or just use other models without the restrictions. Defenders will need to scrap to find a less capable model who will actually help them because their usual model is refusing to help.

Plus, models with Mythos and Sol-level cyberattacking capabilities are now freely available as open models in Kimi K3 and Qwen 3.8. Right now, it seems pretty pointless for Anthropic and OpenAI to abliterate those models and will likely lead to the US trailing in cybersecurity capabilities.

As a bonus to the story, it seems that the HuggingFace attacker was actually OpenAI, who published a <a href="https://openai.com/index/hugging-face-model-evaluation-security-incident/" target="_blank">security incident report</a>:

> The models identified and chained vulnerabilities across OpenAI’s research environment and Hugging Face’s production infrastructure to obtain test solutions directly from Hugging Face’s production database. All evidence suggests that the models were hyperfocused on finding a solution for ExploitGym, going to extreme lengths to achieve a rather narrow testing goal.
> After gaining Internet access, the models inferred that Hugging Face potentially hosted models, datasets and solutions for ExploitGym. Knowing this, the model searched for and successfully found ways to gain access to secret information that it could use to cheat the evaluation. In one example, the model chained together multiple attack vectors, including using stolen credentials and zero-day vulnerabilities to find a remote code execution path on the Hugging Face servers. OpenAI’s security team discovered this anomalous activity internally.

If I read this correctly, OpenAI's models are so unaligned that they will go to the extreme lengths of hacking both their internal sandbox and the HuggingFace servers just to cheat on an eval and find the answer online.
