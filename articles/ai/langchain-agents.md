---
layout: article.njk
title: "How to supercharge your LLM with Langchain Agents"
date: Last Modified
subtitle: ""
category: ai
image: "https://img.rawpixel.com/s3fs-private/rawpixel_images/website_content/fl8100868198-image-ktwp4zoq.jpg?w=1200&h=1200&dpr=1&fit=clip&crop=default&fm=jpg&q=75&vib=3&con=3&usm=15&cs=srgb&bg=F4F4F3&ixlib=js-2.2.1&s=58bb5f4f2890209ec11faa98c11b90e5"
publishedDate: 2023-08-06
tags:
  - article
  - ai
---

<figure>
<img style="aspect-ratio: 897/467" alt="OpenAI" src="{{ image }}" />
</figure>

## The problem with LLMs

LLMs are very capable to perform a lot of feats that seem incredible to us, but **they are bound by the borders of what Generative AI was originally meant to do: generate text based on the data it has been trained on.**

They cannot access any services on the web to give us more accurate and recent answers and instead, they are meant to answer using the training data that their creators were able to gather many years ago. They cannot access tools as simple as a calculator that would help to give mathematical answers instead of having to memorize the result of every mathematical operation. They are reliant on us to perform the actions they suggest to do in the real world and we report back to them with the results.

To give our LLMs the powers they are missing to be truly powerful for us, we can use **Agents**.

## What are Agents?

Agents are an LLM that is being prompted to **reason about the actions needed to complete a request**, using a set of **tools** that it has been provided with. An agent can be used alongside **any LLM**. It is only a layer on top of it that builds the prompts indicating to the Agent the **context, its personality and the strategies it must use** to complete requests.

Obviously, the Agent by itself is not enough. We also need to create/use tools for the Agent to be able to use. The **Agent Executor** is the runtime that executes both the Agent and the tools that it uses. **Tools** can just be standalone functions or they can come in collections of tools called **toolkits**. 

<figure>
<img alt="Agent Executor, Agents and Tools diagram" src="assets/images/LangChainAgents.svg" />
</figure>

## Tools and toolkits

**Tools are functions** that will perform actions on behalf of the LLM. An agent gets a list of tools for it to use and it will request to use one, several, or none. The Agent Executor will execute the required tools and feed the result back to the Agent. An example of a tool is the Google Search function, which allows LLMs to check some information that they don't have using a Google search. 

For the Agent to be able to choose correctly which tools it needs, **those tools have to exist, be correctly implemented for the purpose that the Agent needs them for, and be in the list of tools for the Agent**. But more importantly, these tools **must be thoroughly described** so Agents can easily decide if they need them and what they will be helpful for.

**Toolkits are just a set of tools** that are usually useful together. These tools might be useful to be used together for achieving a multi-step goal, or they might be grouped because they do similar actions or actions in the same domain. An example of a toolkit is the Gmail Toolkit, which allows LLMs to read emails, draft new emails and delete them. 

## What strategies do Agents use?

After a set of tools is provided to the Agent, how does it know which one to use? Agents can use a variety of prompt engineering strategies to make the LLM reason and decide about the actions it has to take. Some popular prompt engineering practices were discussed in the previous article: Prompt Engineering.

The most popular strategy for agents is the **ReAct** method. ReAct uses few-shot learning together with some Chain-of-Thought reasoning examples. These examples contain:

- **Thoughts** transcribed from the reasoning strategies.
- **Actions** that let the LLM interact with its environment in a verbal manner.
- **Observations** gained after taking the actions.

The LLM then understands how to act in this manner and interact with its tools and can apply it to real interactions. An example of a ReAct prompt would be:

```
Question: What is the current temperature at the city where John Cena was born in Celcius?
Thought: I need to search for the city John Cena was born in, then find the current temperature for that city, then convert the temperature to Celsius.
Action: Search[City where John cena was born]
Observation: Cena was born in West Newbury, Massachusetts.
Thought: I have to find the current temperature in West Newbury, Massachusetts.
Action: WeatherLookup[West Newbury, Massachusetts]
Observation: 81°F. Sunshine to start, then a few afternoon clouds. High 81F. Winds WNW at 5 to 10 mph. 45% humidity.
Thought: I have to convert 81°F to Celsius.
Action: UnitConversion[FahrenheitToCelcius, 81]
Observation: 27.2
Thought: The answer is 27.2 degrees Celsius.
Action: Finish[27.2 degrees Celsius]
```

## How to use Langchain Agents

Langchain is a Python library (as well as JS/TS) that is very useful for rapidly getting started on integrating LLMs in your applications. It has many prompting strategies available out of the box and also many Agents.

You can get started writing tools of your own using Langchain’s tools, like this (**VERY IMPORTANT: give the function a docstring description, this will be used by the agent to choose what tool to use**):

```python
from langchain.agents import tool

@tool
def unit_conversion(units,value):
	"""Converts a given unit to another unit. To convert from Fahrenfeit to Celcius, give FahrenheitToCelcius as first parameter, then the value as second parameter"""
   if units == "FahrenheitToCelcius":
     return (5/9)*(value - 32)
   else:
     raise Exception("Invalid type of unit conversion")
```

Afterwards, use this tool along with your agent of choice, also with Langchain:

```python
from langchain.llms import OpenAI
from langchain.agents import initialize_agent, AgentType

# We will use OpenAI's GPT as the LLM
llm = OpenAI(temperature=0)

# We will create the Agent
agent = initialize_agent([unit_conversion], llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)

agent.run("What is 81 degrees Fahrenheit in Celsius?")
```

You can learn more about Langchain and its tools by visiting [its documentation](https://python.langchain.com/docs/get_started).

It looks like Agents are going to bring a lot more capabilities to LLMs in the recent future. As these new capabilities roll out to applications and tools, more outstanding things will be possible. I’m very curious and looking forward to the new possibilities.

