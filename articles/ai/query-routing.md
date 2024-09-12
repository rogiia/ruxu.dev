---
layout: article.njk
title: "Build an Advanced RAG App: Query Routing"
date: Last Modified
subtitle: ""
category: ai
image: "assets/images/query-routing/query-routing-cover.jpg"
publishedDate: 2024-09-11
tags:
  - article
  - ai
---

<figure>
<img style="aspect-ratio: 897/467" alt="Library" src="{{ image }}" />
</figure>

In previous articles, we built a basic RAG application. We also learned to introduce more advanced techniques to improve a RAG application. Today, we will explore how to tie those advanced techniques together. Those techniques might do different, sometimes opposite, things. Still, sometimes we need to use all of them, to cover all possibilities. So let's see how we can link different techniques together. In this article we will take a look at a technique called Query Routing.

## The problem with Advanced RAG Applications

When our Generative AI application receives a query, we have to decide what to do with it. For simple Generative AI applications, we send the query directly to the LLM. For simple RAG applications, we use the query to retrieve context from a single data source and then query the LLM. But, if our case is more complex, we can have multiple data sources, or different queries need different types of context. So do we build a one-size-fits-all solution, or do we make the application adapt to take different actions depending on the query?

## What is Query Routing?
Query Routing is about giving our RAG app the power of decision-making. Query Routing is a technique that takes the query from the user and uses it to make a decision on the next action to take, from a list of predefined choices.

Query Routing is a module in our Advanced RAG architecture. It is usually found after any query rewriting or guardrails. It analyses the input query and it decides the best tool to use from a list of predefined actions. The actions are usually retrieving context from one or many data sources. It could also decide to use a different index for a data source (like parent-child retrieval). Or it could even decide to search for context on the Internet.

## Which are the choices for the Query Router?
We have to define the choices that the Query Router can take beforehand. We must first implement each of the different strategies, and accompany each one with a nice description. It is very important that the description explains in detail what each strategy does, since this description will be what our router will base its decision on.

The choices a Query Router takes can be the following:

### Retrieval from different data sources
We can catalog multiple data sources that contain information on different topics. We might have a data source that contains information about a product that the user has questions about. And another data source with information about our return policies, etc. Instead of looking for the answers for the user’s questions in all data sources, the query router can decide which data source to use based on the user query and the data source description.

Data sources can be text stored in vector databases, regular databases, graph databases, etc.

### Retrieval from different indexes
Query Routers can also choose to use a different index for the same data source.

For example, we could have an index for keyword based search and another for semantic search using vector embeddings. The Query Router can decide which of the two is best for getting the relevant context for answering the question, or maybe use both of them at the same time and combine the contexts from both.

We could also have different indexes for different retrieval strategies. For example, we could have a retrieval strategy based on summaries, or a sentence window retrieval strategy, or a parent-child retrieval strategy. The Query Router can analyze the specificity of the question and decide which strategy is best to use to get the best context.

### Other data sources
The decision that the Query Router takes is not limited to databases and indexes. It can also decide to use a tool to look for the information elsewhere. For example, it can decide to use a tool to look for the answer online using a search engine. Or it can also use an API from a specific service (for example, weather forecasting) to get the data it needs to get the relevant context.

## Types of Query Routers
An important part of our Query Router is how it makes the decision to choose one or another path. The decision can vary depending on each of the different types of Query Routers. The following are a few of the most used Query Router types:

### LLM Selector Router
This solution gives a prompt to an LLM. The LLM completes the prompt with the solution, which is the selection of the right choice. The prompt includes all the different choices, each with its description, as well as the input query to base its decision on. The response of this query will be used to programmatically decide which path to take.

### LLM Function Calling Router
This solution leverages the function calling capabilities (or tool using capabilities) of LLMs. Some LLMs have been trained to be able to decide to use some tools to get to an answer if they are provided for them in the prompt. Using this capability, each of the different choices is phrased like a tool in the prompt, prompting the LLM to choose which one of the tools provided is best to solve the problem of retrieving the right context for answering the query.

### Semantic Router
This solution uses similarity search on the vector embedding representation of the user query. For each choice, we will have to write a few examples of a query that would be routed to this path. When a user query arrives, an embeddings model converts it to a vector representation and it is compared to the example queries for each router choice. The example with the nearest vector representation to the user query is chosen as the path the router must route to.

### Zero-shot classification Router
For this type of router, a small LLM is selected to act as a router. This LLM will be finetuned using a dataset of examples of user queries and the correct routing for each of them. The finetuned LLM’s sole purpose will become to classify user queries. Small LLMs are more cost-effective and more than good enough for a simple classification task.

### Language Classification Router
In some cases, the purpose of the Query Router will be to redirect the query to a specific database or model depending on the language the user wrote the query in. Language can be detected in many ways, like using a ML classification model or a Generative AI LLM with a specific prompt.

