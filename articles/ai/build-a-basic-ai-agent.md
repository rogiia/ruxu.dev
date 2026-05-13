---
layout: article.njk
title: "Build a Basic AI Agent From Scratch"
subtitle: ""
category: ai
image: ""
date: 2026-05-10
tags:
  - post
  - article
  - ai
  - agents
---

2026 is without a doubt the year of AI agents. Since the release of Claude Code, the power of these AI agents has become undeniable. Claude Code, Codex, OpenCode are a must for many developers nowadays. OpenClaw and Hermes are becoming many people's AI assistants. Agents are also breaking into knowledge work with tools like Cowork.

If you follow me in this series of posts, we will build a basic AI agent from scratch in order to better understand how these agents actually work. For the purpose of actually understanding what's under the hood, we won't be using frameworks or libraries, we will write the agent from scratch in Python. This is not how you ship an agent as fast as possible, but it is how you learn.

## What Is an AI Agent?

An AI agent is a program that uses artificial intelligence to autonomously achieve a goal. Like any other type of agent, it perceives its environment, reasons about it, and takes action on it. The program usually runs in a loop until a goal is reached.

## What Does a Barebones Agent Need?

You only need four things to have a working agent:

1. **A loop** to keep the agent running.
2. **An LLM connection** to a capable AI model.
3. **User input**. A way to let the user communicate the goal to the agent.
4. **Context**. Keep conversation so far so the agent doesn't forget what has happened.

Again, this is just for the most basic agent implementation possible. In future posts we will be adding more exciting features into it.

## Building the Agent

To build the agent, first you will need to have access to a model. For this example, I will be using a model that is free to run and can actually run in your own machine. For that I will be using a local instance of Ollama, which is running *gemma4:e4b*, a model with 4B effective parameters.

### The Code

```python
import os
from openai import OpenAI


def get_llm_client():
    return OpenAI(
        base_url="http://localhost:11434/v1",
        api_key=""
    )


def agent_loop(client):
    messages = [
        {"role": "system", "content": "You are a helpful assistant."}
    ]

    while True:
        user_input = input("You: ")
        if user_input.lower() == "\\exit":
            break

        messages.append({"role": "user", "content": user_input})

        response = client.chat.completions.create(
            model="gemma4",
            messages=messages,
            temperature=0.7,
        )

        reply = response.choices[0].message.content
        print(f"Assistant: {reply}")

        messages.append({"role": "assistant", "content": reply})


if __name__ == "__main__":
    client = get_llm_client()
    agent_loop(client)
```

### What's happening here?

- First, we use the `get_llm_client` function to create a LLM connection to the local instance of Ollama.
- Then, we create the message history array, starting it with basic instructions for the AI assistant in the system prompt.
- We take the user input and we append it as a user message to the message history.
- We send the new whole conversation, including the last user message, to the AI model, requesting a response from it.
- The AI model response is appended to the conversation history.
- The loop runs forever until the user types `\exit`.

If we run the this agent loop, we will be able to take turns and ask this agent questions. This agent doesn't have access to outside information, so it will only be able to answer based on its internal knowledge:

```bash
$ python agent.py
You: What's the capital city of Germany?
Assistant: The capital city of Germany is **Berlin**.
```

## What You've Built

This is the most basic AI agent possible, but is still very incomplete. Right now it is just a chatbot that will answer anything that falls within the model's knowledge. But it still cannot interact with its environment. It can not read or write files, execute commands or do searches to help it answer your queries.

## What's Next?

The next step is giving the agent **tools** to allow it to start taking actions in its environment. That's where things get interesting, and the potential of AI agents starts to become apparent.

In the next part of this series, we'll add tool calling to our agent loop. See you then.
