---
layout: article.njk
title: "Build a Basic AI Agent From Scratch: Session Management"
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

> You can find and clone this code in this blog series' <a href="https://github.com/rogiia/basic-agent-harness" target="_blank">GitHub repo</a>.

In the previous part we gave our agent long-term memory. It can save project conventions and user preferences, then read those notes the next time it starts. This means we no longer have to explain the same things every time we use it.

But notes are not enough to continue unfinished work. Imagine asking the agent to migrate a project, closing it for the day, and coming back tomorrow. Remembering that the project uses `uv` is useful, but we also need it to remember what we asked, what it changed, and what still needs to be done.

For that, we need **sessions**. In this part we will save conversations, find and resume previous work, and recover gracefully after an interruption. In the next part we will compact long conversations without losing the original transcript, and add titles, branches, archiving and exports.

The implementation is in `agent-sessions/` in the companion repository. It builds on the previous part's `MemoryStore` with a new `SessionStore`. We are still using JSON files as a medium to save agent-related information.

## What Is a Session?

A session is one conversation with the agent. It's the collection of all the user messages, model responses and tool calls that happened during a use of the agent.

Until now, that conversation has lived in the `messages` list in the harness' memory. To make that session savable and resumable, we will give it an ID and save it to the disk. Closing the program will end the current run, but it will not erase the conversation.

It's important to note that, although we will be saving sessions in the same directory as memories, agent sessions and memory are two separate things. The memories that an agent collected during a session are not stored in the session information, but separately into the project and user memory files.

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

We start with the record from `MemoryStore`: a session ID, creation and update timestamps, a summary and the conversation messages. The harness creates it when a new session starts:

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

### The Working Context and Full Transcripts

There is a problem with keeping only one message list. We want to reduce the context sent to the model when a conversation gets too long, but we don't want that to erase the original conversation from disk.

Our `SessionStore` keeps two lists:

- **`messages`** is the working context sent to the model and restored on resume. Compaction can replace older turns with a summary.
- **`transcript`** keeps the original persisted messages, including structured tool calls and results, even after compaction.

We also keep `compactions`, a list of summary events, and metadata such as `title`, `archived`, `project_root` and planning `state`. When loading an older session without those records (because they were created before this feature existed), we supply defaults for the new fields:

```python
record.setdefault("transcript", copy.deepcopy(record["messages"]))
record.setdefault("title", "")
record.setdefault("archived", False)
record.setdefault("state", {})
record.setdefault("compactions", [])
```

This lets us open sessions created by the previous implementation. Of course, it cannot recover messages that were already trimmed before the upgrade.

For normal conversation updates, the incoming context must extend the saved context. We append only the new messages to the transcript:

```python
def save_messages(self, session_id, messages):
    with self.lease(session_id):
        record = self.load_session(session_id)
        incoming = _serializable_messages(messages)
        previous = record["messages"]
        if incoming[:len(previous)] != previous:
            raise ValueError("Context changed unexpectedly; use compact() to replace it.")
        record["transcript"].extend(copy.deepcopy(incoming[len(previous):]))
        record["messages"] = incoming
        self._write_session(session_id, record)
```

The transcript preserves everything from the conversation; however, tool results still pass through our existing output limits before being added to the message list.

## Preventing Session Corruption on Writes

We will update the file often, so we should avoid overwriting it directly. If the program stops halfway through a write, the JSON might be incomplete and we would lose the saved conversation.

Instead, we write a temporary file and atomically replace the session file:

```python
def _write_session(self, session_id: str, data: dict[str, Any]) -> None:
    with self.lease(session_id):
        path = self._session_path(session_id)
        data["updated_at"] = _timestamp()
        fd, temp = tempfile.mkstemp(dir=self.sessions_dir, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")
                file.flush()
                os.fsync(file.fileno())
            os.replace(temp, path)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
```

The temporary file is created in the same directory, so replacement stays on the same filesystem. We flush and sync its contents before replacing the old file. Until that replacement happens, the previous file stays intact. This protects against partial JSON writes.