### Keyword router
Sometimes the use case is extremely simple. In this case, the solution could be to route one way or another depending on if some keywords are present in the user query. For example, if the query contains the word “return” we could use a data source with information useful about how to return a product. For this solution, a simple code implementation is enough, and therefore, no expensive model is needed.

## Single choice routing vs Multiple choice routing
Depending on the use case, it will make sense for the router to just choose one path and run it. However, in some cases it also can make sense to use more than one choice for answering the same query. To answer a question that spans many topics, the application needs to retrieve information from many data sources. Or the response might be different based on each data source. Then, we can use all of them to answer the question and consolidate them in a single final answer.

We have to design the router taking these possibilities into account.

## Example implementation of a Query Router
Let’s get into the implementation of a Query Router within a RAG application. You can follow the implementation step by step and run it yourself in the Google Colab notebook (https://colab.research.google.com/drive/1B1rGvGriKIVe7PMClrMC0z3wMBbsLIYW?usp=sharing).

For this example, we will showcase a RAG application with a query router. The application can decide to answer questions based on two documents. The first document is a paper about RAG and the second a recipe for chicken gyros. Also, the application can decide to answer based on a Google search. We will implement a single-source Query Router using an LLM function calling router.

### Load the paper

First, we will prepare the two documents for retrieval. Let's first load the paper about RAG:

<figure>
<img alt="Load RAG paper" src="assets/images/query-routing/load-rag-paper.png" />
</figure>

### Load the recipe

We will also load the recipe for chicken gyros. This recipe from Mike Price is hosted in tasty.co. We will use a simple web page reader to read the page and store it as text.

<figure>
<img alt="Load chicken gyros recipe" src="assets/images/query-routing/load-recipe.png" />
</figure>

### Save the documents in a vector store

After getting the two documents we will use for our RAG application, we will split them into chunks and we will convert them to embeddings using BGE small, an open-source embeddings model. We will store those embeddings in two vector stores, ready to be questioned.

<figure>
<img alt="Create Vector Stores" src="assets/images/query-routing/create-vector-stores.png" />
</figure>

### Search engine tool

Besides the two documents, the third option for our router will be to search for information using a Google Search. For this example I have created my own Google Search API keys. If you want this part to work, you should use your own API keys.

<figure>
<img alt="Define Google Search Tool" src="assets/images/query-routing/google-search-tool.png" />
</figure>

### Create the Query Router

Next, using the LlamaIndex library, we create a Query Engine Tool for each of the three options that the router will choose between. We provide a description for each of the tools, explaining what it is useful for. This description is very important, since it will be the basis on which the Query Router decide which path it chooses.

Finally, we create a Router Query Engine, also with Llama. We give the three query engine tools to this router. Also, we define the selector. This is the component that will make the choice of which tool to use. For this example, we are using an LLM Selector. It's also a single selector, meaning it will only choose one tool, never more than one, to answer the query.

<figure>
<img alt="Create the query router" src="assets/images/query-routing/create-query-router.png" />
</figure>

### Run our RAG application!

Our Query Router is now ready. Let's test it with a question about RAG. We provided a vector store loaded with information from a paper on RAG techniques. The Query Router should choose to retrieve context from that vector store in order to answer the question. Let's see what happens:

<figure>
<img alt="Question the app about RAG" src="assets/images/query-routing/rag-question.png" />
</figure>

Our RAG application answers correctly. Along with the answer, we can see that it provides the sources from where it got the information from. As we expected, it used the vector store with the RAG paper.

We can also see an attribute "selector_result" in the result. In this attribute we can inspect which one of the tools the Query Router chose, as well as the reason that the LLM gave to choose that option.

<figure>
<img alt="Selector result for the RAG question" src="assets/images/query-routing/rag-selection-reason.png" />
</figure>

Now let's ask it a culinary question. The recipe used to create the second vector store is for chicken gyros. Our application should be able to answer which are the ingredients needed for that recipe based on that source. 

<figure>
<img alt="Question the app about the recipe" src="assets/images/query-routing/recipe-question.png" />
</figure>

As we can see, the chicken gyros recipe vector store was correctly chosen to answer that question.

<figure>
<img alt="Selector result for the recipe question" src="assets/images/query-routing/recipe-selection-reason.png" />
</figure>

Finally, let's ask it a question that can be answered with a Google Search.

<figure>
<img alt="Question for Google Search" src="assets/images/query-routing/google-question.png" />
</figure>

## Conclusion

In conclusion, Query Routing is a great step towards a more advanced RAG application. It allows to set up a base for a more complex system, where our app can better plan how to best answer questions. Also, Query Routing can be the glue that ties together other advanced techniques for your RAG application and makes them work together as a whole system.

However, the complexity for better RAG systems doesn't end with Query Routing. Query Routing is just the first stepping stone for orchestration within RAG applications. The next stepping stone for making our RAG applications better reason, decide and take actions based on the needs of the users are Agents. In later articles, we will be diving deeper on how Agents work within RAG and Generative AI applications in general.