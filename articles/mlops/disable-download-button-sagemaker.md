---
layout: article.njk
title: How to disable the download button in SageMaker Studio
date: Last Modified
subtitle: If you want to ensure that your data scientists' cloud environment is secure from data leaks, remove this feature from SageMaker
category: mlops
image: assets/images/security.webp
publishedDate: 2022-08-06
tags:
  - article
  - mlops
---

<figure>
<img style="aspect-ratio: 897/467" alt="Painting desk" src="{{ image }}" />
</figure>

Many enterprises choose a cloud environment to power the work of their data science team. If you chose the AWS SageMaker Studio, this article might interest you. Having both the data lake and the data scientist environment makes it easy to integrate them. You can choose what data any given data scientist is able to see. You might want a data scientist only to be able to use this data inside the SageMaker Studio environment. However, SageMaker Studio has a download button that lets data scientists download any data they have been working on. Once they have downloaded data to their computers, they are free to share it anywhere and with anyone.

Luckily, **it is possible to disable this download button**. Recently, it was only possible to disable the download button in SageMaker Notebooks. [This article from Ujjwal Bhardwaj](https://ujjwalbhardwaj.me/post/disable-download-button-on-the-sagemaker-jupyter-notebook/) shows how to disable it in SageMaker Notebooks.

But AWS updated SageMaker Studio and now it can also disable the download button. This update lets us configure Studio to use JupyterLab version 3. In this version, JupyterLab refactored some features, including the download button. Now, **those features are plugins included by default by JupyterLab, instead of hardcoded in the JupyterLab core**. This means that it is now possible to disable these plugins and they won't show up in the UI.

The plugins that include a download button in the JupyterLab UI are the following:
- **@jupyterlab/docmanager-extension:download**
- **@jupyterlab/filebrowser-extension:download**

There are a couple of ways to disable those plugins. The most straightforward is to run these commands in a SageMaker Studio terminal:
```bash
conda activate studio
jupyter labextension disable jupyterlab/docmanager-extension:download
jupyter labextension disable @jupyterlab/filebrowser-extension:download
restart-jupyter-server
```

You can also use the JupyterLab configuration files. Edit the file `/opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json` with the following content:

```json
{
  "disabledExtensions": {
    "@jupyterlab/docmanager-extension:download": true,
    "@jupyterlab/filebrowser-extension:download": true
  }
}
```

and run the command:
```bash
restart-jupyter-server
```

You might also have to refresh the page to see the changes take place.

**The problem with these approaches is that changes will only last for the duration of the session**. To make the changes permanent, you have to create a **Studio Lifecycle Configuration**. The Lifecycle Configuration will execute a script when the JupyterServer starts. In this script, you will edit the file in the previous example.

The content of the script will be:

```bash
echo "{" > /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
echo "  \\"disabledExtensions\\": {" >> /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
echo "    \\"@jupyterlab/docmanager-extension:download\\": true," >> /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
echo "    \\"@jupyterlab/filebrowser-extension:download\\": true" >> /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
echo "  }" >> /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
echo "}" >> /opt/conda/envs/studio/etc/jupyter/labconfig/page_config.json
restart-jupyter-server
```

There are many ways to create a Lifecycle configuration. You can do it via the Console, using a Cloudformation Stack, or via AWS CLI. Using the CLI you could do:

```bash
aws sagemaker create-studio-lifecycle-config \
--region <your-region> \
--studio-lifecycle-config-name my-studio-lcc \
--studio-lifecycle-config-content $LCC_CONTENT \
--studio-lifecycle-config-app-type JupyterServer 
```

$LCC_CONTENT is a string with the content of the script described before. Then, when you create a user profile in the SageMaker Domain, you can bind the Lifecycle Configuration to it:

```bash
aws sagemaker create-user-profile --domain-id <DOMAIN-ID> \ --user-profile-name <USER-PROFILE-NAME> \ --region <REGION> \ --user-settings '{ "JupyterServerAppSettings": {   "LifecycleConfigArns":     ["<LIFECYCLE-CONFIGURATION-ARN-LIST>"]   } }'
```

From now on, every time a data scientist opens their instance of SageMaker Studio, it should never display a download button. This efectively blocks them from downloading any files located in their Studio, as long as they are not able to revert these changes themselves from their terminal. Also, note that disabling the download plugin only removes all the download buttons from the interface. This does not mean that if there are other means of downloading files those are also blocked.