### Session Locks

Atomic replacement doesn't stop two processes from overwriting each other's work. If we resume the same session in two terminals, each could save a different version of the session into the same session file.

To avoid this situation, we use a separate `.lock` file and a Linux advisory lock:

```python
@contextmanager
def lease(self, session_id):
    path = self._session_path(session_id).with_suffix(".lock")
    if session_id in self._leases:
        yield
        return
    with path.open("a") as file:
        try:
            fcntl.flock(file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError(f"Session '{session_id}' is in use by another process.") from None
        self._leases[session_id] = file
        try:
            yield
        finally:
            del self._leases[session_id]
            fcntl.flock(file, fcntl.LOCK_UN)
```

The running agent holds this lease for its entire run. Short management operations also acquire it before changing a record. Nested calls from the same store can reuse the lease, but a second process fails immediately instead of waiting.

The operating system releases the lock when the process exits, including after a crash. We keep the lock file even when deleting a session: removing it could let different processes lock different files under the same name.

These locks are advisory. Every writer must cooperate, so it's not advisable to run an older implementation of this agent harness without those locks at the same time.

Also, this implementation uses `fcntl` advisory locks, which are POSIX: they work on Linux, macOS and other Unix-like systems, but not on Windows.

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

## Connecting Persistence to the Agent Loop

At the start of the loop, we either use the initial system message or we show the messages loaded from a previous session:

```python
messages = resumed_messages or initial_messages
if memory_store is not None and session_id is not None:
    if resumed_messages is None:
        memory_store.create_session(session_id, messages)
    configure_memory(memory_store, session_id)
```

`configure_memory` gives the host-side tools the store and the active session ID. Then we save the messages at three points:

1. After appending a new user message.
2. After appending a model response.
3. After completing a batch of tool calls and appending their results.

At each point, the code is the same:

```python
if memory_store is not None and session_id is not None:
    memory_store.save_messages(session_id, messages)
```

Since we don't wait for the user to end the session, if the process stops unexpectedly, the last successfully saved messages are still there.

### Saving Other Conversation State

Messages aren't the only state our agent has. The scratchpad and to-do list live in Python memory, and our resource controls track tool calls and cumulative model usage. This means that when we restore a session we also need to restore all of those to avoid having an incomplete session.

Our checkpoint helper saves that state alongside the messages:

```python
def checkpoint():
    if memory_store is not None and session_id is not None:
        memory_store.save_messages(session_id, messages)
        memory_store.update(session_id, state={
            "scratchpad": scratchpad_state._content,
            "todos": todo_store.read(include_completed=True),
            "tool_calls": iteration_caps.tool_calls,
            **{field: getattr(cost_tracker, field) for field in
               ("total_tokens_in", "total_tokens_out", "total_cost_usd", "calls")},
        })
```

We call this around model requests, after tool batches and after final replies. On a resume command, we restore the scratchpad, all to-do items including their retry counts, the session tool-call count and cumulative API usage. The per-user-turn iteration counter starts again for the next request.

This means restarting the program doesn't reset the recorded session spend or tool-call count. Limits themselves still come from the current command-line options. While each JSON write is atomic, the messages and state are saved in two separate updates, and a crash between them can leave newer messages with an older planning checkpoint. A crash during a tool or model call can also leave side effects or billing unrecorded.

## Session Summaries

If we want to select a previous session to continue, choosing between session IDs is not very helpful. To make finding sessions easier, we will give each session a short summary containing its goal, completed work, important decisions and anything remaining.

The model can write this summary with a tool:

```python
def write_session_summary(summary: str) -> str:
    if session_id is None:
        raise RuntimeError("Memory has not been configured.")
    return _get_store().write_summary(session_id, summary)
```

The inherited `MemoryStore` method replaces the previous summary and updates the timestamp. `SessionStore` wraps this operation in the session lease:

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

### A Fallback Summary

