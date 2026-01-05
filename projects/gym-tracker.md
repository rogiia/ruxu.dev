---
layout: project.njk
title: "Gym sessions tracker"
subtitle: "Self-hostable app to track gym sessions"
category: fitness
image: ""
github_link: "https://github.com/rogiia/gym-tracker"
project_link: ""
date: 2025-11-02
tags:
  - post
  - project
  - fitness
---

## Motivation

Track gym sessions as a heatmap to guilt myself into going more to the gym.

## Project Overview
Gym Tracker is a containerized web application for tracking gym sessions and muscle group training frequency. It displays a heatmap of workout sessions, tracks muscle group balance, and provides insights into training patterns.

## Features

- Log gym sessions, including which muscles were trained 
  - Can log sessions after the fact
- Visualize at a glance how often I'm training using a heatmap like Github's
- For each body part, see the last time I've trained it, to easily see which body parts I need to train the next session
- Self-hostable application

## Tech Stack:

Backend: Node.js with Express
Database: SQLite
Frontend: Vanilla JavaScript
Deployment: Docker container with Nginx reverse proxy

## Contributing

Contributions are welcome! Please feel free to submit a PR.

## License

This project is licensed under the MIT License
