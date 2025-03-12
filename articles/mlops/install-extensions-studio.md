---
layout: article.njk
title: How to install (and keep) extensions in SageMaker Studio
date: Last Modified
subtitle: Enhance the experience of your data scientists with SageMaker Studio extensions
category: mlops
image: assets/images/puzzle_sm.webp
publishedDate: 2022-08-07
tags:
  - post
  - article
  - mlops
---

<figure>
<img style="aspect-ratio: 3/2" alt="Puzzle painting" src="assets/images/puzzle.webp" />
</figure>

If you have been using SageMaker Studio, you might have missed some features that other modern IDEs have. As you might know, SageMaker Studio is built on top of the JupyterLab IDE. It extends it, integrating with other SageMaker resources. But this doesn't include any features for developer experience.

To enrich SageMaker Studio with the features that you need, you can install extensions to JupyterLab. You can do that using different methods.

You can use the **Extension Manager**, found in the menu on the left. It has a puzzle piece icon. Inside the Extension Manager, you can check the already installed extensions. You can also search for extensions if you write the name in the search bar. When you have found the extension you want to install, click the "Install" button. After installing all the needed extensions, restart the JupyterLab by refreshing the page. You should now be able to use them.

<figure style="display: flex">
<img alt="SageMaker Studio Extension Manager" src="assets/images/sagemaker_extensions.webp" style="width: 450px; margin: 0 auto" width="450" height="750" />
</figure>

Another method to install extensions is using the **Jupyter CLI tool**. For this method, you will need to know the name of the extension beforehand. Open a terminal inside the Studio and type the following commands:

```bash
conda activate studio
```

If the package you are trying to install is in the **NPM package registry**, you can install it using the Jupyter CLI:

```bash
jupyter labextension install my-extension@1.2.3
```

You can also install extensions that are in the **pip package registry** with a pip command:

```bash
pip install my-extension=1.2.3
```

Finally, execute the following command:

```bash
restart-jupyter-lab
```

and refresh the page.

Installing extensions has a problem in SageMaker Studio. Every time your JupyterServer shuts down, **it's going to lose all installed extensions and start from a clean state**. To keep all the installed extensions, you must create a **Lifecycle Configuration**. This Lifecycle Configuration will install all the extensions on startup. The Lifecycle Configuration will execute a script when the JupyterServer starts. The content of the script will be:

```bash
source activate studio
jupyter labextension install extension-foo
pip install extension-bar
restart-jupyter-server
```

As you can notice, in this script we activate the environment with `source activate studio` instead of `conda activate studio`, this is because conda cannot be used from the lifecycle configuration.

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

From now on, when users start their instance of SageMaker Studio, they will always have the extensions installed. They will be able to use them from the get go. They will also be able to still install and uninstall extensions from the interface and the terminal, but those changes will only last for the duration of the Studio session.
