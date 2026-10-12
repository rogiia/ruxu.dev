---
layout: article.njk
title: "Build a Basic AI Agent From Scratch: Sessions"
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
- [Memory](https://www.ruxu.dev/articles/ai/build-an-ai-agent-memory/)

> You can find and clone this code in this blog series' <a href="https://github.com/rogiia/basic-agent-harness" target="_blank">Github repo</a>.

In the previous part we gave our agent long-term memory. It can save project conventions and user preferences, then read those notes the next time it starts. This means we no longer have to explain the same things every time we use it.

But notes are not enough to continue unfinished work. Imagine asking the agent to migrate a project, closing it for the day, and coming back tomorrow. Remembering that the project uses `uv` is useful, but we also need it to remember what we asked, what it changed, and what still needs to be done.

For that, we need **sessions**. In this part we will save conversations, add summaries so we can find them again, and let the user pick up a previous conversation where it left off. These features use the same `MemoryStore` implementation as the previous article.

## What Is a Session?

A session is one conversation with the agent. It can contain several user requests, many model responses and hundreds of tool calls. It starts with a system prompt and grows as we talk to the agent and it works for us.

Until now, that conversation has lived in the `messages` list. We will give it an ID and save it to disk. Closing the program will end the current run, but it will not erase the conversation.

There is an important difference between session history and long-term notes:

- **Project and user memory** contain stable facts useful across many tasks.
- **Session history** contains the conversation for a particular piece of work, including temporary details and tool results.

We don't want the agent to load every past conversation into every new request. Instead, we will let it find a relevant session when it needs one, or let the user explicitly resume it.

## Saving Sessions

Our memory directory now contains a `sessions` directory alongside the notes:

```text
~/.agent-harness/memory/
  project.md
  user.md
  sessions/
    z7Pq3hM4kA.json
    t8Nq2vL6bC.json
```

Each JSON file contains the session ID, creation and update timestamps, a summary and the conversation messages. The harness creates the record when a new session starts:

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

The messages returned by the OpenAI client are objects, not always dictionaries. Before writing them as JSON, we convert them with `model_dump`:

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

This also preserves the structured tool calls. Saving only the visible assistant text would lose which tools the model requested and the IDs connecting those calls to their results.

## Writing Without Corrupting the Session

We will update the file often, so we should avoid overwriting it directly. If the program stops halfway through a write, the JSON might be incomplete and we would lose the saved conversation.

Instead, we write a temporary file and atomically replace the session file:

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

Until the replacement happens, the previous file stays intact. This is a simple approach for our single-process agent; it is not a locking system for several agents writing to the same session at once.

We also validate session IDs before using them as filenames:

```python
def _session_path(self, session_id: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", session_id):
        raise ValueError("session id contains invalid characters")
    return self.sessions_dir / f"{session_id}.json"


def load_session(self, session_id: str) -> dict[str, Any]:
    path = self._session_path(session_id)
    if not path.exists():
        raise ValueError(f"No saved session with id '{session_id}'.")
    return json.loads(path.read_text(encoding="utf-8"))
```

An ID is a reference to a saved conversation, not an arbitrary filesystem path. Allowing only letters, numbers, underscores and hyphens prevents `../` traversal through this interface.

## Connecting Persistence to the Agent Loop

At the start of the loop, we either use the initial system message or the messages loaded from a previous session:

```python
messages = resumed_messages or initial_messages
if memory_store is not None and session_id is not None:
    if resumed_messages is None:
        memory_store.create_session(session_id, messages)
    configure_memory(memory_store, session_id)
```

`configure_memory` gives the host-side tools the store and the active session ID. This is how the summary tool knows which session to update.

Then we save the messages at three points:

1. After appending a new user message.
2. After appending a model response.
3. After completing a batch of tool calls and appending their results.

At each point, the code is the same:

```python
if memory_store is not None and session_id is not None:
    memory_store.save_messages(session_id, messages)
```

We don't wait until the user types `\exit`. If the process stops unexpectedly, the last successfully saved messages are still there. A stop during tool execution can still leave an incomplete tool-call batch, so this is conversation persistence rather than an exact checkpoint of a running command.

The saved messages are the current working history. Our existing context budget can trim that history, and the next save will contain the trimmed version. It is not a separate, immutable archive of every message ever produced.

## Session Summaries

When we have many saved sessions, IDs alone won't help us remember which one we need. We will give each session a short summary containing its goal, completed work, important decisions and anything remaining.

The model can write this summary with a tool:

```python
def write_session_summary(summary: str) -> str:
    if session_id is None:
        raise RuntimeError("Memory has not been configured.")
    return _get_store().write_summary(session_id, summary)
```

The store replaces the previous summary and updates the timestamp:

```python
def write_summary(self, session_id: str, summary: str) -> str:
    session = self.load_session(session_id)
    session["summary"] = summary.strip()
    session["updated_at"] = _timestamp()
    self._write_session(session_id, session)
    return "Saved session summary."
```

We explain when to use it in the system prompt:

```python
"- Past sessions (list_sessions / search_sessions / read_session): use these to find "
"and inspect prior work. Before your final response on a substantial task, call "
"write_session_summary with the goal, completed work, decisions, and remaining work.\n\n"
```

This matters when a session has several tasks. A useful summary should reflect the current state of the work, not just the first thing the user asked.

### A Fallback Summary

The agent might forget to call the summary tool, or the session might stop before it gets the chance. In the cleanup path, the harness calls `ensure_summary`:

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

This takes the last six user/assistant messages with content and keeps up to 2,000 characters. It is an excerpt, not an LLM-generated summary, but it gives us something to recognize the session by without another model call.

The fallback only runs when the summary is empty. It doesn't refresh an old summary automatically, so keeping a meaningful summary up to date is still the model's job.

## Listing Saved Sessions

The store reads the JSON files and returns a small record for each one:

```python
def list_sessions(self) -> list[dict[str, str]]:
    sessions = []
    for path in self.sessions_dir.glob("*.json"):
        try:
            session = json.loads(path.read_text(encoding="utf-8"))
            sessions.append({
                "id": session["id"],
                "updated_at": session["updated_at"],
                "summary": session.get("summary", ""),
            })
        except (OSError, json.JSONDecodeError, KeyError):
            continue
    return sorted(sessions, key=lambda item: item["updated_at"], reverse=True)
```

The most recently updated session comes first. Unreadable or malformed records are skipped so one bad file does not prevent us from seeing the others.

We expose listing in three places:

- **`--list-sessions`** lists sessions and exits, before starting Docker or calling the model.
- **`\sessions`** lists sessions from the interactive prompt without making a model request.
- **`list_sessions`** is a tool the model can call when it needs to find previous work.

The command-line flags use the same memory directory as the previous article:

```python
parser.add_argument(
    "--memory-dir",
    default="~/.agent-harness/memory",
    help="Directory for durable project/user memory and saved sessions.",
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

If we use a custom `--memory-dir`, we need to use that same directory when listing or resuming those sessions.

## Searching and Reading Previous Work

Sometimes we remember the problem we worked on but not the session ID. The `search_sessions` tool uses keyword search across the saved records:

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

All query terms must appear somewhere in the serialized record. This searches both the summary and the saved messages, using case-insensitive substring matching. It is not semantic search: asking for `stale response` won't necessarily find a session described as a `cache bug`.

For now, this is enough to find earlier work without adding an embedding model or a vector database. We can improve retrieval later without changing the tool the agent calls.

After finding a match, the model can use `read_session`:

```python
def read_session(session_id: str) -> str:
    session = _get_store().load_session(session_id)
    transcript = "\n".join(
        f"{message.get('role', 'unknown')}: {message.get('content') or '[tool call]'}"
        for message in session.get("messages", [])
    )
    return f"Summary:\n{session.get('summary') or '(no summary)'}\n\nTranscript:\n{transcript[:12000]}"
```

This returns the summary and up to 12,000 characters of readable transcript. Messages containing only structured tool calls appear as `[tool call]`; the complete serialized call remains in the JSON file. Search results show shorter summary previews so the model can select a session before requesting more detail.

These tools run on the host, alongside the other memory tools, and are registered as `PLANNING_TOOLS`. Their results still pass through the tool-result wrapping and output limits we added in the security chapters.

## Resuming a Session

Reading a past session brings information into a new conversation. **Resuming** restores its saved message history and continues updating the same record.

At startup, we load the selected session:

```python
memory_store = MemoryStore(Path(cli_args.memory_dir))
resumed_messages = None
if cli_args.resume:
    try:
        resumed_messages = memory_store.load_session(cli_args.resume)["messages"]
    except (ValueError, KeyError) as e:
        print(f"Could not resume session: {e}")
        raise SystemExit(2)
```

The active ID is either the requested ID or a newly generated one:

```python
active_session_id = cli_args.resume or session_creds.session_id
```

We pass that ID and `resumed_messages` into `agent_loop`. The loop then waits for the next user request. It does not immediately replay the old tool calls.

Resuming restores conversation messages, including the saved system prompt. It doesn't restore the Python process: the scratchpad and to-do list start empty, a new sandbox is created, and resource counters and credentials are fresh. The project files are whatever is currently on disk. We should resume from the intended project directory so the old conversation and the current environment refer to the same work.

## Let's Test It!

Here is an illustrative interaction. We start by asking the agent to investigate a problem without making changes:

```text
$ uv run agent.py
Session:          z7Pq3hM4kA
Memory directory: /home/xxxxx/.agent-harness/memory

You: Investigate the cache bug. Don't make changes yet.
...
  [tool] write_session_summary({'summary': 'Investigated the cache bug. The cache key omits the locale. No files changed. Next: include locale in the key and add a regression test.'})
  [tool result] Saved session summary.
Assistant: The cache key does not include the locale, so requests in different languages can reuse the same response. I have not changed any files.
You: \exit
```

Later, we can find the saved conversation from the terminal:

```text
$ uv run agent.py --list-sessions
z7Pq3hM4kA | 2026-10-12T10:24:51+00:00 | Investigated the cache bug. The cache key omits the locale. No files changed. Next: include locale in the key and add a regression test.
```

Then we start the agent in the same project directory and resume it:

```text
$ uv run agent.py --resume z7Pq3hM4kA --mode acceptEdits
Session:          z7Pq3hM4kA
Memory directory: /home/xxxxx/.agent-harness/memory

You: Fix the issue we investigated and run the tests.
```

The model receives the earlier conversation along with this new request. It can inspect the current files, rebuild its task list and continue the work. We don't have to describe the investigation again.

During any active conversation, typing `\sessions` also shows the saved IDs and summary previews. If we want to consult previous work without resuming it, we can ask the agent to search instead:

```text
You: Find our previous investigation into the cache bug and remind me what we found.
  [tool] search_sessions({'query': 'cache bug'})
  [tool result] z7Pq3hM4kA | 2026-10-12T10:24:51+00:00 | Investigated the cache bug. The cache key omits the locale...
  [tool] read_session({'session_id': 'z7Pq3hM4kA'})
  [tool result] Summary:
Investigated the cache bug...
...
```

## Testing the Store

Persistence and search can be tested without Docker or a running model. The store tests use a temporary directory, create a session, write its summary and verify that it can be found:

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

Another test verifies that a session without an explicit summary gets a fallback containing the user's request. We can run the store tests with:

```bash
$ uv run python -m unittest test_memory.py
```

## Session Compaction

> Draft section: to be completed when session compaction is implemented.

Saving and resuming a conversation does not make the model's context window larger. A long-running session will eventually need to reduce the messages sent to the model while keeping the information required to continue its task.

Our current resource-limit code already trims older messages with a basic, deterministic notice. This section will cover the session-compaction implementation once it is ready: when compaction runs, what information it preserves, and how the compacted context is saved and resumed. The session summary used in listings is not itself a compaction of the message history.

## What You've Built

Our agent can now keep a conversation between runs and use earlier work when it is relevant:

1. **Saved sessions** persist the working message history with an ID and timestamps.
2. **Atomic writes** avoid replacing a valid session with partially written JSON.
3. **Summaries** make previous conversations easier to recognize, with a fallback when the model doesn't write one.
4. **Listing and retrieval** let the user or the agent find and inspect previous work.
5. **Resuming** restores a selected conversation so the user can continue it in a new run.

We can close the agent after an investigation and come back to it later, instead of starting the conversation again from scratch.
