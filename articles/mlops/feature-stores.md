---
layout: article.njk
title: Feature Store - Why do you need one?
date: Last Modified
subtitle: "How to set up a data architecture that saves your data scientists time and effort."
category: mlops
image: assets/images/paint_sm.jpg
publishedDate: 2022-08-05
tags:
  - article
  - mlops
---

<figure>
<img style="aspect-ratio: 3/2" alt="Painting desk" src="assets/images/paint.jpg" />
<figcaption>Painter photo created by rawpixel.com - www.freepik.com</figcaption>
</figure>

**A feature store is a storage system for features**. Features are properties of data calculated through an ETL process or feature pipeline. This pipeline takes raw data and calculates a property from it. This property - usually a numeric value - will be useful to a machine learning model. It is important to find adequate, correct, and quality features. The quality of those features is the most important contributor to a model's success.  The model will use the features either to train itself or to make predictions. A feature store will help to organize and use those features.

At its core, **a feature store is only a database**. More specifically, there are usually two databases. There is an **offline store** equipped to store large sums of data, like an HBase or S3. There is also an **online store** equipped for fast data serving, like Cassandra. Features are organized in feature groups, which can be thought of as tables. Features that are used together are stored in the same feature group so access to them is faster and without joins. There are many ETL processes (think Spark) that write to the offline store. Data from the offline store replicates to the online store to keep them consistent. Data streams can also write both to the online and offline stores, for fast real-time data access.

<figure>
<img alt="Architecture of Michelangelo Pallete feature store developed at Uber" src="https://miro.medium.com/max/1400/0*F4gGPz8PukepaG5r.png" />
<figcaption>Architecture of Michelangelo Pallete feature store developed at Uber</figcaption>
</figure>

In this article, I will lay out the advantages of including a Feature Store in your data architecture. Prescribing solutions to all cases without further thought is definitely not the answer. But almost every Data Science team will benefit from having a feature store, even if it is small.

### Reusable features

The principal reason to be for a feature store is to empower data scientists to **reuse features**. Building feature pipelines takes around 80% of data scientists' time. Avoiding repeated feature engineering work will result in a faster work cycle. One example of feature reuse is for sharing features between training and inference. The features used for training are roughly the same as the features used for making a prediction. Another example of feature reuse is between teams or projects. Features related to core enterprise concepts are usually used throughout different ML projects. To encourage reuse, features must be discoverable through the feature store.

### Feature consistency

Another benefit of centralizing features in a single feature store is **feature consistency**. Different data science teams might calculate similar features slightly differently. Those features might be the same concept and data scientists will have to agree to unify them. Then, if the process to calculate the feature changes, it changes for all the projects that use it. Or they might be a different concept, and data scientists will have to categorize them according to their separate quirks.

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3558841073771468"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-3558841073771468"
     data-ad-slot="5616977890"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>

### Point-in-time correctness

Feature stores also enable point-in-time correctness. The online store will always have the latest value for a feature. The offline store will store all historical values the feature had at any point. This enables data scientists to work with old values, aggregate time ranges, and so on. It also ensures the **reproducibility** of a model. At any point, we can recover the data used in a past training or in a past inference to debug the model.

### Data health

One can also generate statistics from the feature store to monitor the health of the data. If the **data drifts** (its health or structure changes over time), it can be automatically detected in the pipeline. Statistics can also help explain how a feature affects the predictions of each model.


### Data lineage

Using the catalog of features and models, you can draw a **data lineage**. This data lineage shows the data source used to create each feature. It also shows the models or other feature pipelines that use the feature. This graph enables debugging problems with data. It becomes trivial to track down where a piece of data came from and how it is being used.

### Online store

In some use cases, an ML model will have a low-latency requirement. For example, if a model is being called from an API call, the user will expect a response within a few seconds. This requires very fast access to features. Instead of calculating them each time, we can access the precalculated features in the online store. We know that the online store is always going to have the up-to-date last value of the feature. The online store is also optimized for sub-second queries for a fast response.

Don't use a feature store if you don't have to. But if your organization has a medium-sized ML team or several ML teams, or it has any of the needs I exposed, consider introducing a feature store. **It will only benefit your data science teams in the long run.**

### How to start using a feature store now?

You can build a feature store putting together your own components like Uber did with Michelangelo. You could use Hive for the offline store, Cassandra and Redis for the online store, Kafka for streaming real-time data and a Spark cluster to run ETL processes. On the other hand, you could also trust other people that have already built feature stores and use their solutions. You can choose an open-source solution and host it yourself. Some open-source solutions are:

- **Feast:** a minimal Feature Store that lacks some features like an ETL system and data lineage. Feast has integration support with tools from GCP (BigQuery as offline store and Datastore as online store) and AWS (Redshift, DynamoDB). It also has integration support for other agnostic tools like Snowflake, Redis or Kafka.
- **Hopsworks:** very complete Feature store. It includes tools like a Model Registry, multi-tenant governance, data lineage and much more. It can be deployed either in GCP, AWS, Azure or in premise. This is because Hopsworks provides its own technology, instead of integrating with other sources like Feast. Hopsworks is deployed in a Kubernetes cluster. This cluster includes a RonDB database for the online store and integrates with S3/Bucket for the offline store.

You can also choose a SaaS tool instead of open-source. Some examples include:

- **Databricks Feature Store:** it is integrated inside the Databricks Lakehouse Platform. Therefore, it is a good fit if you are already using Databricks as your ML platform. It uses Delta Lake as an offline store and can be integrated with either AWS DynamoDB, AWS RDS or AWS Aurora as an online store.
- **SageMaker Feature Store:** fully managed feature store by AWS. It uses S3 as an offline store and DynamoDB as an online store. It integrates with all the other tools in the SageMaker environment and with data sources within AWS like Redshift, Athena and S3.
- **Vertex AI Feature Store:** a feature store fully managed by Google in their cloud provider GCP. It uses BigQuery as an offline store and BigTable as an online store. It integrates with all the other tools in the Vertex AI environment and with BigQuery and GCS as data sources.
