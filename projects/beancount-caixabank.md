---
layout: project.njk
title: "CaixaBank importer for Beancount"
subtitle: "beancount-caixabank provides a Beancount importer for converting CaixaBank Excel statement exports to the Beancount format."
category: finances
image: ""
github_link: "https://github.com/rogiia/beancount-caixabank"
project_link: ""
date: 2026-01-04
tags:
  - post
  - project
  - finances
---

## Motivation

Easily import CaixaBank bank statements into your Beancount ledger.

## Features

- **Format Support**: Handles CaixaBank Excel exports (.xls and .xlsx)
- **Robust Parsing**:
  - Flexible header detection (handles statements with metadata rows)
  - Supports both Excel date serial numbers and DD/MM/YYYY string dates
  - European number format parsing (comma as decimal, dot as thousands separator)
- **Full Beancount Integration**: Creates proper transactions with metadata, payee, and narration

## Contributing

Contributions are welcome! Please feel free to submit a PR.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](https://github.com/rogiia/beancount-caixabank/blob/main/LICENSE.txt) file for details.
