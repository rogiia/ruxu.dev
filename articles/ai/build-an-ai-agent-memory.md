---
layout: article.njk
title: "Build a Basic AI Agent From Scratch: Memory"
subtitle: ""
category: ai
image: ""
date: 2026-09-24
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

In this part we will add **long-term memory**. Our agent will be able to save durable notes, keep a record of past sessions, find relevant previous work, and resume a session after it ends.

## Short-Term Memory vs Long-Term Memory

The `messages` list in our agent loop is already a kind of memory. It contains the system prompt, the user messages, the model replies and the tool results. This is **short-term memory**: it lasts while the process is running and it is sent to the model as context.

It has two important limits:

1. It disappears when the process ends.
2. It cannot grow forever because the model has a finite context window and every extra token costs time and money.

Long-term memory is different. It survives across sessions and is retrieved only when it is useful. We will use it for three different things:

- **Personal memory**: durable lessons about the agent's environment and conventions, such as "use `uv` for Python commands".
- **User memory**: stable user preferences and expectations, such as "prefers concise answers".
- **Session memory**: a transcript and summary of a previous conversation, so the agent can find or resume earlier work.

These are intentionally separate. A personal fact about a project is not a preference about a user, and a complete transcript should not be dumped into every new conversation.

## Memory Is a Security Boundary

Memory makes an agent more useful, but it also introduces a new privacy and safety problem: memory is persistent data. A bad or overly broad note can influence a later task long after the original context is gone.

For this first implementation, the system prompt gives the model strict rules:

```python
"- Long-term memory (read_memory / append_memory): at the start of a session, read "
"both personal and user memory. Personal memory is for durable lessons, environment "
"facts, and conventions; user memory is for stable preferences and expectations. "
"Append only concise, useful facts that are likely to hold in future sessions. Never "
"store secrets, credentials, or transient task details.\n"
```

This is important for a few reasons:

- API keys, passwords and tokens must never be put in the model context or a persistent file.
- A one-off instruction such as "use a blue heading in this document" is not useful long-term memory.
- Prompt-injected content from a web page or file must never be promoted into memory.
- Notes should be concise so they can be reviewed and corrected by a human.

The memory directory is also deliberately outside the Docker project mount. The sandbox still contains action tools, while memory is host-side state managed by the harness. That means memory tools are not arbitrary filesystem access: they only expose the specific files managed by `MemoryStore`.

## A File-Backed Memory Store

We do not need a database or vector store to start. A few files are enough, easy to inspect, and easy to back up. The default directory is `~/.agent-harness/memory`:

```text
~/.agent-harness/memory/
  personal.md
  user.md
  sessions/
    abc123.json
    def456.json
```

`personal.md` and `user.md` contain append-only notes. Each session is a JSON document with an ID, timestamps, a summary, and the serializable conversation messages.

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

The `_notes_path` helper only accepts `personal` and `user`. It does not let the model choose an arbitrary filename:

```python
def _notes_path(self, scope: str) -> Path:
    if scope not in {"personal", "user"}:
        raise ValueError("scope must be 'personal' or 'user'")
    return self.root / f"{scope}.md"
```

That small validation is important. The model should not be able to turn a memory tool into a generic read/write primitive and bypass the path-scoping policy from the security parts of this series.

## Saving Sessions Safely

When we create a session, we save its initial messages and update it after every user message, assistant response and tool-call batch. This makes the transcript durable even if the process is interrupted.

```python
def create_session(self, session_id: str, messages: list[dict]) -> None:
    now = _timestamp()
    self._write_session(session_id, {
        "id": session_id,
        "created_at": now,
        "updated_at": now,
        "summary": "",
        "messages": _serializable_messages(messages),
    })


def save_messages(self, session_id: str, messages: list[dict]) -> None:
    session = self.load_session(session_id)
    session["messages"] = _serializable_messages(messages)
    session["updated_at"] = _timestamp()
    self._write_session(session_id, session)
```

The messages returned by the OpenAI client are objects, not always dictionaries, so we convert them before writing JSON:

```python
def _serializable_messages(messages: list[Any]) -> list[dict[str, Any]]:
    result = []
    for message in messages:
        if isinstance(message, dict):
            result.append(message)
        elif hasattr(message, "model_dump"):
            result.append(message.model_dump(exclude_none=True))
        else:
            raise TypeError(f"Cannot persist message of type {type(message).__name__}")
    return result
```

We also write through a temporary file and atomically replace the real session file:

```python
def _write_session(self, session_id: str, data: dict[str, Any]) -> None:
    path = self._session_path(session_id)
    temp = path.with_suffix(".tmp")
    temp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temp, path)
```

If the program crashes halfway through a write, the old session JSON remains intact rather than being replaced with a half-written file.

## Session Summaries and Search

The full transcript is useful when we need detail, but it is too large to show for every old session. Each session therefore has a short summary.

The agent has a `write_session_summary` tool and is instructed to call it before its final response on a substantial task. The summary should include the goal, completed work, important decisions and anything remaining.

As a fallback, the harness creates a small summary when a session ends without one:

```python
def ensure_summary(self, session_id: str) -> None:
    session = self.load_session(session_id)
    if session.get("summary", "").strip():
        return

    excerpts = []
    for message in session.get("messages", []):
        if message.get("role") not in {"user", "assistant"}:
            continue
        content = message.get("content")
        if content:
            excerpts.append(f"{message['role']}: {content}")
    session["summary"] = "\n".join(excerpts[-6:])[:2000] or "Session ended without messages."
    session["updated_at"] = _timestamp()
    self._write_session(session_id, session)
```

This fallback is deliberately simple. It does not make another LLM call, so ending a session does not unexpectedly cost money or fail because the model endpoint is unavailable.

For retrieval, our first version uses keyword search across the saved JSON records:

```python
def search_sessions(self, query: str) -> list[dict[str, str]]:
    terms = set(re.findall(r"\w+", query.lower()))
    matches = []
    for session in self.list_sessions():
        record = self.load_session(session["id"])
        haystack = json.dumps(record, ensure_ascii=False).lower()
        if all(term in haystack for term in terms):
            matches.append(session)
    return matches
```

This is not semantic search. Searching for `cache bug` will find a session containing both words, but it will not understand that "stale response" might mean the same thing. That is acceptable for now: there is no embedding model, no external service, and no opaque database index to debug.

Later, when there are too many sessions or keyword search is no longer good enough, this method can be replaced with full-text search or vector retrieval. The interface for the agent stays the same.

## Memory Tools

The agent needs tools to access this store. All of them run in-process, alongside the scratchpad and to-do list, because they hold harness state rather than acting on the project files:

```python
def read_memory(scope: str) -> str:
    return _get_store().read_notes(scope)


def append_memory(scope: str, content: str) -> str:
    return _get_store().append_notes(scope, content)


def list_sessions() -> str:
    sessions = _get_store().list_sessions()
    if not sessions:
        return "No saved sessions."
    return "\n".join(
        f"{item['id']} | {item['updated_at']} | {item['summary'][:160] or '(no summary)'}"
        for item in sessions
    )
```

There are six memory tools:

- `read_memory`: read `personal` or `user` notes.
- `append_memory`: append a concise durable note.
- `list_sessions`: list saved session IDs, timestamps and summaries.
- `search_sessions`: find prior sessions by keywords.
- `read_session`: read a selected summary and transcript.
- `write_session_summary`: save the current session's summary.

These tools are in `PLANNING_TOOLS`, so they do not prompt for permission on every call. That is a reasonable default because they only access the configured memory directory. It also means the memory directory should be treated as sensitive user data and protected with normal operating-system permissions and backups.

## Starting and Resuming Sessions

We add three command-line flags:

```python
parser.add_argument(
    "--memory-dir",
    default="~/.agent-harness/memory",
    help="Directory for durable personal/user memory and saved sessions.",
)
parser.add_argument(
    "--list-sessions",
    action="store_true",
    help="List saved sessions in --memory-dir and exit.",
)
parser.add_argument(
    "--resume",
    metavar="SESSION_ID",
    help="Resume a saved session by ID.",
)
```

At startup, the harness creates the store. `--list-sessions` is useful when the agent is not running, and `--resume` loads the old messages and continues under the same session ID:

```python
memory_store = MemoryStore(Path(cli_args.memory_dir))

if cli_args.list_sessions:
    for session in memory_store.list_sessions():
        print(f"{session['id']} | {session['updated_at']} | {session['summary'][:160]}")
    raise SystemExit(0)

resumed_messages = None
if cli_args.resume:
    resumed_messages = memory_store.load_session(cli_args.resume)["messages"]

active_session_id = cli_args.resume or session_creds.session_id
```

When the program exits, even through the `finally` cleanup path, it ensures that the current session has a summary:

```python
try:
    agent_loop(...)
finally:
    memory_store.ensure_summary(active_session_id)
    sandbox.close()
    audit.close()
```

This lets the next session recover useful context even when the agent forgot to call `write_session_summary` itself.

## Let's Test It

First, we can ask the agent to remember a stable preference:

```text
$ uv run agent.py
Session:          z7Pq3hM4kA
Memory directory: /home/roger/.agent-harness/memory
Type \exit to quit, or \sessions to list saved sessions.

You: I prefer concise answers. Remember that for future sessions.
  [tool] read_memory({'scope': 'user'})
  [tool result] (empty)
  [tool] append_memory({'scope': 'user', 'content': 'The user prefers concise answers.'})
  [tool result] Saved user memory.
Assistant: I will keep answers concise in future sessions.
```

On another day, the agent can read that note before it answers:

```text
You: Help me understand this project.
  [tool] read_memory({'scope': 'personal'})
  [tool result] Use uv for Python commands.
  [tool] read_memory({'scope': 'user'})
  [tool result] The user prefers concise answers.
Assistant: I will inspect the project and keep the explanation concise.
```

Now imagine that a migration task ended halfway through. We can see the saved sessions:

```bash
$ uv run agent.py --list-sessions
z7Pq3hM4kA | 2026-09-24T10:24:51+00:00 | Investigated the failing cache migration; schema update remains.
```

And resume it later:

```bash
$ uv run agent.py --resume z7Pq3hM4kA
Session:          z7Pq3hM4kA
Memory directory: /home/roger/.agent-harness/memory
You: Continue the migration and run the tests.
```

The old messages are restored, so the model has the conversation context it had before the process stopped. If it only needs to find related work rather than resume it, it can call `search_sessions`, inspect the matching summary, and only use `read_session` if it needs the transcript.

## Testing the Store

The memory store does not need a model or Docker to test. We can exercise it using a temporary directory:

```python
def test_lists_and_searches_saved_sessions(self):
    self.store.create_session("session-one", [
        {"role": "system", "content": "system"},
        {"role": "user", "content": "Investigate the cache bug."},
    ])
    self.store.write_summary("session-one", "Found and fixed the cache bug.")

    self.assertEqual(self.store.list_sessions()[0]["id"], "session-one")
    self.assertEqual(self.store.search_sessions("cache")[0]["id"], "session-one")
```

The test suite also verifies that personal and user notes survive a new read, and that the fallback summary contains the user's last request when no explicit summary was saved.

## What You've Built

Our agent now has durable memory without turning its whole history into every model request:

1. **Scoped notes** store stable environment facts and user preferences in human-readable Markdown files.
2. **Persistent sessions** save JSON transcripts atomically, so a crash does not corrupt prior work.
3. **Summaries and retrieval** let the agent list, search and inspect old work without automatically loading every session.
4. **Resumable conversations** continue a known session with `--resume`.
5. **Memory safety rules** limit saved information to concise, durable facts and explicitly exclude secrets and transient data.

This is a deliberately small memory system, but it solves the main problem: the agent no longer starts every session as if it has never met you or your project before.
