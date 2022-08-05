---
layout: article.njk
title: Feature Store - Why do you need one?
date: Last Modified
subtitle: "How to set up a data architecture that saves your data scientists time and effort."
category: mlops
image: assets/images/paint.jpg
tags:
  - article
  - mlops
---

<figure>
<img alt="Painting desk" src="assets/images/paint.jpg" />
<figcaption>Painter photo created by rawpixel.com - www.freepik.com</figcaption>
</figure>

**A feature store is a storage system for features**. Features are properties of data calculated through an ETL process or feature pipeline. This pipeline takes raw data and calculates a property from it. This property - usually a numeric value - will be useful to a machine learning model. It is important to find adequate, correct, and quality features. The quality of those features is the most important contributor to a model's success.  The model will use the features either to train itself or to make predictions. A feature store will help to organize and use those features.

At its core, **a feature store is only a database**. More specifically, there are usually two databases. There is an **offline store** equipped to store large sums of data, like an HBase or S3. There is also an **online store** equipped for fast data serving, like Cassandra. Features are organized in feature groups, which can be thought of as tables. Features that are used together are stored in the same feature group so access to them is faster and without joins. There are many ETL processes (think Spark) that write to the offline store. Data from the offline store replicates to the online store to keep them consistent. Data streams can also write both to the online and offline stores, for fast real-time data access.

<figure>
<img alt="Architecture of Michelangelo Pallete feature store developed at Uber" src="https://miro.medium.com/max/1400/0*F4gGPz8PukepaG5r.png" />
<figcaption>Architecture of Michelangelo Pallete feature store developed at Uber</figcaption>
</figure>

In this article, I will lay out the advantages of including a Feature Store in your data architecture. Prescribing solutions to all cases without further thought is definitely not the answer. But almost every Data Science team will benefit from having a feature store, even if it is small.

The principal reason to be for a feature store is to empower data scientists to **reuse features**. Building feature pipelines takes around 80% of data scientists' time. Avoiding repeated feature engineering work will result in a faster work cycle. One example of feature reuse is for sharing features between training and inference. The features used for training are roughly the same as the features used for making a prediction. Another example of feature reuse is between teams or projects. Features related to core enterprise concepts are usually used throughout different ML projects. To encourage reuse, features must be discoverable through the feature store.

Another benefit of centralizing features in a single feature store is **feature consistency**. Different data science teams might calculate similar features slightly differently. Those features might be the same concept and data scientists will have to agree to unify them. Then, if the process to calculate the feature changes, it changes for all the projects that use it. Or they might be a different concept, and data scientists will have to categorize them according to their separate quirks.

Feature stores also enable point-in-time correctness. The online store will always have the latest value for a feature. The offline store will store all historical values the feature had at any point. This enables data scientists to work with old values, aggregate time ranges, and so on. It also ensures the **reproducibility** of a model. At any point, we can recover the data used in a past training or in a past inference to debug the model.

One can also generate statistics from the feature store to monitor the health of the data. If the **data drifts** (its health or structure changes over time), it can be automatically detected in the pipeline. Statistics can also help explain how a feature affects the predictions of each model.

Using the catalog of features and models, you can draw a **data lineage**. This data lineage shows the data source used to create each feature. It also shows the models or other feature pipelines that use the feature. This graph enables debugging problems with data. It becomes trivial to track down where a piece of data came from and how it is being used.

In some use cases, an ML model will have a low-latency requirement. For example, if a model is being called from an API call, the user will expect a response within a few seconds. This requires very fast access to features. Instead of calculating them each time, we can access the precalculated features in the online store. We know that the online store is always going to have the up-to-date last value of the feature. The online store is also optimized for sub-second queries for a fast response.

Don't use a feature store if you don't have to. But if your organization has a medium-sized ML team or several ML teams, or it has any of the needs I exposed, consider introducing a feature store. **It will only benefit your data science teams in the long run.**