We can't always guarantee that a summary will be created for a session. The agent might forget to call the summary tool, or the session might stop before it gets the chance. As a fallback, the harness calls `ensure_summary`:

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

This takes the last six user/assistant messages with content and keeps up to 2000 characters. It's an excerpt, but at least it gives us something to recognize the session by. And of course, the fallback only runs when the summary is empty.

## Listing Saved Sessions

The base `MemoryStore` reads the JSON files and returns a small record for each one:

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

The order of the list is by recency, with the most recently updated sessions showing up first. Unreadable or malformed records are skipped and don't show up in the list.

Then, the `SessionStore` extends these records with a title, archive flag and status, filtering archived sessions out by default:

```python
def list_sessions(self, include_archived=False):
    result = []
    for item in super().list_sessions():
        try:
            record = self.load_session(item["id"])
        except (ValueError, OSError):
            continue
        if include_archived or not record["archived"]:
            result.append({**item, "title": record["title"],
                           "archived": record["archived"],
                           "status": record.get("status", "saved")})
    return result
```

The harness marks a running session as `active` and changes it to `saved` or `aborted` during cleanup.

We expose listing in three places:

- **`--list-sessions`**: as a CLI argument. It lists sessions and exits.
- **`\sessions`**: as an agent harness command. It lists sessions into the interactive prompt.
- **`list_sessions`**: as a tool available to the agent.

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

## Searching Past Sessions

Sometimes we remember the problem we worked on but not the session ID or session title. The solution is the `search_sessions` tool. This tool uses keyword search across the saved records:

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

This searches the title, summary, working context and original transcript, using case-insensitive substring matching. Be aware that this solution is not doing any kind of semantic search. Searching for something that might be synonymous to the words that are actually in the session's conversation won't return any result.

For now, this is enough to find earlier work without adding an embedding model or a vector database. We can improve retrieval later without changing the tool the agent calls.

After finding a match, the model can use `read_session`:

```python
def read_session(session_id: str) -> str:
    session = _get_store().load_session(session_id)
    transcript = "\n".join(
        f"{message.get('role', 'unknown')}: {message.get('content') or '[tool call]'}"
        for message in session.get("transcript", session.get("messages", []))
    )
    return f"Summary:\n{session.get('summary') or '(no summary)'}\n\nTranscript:\n{transcript[:12000]}"
```

This returns the summary and up to 12000 characters of readable transcript. Messages containing only structured tool calls appear as `[tool call]`. Search results show shorter summary previews so the model can select a session before requesting more details.

These tools run on the host, alongside the other memory tools, and are registered as `PLANNING_TOOLS`. Their results still pass through the tool-result wrapping and output limits we added in the security chapters, so very long sessions may not be fully readable with this tool.

## Resuming a Session

Reading a past session brings information of that previous conversation into a new conversation. On the other hand, **resuming** a session restores its saved message history and continues updating the same record.

At the startup of the agent harness, we load the selected session:

```python
memory_store = SessionStore(Path(cli_args.memory_dir))
resumed_messages = None
if cli_args.resume:
    try:
        leases.enter_context(memory_store.lease(cli_args.resume))
        record = memory_store.load_session(cli_args.resume)
        if record["archived"]:
            raise ValueError("Session is archived; --unarchive it before resuming.")
        expected_root = str(Path(cli_args.sandbox_dir).resolve() if cli_args.sandbox_dir else Path.cwd())
        if record.get("project_root") and record["project_root"] != expected_root:
            raise ValueError("Session belongs to another project; use its original --sandbox-dir.")
        resumed_messages = memory_store.recover(cli_args.resume)
    except (ValueError, KeyError) as e:
        print(f"Could not resume session: {e}")
        raise SystemExit(2)
```

The active ID is either the requested session ID or a newly generated one:

```python
active_session_id = cli_args.resume or session_creds.session_id
```

We pass that ID and `resumed_messages` into the `agent_loop`. The loop loads the information and proceeds to wait for the next user request.

Here, `leases` is an `ExitStack` kept open until cleanup, so the session stays locked during the run. The project root check prevents continuing a previous session against a different project root.

