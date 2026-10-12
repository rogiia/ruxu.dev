---
layout: article.njk
title: "Build a Basic AI Agent From Scratch: Memory"
subtitle: ""
category: ai
image: ""
date: 2026-10-12
tags:
  - post
  - article
  - ai
  - agents
---

Previous parts of *Build a Basic AI Agent From Scratch*:
- [Basic Agent](https://www.ruxu.dev/articles/ai/build-a-basic-ai-agent/)
- [Tools](https://www.ruxu.dev/articles/ai/build-an-ai-agent-with-tools/)
- [Long Task Planning](https://www.ruxu.dev/articles/ai/build-an-ai-agent-planning/)
- [Human in the Loop & Security](https://www.ruxu.dev/articles/ai/build-an-ai-agent-human-in-the-loop-security/)
- [Security II](https://www.ruxu.dev/articles/ai/build-an-ai-agent-security-2/)
- [Security III](https://www.ruxu.dev/articles/ai/build-an-ai-agent-security-3/)

> You can find and clone this code in this blog series' <a href="https://github.com/rogiia/basic-agent-harness" target="_blank">Github repo</a>.

In the previous parts we made our agent capable, autonomous and much safer. It can use tools in a Docker sandbox, plan long tasks, ask for help, respect a tool policy, and stop when it reaches a resource limit. But every time we close the program, it forgets everything.

This is a big limitation. The agent might learn that you prefer concise answers, that a project uses `uv`, or that a migration was partially completed yesterday. On the next session it has to discover all of that again.

In this part we will add **long-term memory**. Our agent will be able to save durable notes about the project and its user, then use them in future sessions.

## Short-Term Memory vs Long-Term Memory

The `messages` list in our agent loop is already a kind of memory. It contains the system prompt, the user messages, the model replies and the tool results. This is **short-term memory**: it lasts while the process is running and it is sent to the model as context.

It has two important limits:

1. It disappears when the process ends.
2. It cannot grow forever because the model has a finite context window and every extra token costs time and money.

Long-term memory is different. It survives across sessions and is retrieved only when it is useful. We will use it for two different things:

- **Project memory**: durable lessons about the project environment and conventions, such as "use `uv` for Python commands".
- **User memory**: stable user preferences and expectations, such as "prefers concise answers".

## Security for Memory

Memory makes an agent more useful, but it also introduces a new privacy and safety problem: memory is persistent data. A bad or overly broad note can influence a later task long after the original context is gone.

For this first implementation, the system prompt gives the model strict rules:

```python
"- Long-term memory (read_memory / append_memory): at the start of a session, read "
"both project and user memory. Project memory is for durable lessons, environment "
"facts, and conventions; user memory is for stable preferences and expectations. "
"Append only concise, useful facts that are likely to hold in future sessions. Never "
"store secrets, credentials, or transient task details.\n"
```

This is important for a few reasons:

- API keys, passwords and tokens must never be put in the model context or a persistent file.
- A one-off instruction such as "use a blue heading in this document" is not useful long-term memory.
- Prompt-injected content from a web page or file must never be promoted into memory.
- Notes should be concise so they can be reviewed and corrected by a human.

By default, the memory directory is outside the Docker project mount. The agent accesses it through `MemoryStore`, not through its filesystem tools.

## File-Backed Memory Store

We do not need a database or vector store to start. A few files are enough, easy to inspect, and easy to back up. The default directory is `~/.agent-harness/memory`:

```text
~/.agent-harness/memory/
  project.md
  user.md
```

`project.md` and `user.md` contain append-only notes. With this design in mind, let's implement the memory store:

```python
class MemoryStore:
    """Persist agent notes, user preferences, and complete session records."""

    def __init__(self, root: Path):
        self.root = root.expanduser()
        self.sessions_dir = self.root / "sessions"
        self.root.mkdir(parents=True, exist_ok=True)
        self.sessions_dir.mkdir(exist_ok=True)

    def read_notes(self, scope: str) -> str:
        path = self._notes_path(scope)
        return path.read_text(encoding="utf-8") if path.exists() else "(empty)"

    def append_notes(self, scope: str, content: str) -> str:
        path = self._notes_path(scope)
        with path.open("a", encoding="utf-8") as file:
            if path.stat().st_size:
                file.write("\n")
            file.write(content.strip() + "\n")
        return f"Saved {scope} memory."
```

The `_notes_path` helper only accepts `project` and `user`. It doesn't let the model choose an arbitrary filename:

```python
def _notes_path(self, scope: str) -> Path:
    if scope not in {"project", "user"}:
        raise ValueError("scope must be 'project' or 'user'")
    return self.root / f"{scope}.md"
```

## Memory Tools

The agent needs tools to access this store. All of them run in-process, alongside the scratchpad and to-do list, because they hold harness state rather than acting on the project files:

```python
def read_memory(scope: str) -> str:
    return _get_store().read_notes(scope)


def append_memory(scope: str, content: str) -> str:
    return _get_store().append_notes(scope, content)


```

To work with long-term notes, the agent gets two tools:

- `read_memory`: read `project` or `user` notes.
- `append_memory`: append a concise durable note.

These tools are in `PLANNING_TOOLS`, so they do not prompt for permission on every call. That is a reasonable default because they only access the configured memory directory. It also means the memory directory should be treated as sensitive user data and protected with normal operating-system permissions and backups.

## Let's Test It

First, we can ask the agent to remember a stable preference:

```text
$ uv run agent.py
Session:          z7Pq3hM4kA
Memory directory: /home/xxxxx/.agent-harness/memory

You: I prefer concise answers. Remember that for future sessions.
  [tool] read_memory({'scope': 'user'})
  [tool result] (empty)
  [tool] append_memory({'scope': 'user', 'content': 'The user prefers concise answers.'})
  [tool result] Saved user memory.
Assistant: I will keep answers concise in future sessions.
```

Next time, the agent can read that note before it answers:

```text
You: Help me understand this project.
  [tool] read_memory({'scope': 'project'})
  [tool result] Use uv for Python commands.
  [tool] read_memory({'scope': 'user'})
  [tool result] The user prefers concise answers.
Assistant: I will inspect the project and keep the explanation concise.
```

## What You've Built

Our agent now has durable memory without turning its whole history into every model request:

1. **Scoped notes** store stable environment facts and user preferences in human-readable Markdown files.
2. **Memory safety rules** limit saved information to concise, durable facts and explicitly exclude secrets and transient data.

The agent can now keep useful facts between runs, so it does not have to rediscover the same preferences and project conventions every time.

## What's next

This article introduced the foundations for sessions. In the next article, we will build on them: listing past sessions, resuming an unfinished session, and compacting a long session so it can continue within the model's context window.
