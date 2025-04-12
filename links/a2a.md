---
layout: link.njk
title: "[Link] The Agent2Agent Protocol"
category: ai
externalUrl: https://google.github.io/A2A/
date: 2025-04-12
tags:
  - post
  - link
  - ai
---

Just in the middle of the year of agents, Google has released two great tools for building agents: the <a href="https://google.github.io/A2A/" target="_blank">Agent2Agent (A2A)</a> protocol and the <a href="https://google.github.io/adk-docs/" target="_blank">Agent Development Kit (ADK)</a>.

The Agent2Agent Protocol is based on <a href="https://www.jsonrpc.org/specification" target="_blank">JSON RPC</a>, working both over plain HTTP and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events" target="_blank">SSE</a>. It is also built with security in mind, it implements the <a href="https://swagger.io/docs/specification/v3_0/authentication/" target="_blank">OpenAPI Authentication Specification</a>.

The agents published using this protocol will advertise themselves to other agents via the Agent Card, which by default can be found at the path `https://agent_url/.well-known/agent.json`. The Agent Card will include information about the agent's capabilities and requirements, which will help other agents decide to ask it for help or not.

The specification includes definitions for these concepts, which agents can use to exchange between themselves: Task, Artifact, Message, Part and Push Notification.

This new protocol is not meant to replace <a href="https://modelcontextprotocol.io/introduction" target="_blank">Anthropic's Model Context Protocol</a>. They are actually meant to work together. While MCP allows agents to have access to external tools and data sources, A2A allows agents to communicate and work together.
