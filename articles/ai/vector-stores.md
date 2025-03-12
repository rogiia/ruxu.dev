---
layout: article.njk
title: "Maximizing the Potential of LLMs: Using Vector Databases"
date: Last Modified
subtitle: ""
category: ai
image: "assets/images/openai.png"
publishedDate: 2023-04-16
tags:
  - post
  - article
  - ai
---

<figure>
<img style="aspect-ratio: 897/467" alt="OpenAI" src="{{ image }}" />
</figure>

LLMs do Natural Language Processing (NLP) to represent the meaning of text as a vector. This representation of the words of the text is an embedding.

## The token limit: the LLM prompting biggest problem

Currently, one of the biggest problems with LLM prompting is the *token limit*. When GPT-3 was released, the limit for both the prompt and the output combined was 2,048 tokens. With GPT-3.5 this limit increased to 4,096 tokens. Now, GPT-4 comes in two variants. One with a limit of 8,192 tokens and another with a limit of 32,768 tokens, around 50 pages of text.

So, what can you do when you might want to do a prompt with a context larger than this limit? Of course, the only solution is to make the context shorter. But how can you make it shorter and at the same time have all the relevant information? The solution: **store the context in a vector database and find the relevant context with a similarity search query.**

## What are vector embeddings?

Let's start by explaining what vector embeddings are. [Roy Keynes' definition](https://roycoding.com/blog/2022/embeddings.html) is: "Embeddings are learned transformations to make data more useful". A neural network learns to transform text to a vector space that contains their actual meaning. This is more useful because it can find synonyms and the syntactical and semantical relationships between words. This visual helps understand how those vectors can encode meaning:

<figure>
<img alt="Word2Vec representation of Queen = King - Man + Woman" src="assets/images/word2vec-king.png" />
</figure>

## What do vector databases do?

A vector database stores and indexes vector embeddings. This is useful for fast retrieval of vectors and looking for similar vectors. 

### Similarity search

We can find similarity of vectors by calculating a vector's distance to all other vectors. The nearest neighbors will be the most similar results to the query vector. This is how flat indexes in vector databases work. But this is not very efficient, in a large database this might take a very long time.

To improve the search's performance, we can try to calculate the distance for only a subset of the vectors. This approach, called approximate nearest neighbors (ANN), improves speed but sacrifices quality of results. Some popular ANN indexes are Locally Sensitive Hashing (LSH), Hierarchical Navigable Small Worlds (HNSW) or Inverted File Index (IVF).

<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-3558841073771468"
     data-ad-slot="5616977890"></ins>
     
## Integrating vector stores and LLMs 

For this example, I downloaded the whole numpy documentation (with over 2000 pages) as a PDF from this URL: https://numpy.org/doc/1.23/numpy-ref.pdf.

We can write a Python code to transform the context document to embeddings and save them to a vector store. We will use LangChain to load the document and split it into chunks, and Faiss (Facebook AI Similarity Search) as a vector database.

```python
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.document_loaders import PyPDFLoader

loader = PyPDFLoader("example_data/layout-parser-paper.pdf")
pages = loader.load_and_split()

embeddings = OpenAIEmbeddings()

db = FAISS.from_documents(pages, embeddings)
db.save_local("numpy_faiss_index")
```

Now, we can use this database to perform a similarity search query to find pages that might be related to our prompt. Then, we use the resulting chunks to fill the context of our prompt. We will use LangChain to make it easier:

```python
from langchain.vectorstores import FAISS
from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.llms import OpenAI

query = "How to calculate the median of an array"

db = FAISS.load_local("numpy_faiss_index", embeddings)
docs = db.similarity_search(query)

chain = load_qa_with_sources_chain(OpenAI(temperature=0), chain_type="stuff")
chain({"input_documents": docs, "question": query}, return_only_outputs=True)
```

Our question for the model is "How to calculate the median of an array". Even though the context that we give it is way over the token limit, we have overcome this limitation and got an answer:

```txt
To calculate the median, you can use the numpy.median() function, which takes an input array or object that can be converted to an array and computes the median along the specified axis. The axis parameter specifies the axis or axes along which the medians are computed, and the default is to compute the median along a flattened version of the array. The function returns the median of the array elements.

For example, to calculate the median of an array "arr" along the first axis, you can use the following code:

import numpy as np
median = np.median(arr, axis=0)

This will compute the median of the array elements along the first axis, and return the result in the variable "median".
```

This is just one clever solution for a very new problem. As LLMs keep evolving, maybe problems like this will be solved without the need of these kinds of clever solutions. However, I'm sure that this evolution will open the door for new capabilities that might need other new clever solutions for the challenges that they may bring.