Resuming restores the working messages, including the saved system prompt, the planning and usage checkpoint. But it doesn't restore the Docker container, running commands, credentials, permission approvals or rollback snapshots. The project files are whatever is currently on disk, so the model still needs to inspect them before relying on old findings.

### Recovering Tool Interruptions

Imagine the case that the model used the `write_file` tool and the program stopped before saving its result. The file might have been written, or the call might never have started. We cannot safely assume either outcome.

There is also a protocol problem: an assistant message containing tool calls needs matching tool results before the conversation continues. Our `recover` method finds calls without results and inserts this message for each missing call ID:

```python
error = {
    "role": "tool",
    "tool_call_id": call_id,
    "content": "Execution interrupted; outcome unknown. Inspect state before retrying.",
}
```

Recovery repairs the working context and appends the recovery notices to the transcript. The agent harness should not execute the tools again, since automatically replaying an interrupted command could duplicate a change, send a request twice, or overwrite work that already succeeded. The same repair runs after tool batches, which can also stop early because of an abort or a resource limit. It's then up to the agent to inspect the actual state and decide what remains to be done.

## Let's Test It!

To test the new session features, we start by asking the agent to investigate a problem without making changes:

```text
$ uv run agent-sessions/agent.py
Session:          z7Pq3hM4kA
Memory directory: /home/xxxxx/.agent-harness/memory

You: Investigate the cache bug. Don't make changes yet.
...
  [tool] write_session_summary({'summary': 'Investigated the cache bug. The cache key omits the locale. No files changed. Next: include locale in the key and add a regression test.'})
  [tool result] Saved session summary.
Assistant: The cache key does not include the locale, so requests in different languages can reuse the same response. I have not changed any files.
You: \exit
```

We can see the session summary being generated. Then, we can run the `--list-sessions` CLI argument to find the saved conversation:

```text
$ uv run agent-sessions/agent.py --list-sessions
z7Pq3hM4kA |  | saved | 2026-10-12T10:24:51+00:00 | Investigated the cache bug. The cache key omits the locale. No files changed. Next: include locale in the key and add a regression test.
```

Then we start the agent (from the same project directory) and resume the previous session:

```text
$ uv run agent-sessions/agent.py --resume z7Pq3hM4kA --mode acceptEdits
Session:          z7Pq3hM4kA
Memory directory: /home/xxxxx/.agent-harness/memory

You: Fix the issue we investigated and run the tests.
```

The model loads the earlier conversation and continues it with this new request. This means we don't have to describe the investigation again, the agent can inspect the current files, review its restored task list and continue the work.

During any active conversation, typing `\sessions` also shows the previous sessions and summary previews. If we want to check a previous work session without resuming it, we can ask the agent to search instead:

```text
You: Find our previous investigation into the cache bug and remind me what we found.
  [tool] search_sessions({'query': 'cache bug'})
  [tool result] z7Pq3hM4kA | 2026-10-12T10:24:51+00:00 | Investigated the cache bug. The cache key omits the locale...
  [tool] read_session({'session_id': 'z7Pq3hM4kA'})
  [tool result] Summary:
Investigated the cache bug...
...
```

## What You've Built

Our agent can now keep a conversation between runs and look for earlier work when it is relevant:

- **Saved sessions** persist the working message history with a session ID.
- **Atomic writes and single-writer locks** protect saved records from partial writes and competing processes.
- **Summaries** make previous conversations easier to find, with a fallback summary when the model does not write one.
- **Listing and retrieval** let the user and the agent search for and inspect previous work.
- **Resuming and recovery** restore the conversation and planning state.

We can close the agent after an investigation and come back to it later, instead of starting the conversation again from scratch.

## What's next

In the next part, we will keep a long task going without sending its entire history in every request. We will add **context compaction** to summarize older turns while preserving the original transcript on disk, and finish the session lifecycle with **titles**, **branching**, **archiving**, **exporting** and **deleting** sessions.
