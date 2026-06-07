---
layout: article.njk
title: "Build A Basic AI Agent From Scratch: Long Task Planning"
subtitle: ""
category: ai
image: ""
date: 2026-06-08
tags:
  - post
  - article
  - ai
  - agents
---

In the previous part of the *[Build A Basic AI Agent From Scratch](https://www.ruxu.dev/articles/ai/build-an-ai-agent-with-tools/)* series, we added the essential tools to our agent to allow it to work autonomously for us. We gave it the ability to find files, read and write files, run bash commands and get content from the web. We got a very capable agent with just these tools.

## What happens when the agent runs long and complex tasks?

The current agent works very well, but we want our agent to get a lot of work done, and this requires staying on the task for long spans of time. Right now, if we try to give our agent long and complex tasks we will find that it does not think long term, and it stops working after the littlest progress.

This is to be expected because the LLM is trained to behave conversationally. It expects to go back and forth in a question-answer basis. This is fine for a simple chatbot, but our agent needs to be able to get a request and work for a long time on it before returning a result.

## Long task planning

The next ability we will give to our agent is the ability to plan for long and complex tasks.

The abilities our agent needs are:
- Understand the goal of the task
- Plan how to tackle the task beforehand
- Break the task into concrete steps
- Keep track of pending, in progress and completed tasks
- If something goes wrong with the current plan, rethink the approach
- Check that everything planned is actually done before stopping

To give our agent these abilities, we will rely on the last part's addition: **tools**. We will also explain the model how to use long task planning in the model's **system prompt**.

## New tool: Scratchpad

This is a very simple but powerful tool. We are just giving the model a place to write it's thoughts and read them again at a later time.

The main benefit of this tool is that it forces the model to think through the goal and plan the whole approach before starting working on it.

The tool saves the scratchpad content into memory instead of a file or database, which is fine because we don't want to share the scratchpad content between sessions.

Here's the python implementation:

```python
class Scratchpad:
    """Read and write from a in-memory scratchpad"""

    def __init__(self):
        self._content = ""

    def read(self) -> str:
        if self._content == "":
            return "(empty)"
        return self._content

    def write(self, content: str) -> str:
        self._content = str(content).strip()
        return self._content


scratchpad = Scratchpad()


def read_scratchpad():
    """Read the contents of the scratchpad"""
    return scratchpad.read()


def write_scratchpad(content: str):
    """
    Write into the scratchpad. The previous content
    will be overwritten.
    """
    scratchpad.write(content)
    return "Successfully written content into scratchpad"

> You can find and clone this code in this blog series' <a href="https://github.com/rogiia/basic-agent-harness" target="_blank">Github repo</a>.
```
```
```

## New tool: To-do list

A to-do list allows the agent to decompose the work into tasks and keep track of them to know what's left to do (*pending*), what it's working on currently (*in progress*) and what is already done (*done*).

This tool also enforces some good practices: it doesn't allow multiple tasks to be in progress at the same time, it doesn't allow invalid task statuses and it doesn't allow repeated tasks.

Just like the scratchpad, this tool saves the to do list into memory instead of a file or database. This is also fine because we don't want to share the to-do list between agent sessions.

```python
RETRY_LIMIT = 3

class ToDoList:
    """Helper class to hold a to-do list in memory"""

    statuses = ["pending", "in_progress", "done", "cancelled", "failed"]

    def __init__(self):
        self._items = []

    def read(self, include_completed=False):
        """Read the to-do list"""
        if include_completed:
            return [item.copy() for item in self._items]
        else:
            return [item.copy() for item in self._items
                    if item["status"] != "done" and item["status"] != "cancelled"]

    def append(self, id, content, status):
        if status not in ToDoList.statuses:
            raise Exception(f"Invalid status {status}. "
                            "Valid to-do statuses: pending, in_progress, done, "
                            "cancelled, failed")
        if self.contains(id):
            raise Exception(f"To do item {id} already exists!")
        new_item = {"id": id, "content": content,
                    "status": status, "retries": 0}
        self._items.append(new_item)
        return new_item.copy()

    def contains(self, id) -> bool:
        """Check if the to do list contains an item with a specific id"""
        for item in self._items:
            if item["id"] == id:
                return True
        return False

    def update(self, id, content, status):
        if status is not None and status not in ToDoList.statuses:
            raise Exception(f"Invalid status {status}. "
                            "Valid to-do statuses: pending, in_progress, done, "
                            "cancelled, failed")
        idx = 0
        while idx < len(self._items):
            if self._items[idx]["id"] == id:
                if content is not None:
                    self._items[idx]["content"] = content
                if status is not None:
                    prev_status = self._items[idx]["status"]
                    self._items[idx]["status"] = status
                    # A failed task being set back to in_progress is a retry attempt.
                    if prev_status == "failed" and status == "in_progress":
                        self._items[idx]["retries"] += 1
                return self._items[idx].copy()
            idx += 1
        raise Exception(f"To do item with id {id} not found")

todo_store = ToDoList()


def todo_append(id, content, status) -> str:
    """Append a new to do item to the to do list"""
    id_str = str(id)
    content_str = str(content)
    status_str = str(status)
    try:
        todo_store.append(id_str, content_str, status_str)
        return f"Successfully appended to do item {id_str} in to do list!"
    except Exception as e:
        return f"Failed to append to do item: {e}"


def todo_list(include_completed=False) -> str:
    """List all the items in the to do list"""
    items = todo_store.read(include_completed)

    result = f"To Do List ({len(items)} items)\n"
    for status in ToDoList.statuses:
        count = sum(1 for i in items if i["status"] == status)
        result += f"{count} {status} items\n"

    result += "-----\n"
    for item in items:
        retry_note = f", {item['retries']
                          } retries" if item["retries"] > 0 else ""
        result += f"- [{item['id']}] {item['content']
                                      } ({item['status']}{retry_note})\n"

    return result


def todo_update(id, content=None, status=None) -> str:
    if content is None and status is None:
        return "No content or status was given to update. Nothing to do."
    try:
        item = todo_store.update(id, content, status)
        retries = item["retries"]
        if item["status"] == "in_progress" and retries > 0:
            if retries >= RETRY_LIMIT:
                return (
                    f"Updated to do item {id} to in_progress — "
                    f"but this is retry {retries} of {
                        RETRY_LIMIT} (retry limit reached). "
                    f"Do not retry again. Escalate to the user instead."
                )
            return (
                f"Successfully updated to do item {id}! "
                f"Retry attempt {retries} of {RETRY_LIMIT}."
            )
        return f"Successfully updated to do item {id}!"
    except Exception as e:
        return f"Failed to update to do item {id}: {e}"
```

## New system prompt

All the strategies for long term task planning that cannot be implemented into tools are explained to the model in the system prompt. Here we will explain to the model how to plan using the process explained in the beginning of the article, and also how to use the new tools to help it in the planning process.

For more details, read the system prompt below.

I also added to the system prompt a little comment explaining to the model that if not stated otherwise, the project it has to work on is in the current directory.

```python
{
    "role": "system",
    "content": (
        "You are a capable coding and research assistant.\n\n"

        "## Available tools\n\n"
        "Action tools: read_file, write_file, edit_file, glob_files, grep, run_bash, webfetch\n\n"
        "Planning tools:\n"
        "- Scratchpad (read_scratchpad / write_scratchpad): your private working memory. "
        "Use it to think through an approach, store intermediate findings, or draft content "
        "before committing. Each write fully replaces the previous content.\n"
        "- To-do list (todo_append / todo_list / todo_update): a persistent task tracker. "
        "Items carry a status: pending, in_progress, done, cancelled, or failed.\n\n"

        "## Working directory\n\n"
        "The current working directory is always the user's project root. "
        "When asked to work on a project or codebase without a specified path, "
        "start by exploring '.' with glob_files or run_bash. "
        "Never ask the user to supply a path.\n\n"

        "## How to plan\n\n"
        "For complex or multi-step tasks (roughly 3 or more distinct steps, or when the "
        "path forward is unclear):\n"
        "1. Write your initial thinking and approach to the scratchpad before acting.\n"
        "2. Break the work into concrete steps and add each one to the to-do list with "
        "todo_append (status: pending).\n"
        "3. Before starting a step, mark it in_progress with todo_update. "
        "Keep only one item in_progress at a time.\n"
        "4. Mark items done immediately after completing them — do not batch completions.\n"
        "5. Call todo_list to review remaining work before moving to the next step.\n"
        "6. Mark tasks cancelled if they become unnecessary.\n\n"
        "For simple, single-step tasks: act directly without creating todos.\n\n"
        "Planning tool calls (write_scratchpad, todo_append, todo_update, todo_list) "
        "are internal bookkeeping, not responses to the user. After any planning tool "
        "call, always continue working immediately — make your next tool call or, once "
        "the task is fully complete, give a substantive final answer. "
        "Never emit an empty or whitespace-only message.\n\n"
        "## Replanning\n\n"
        "After every tool result, check whether the outcome matched your expectation. "
        "If a tool returns an error, unexpected output, or reveals information that "
        "changes your understanding of the task, do not move to the next planned step — "
        "replan first.\n\n"
        "When a step fails:\n"
        "1. Diagnose in the scratchpad — is this a recoverable input error (wrong path, "
        "typo, wrong argument) or a deeper problem (wrong approach, wrong assumption)?\n"
        "2. Mark the task failed: todo_update(id, status='failed').\n"
        "3. Choose a recovery action:\n"
        "   - Retry: the failure is correctable. Fix the input and set the task back to "
        "in_progress. The tool will report which retry attempt this is.\n"
        "   - Replace: the approach is wrong. Cancel the task and add a revised one.\n"
        "   - Reorder: new information makes a different task more urgent. Update the "
        "pending items before continuing.\n"
        "4. If todo_update reports that the retry limit has been reached, stop retrying. "
        "Write a clear diagnosis in the scratchpad — what you tried, what failed each "
        "time, and what you need — then give the user a concise escalation message "
        "and wait for their input.\n\n"
        "When a tool succeeds but returns information that changes the picture, pause "
        "before acting. Call todo_list, reassess all pending items in the scratchpad, "
        "and cancel or replace any tasks that no longer make sense.\n\n"
        "## How to use the scratchpad\n\n"
        "Before each tool call during a complex task, update the scratchpad with your "
        "current thinking. Structure each entry around these five steps:\n\n"
        "1. Restate the goal — write what you understand the task to be, in your own words. "
        "This catches misreads before they compound into wasted work.\n"
        "2. Survey what you know — note which files you have seen, what the code structure "
        "looks like, and what constraints or requirements apply.\n"
        "3. Evaluate options — reason through at least two approaches and explain why you "
        "are choosing one over the other (e.g. 'I could rewrite the middleware, or wrap it. "
        "Wrapping is safer because it leaves the existing call sites untouched.').\n"
        "4. Anticipate failure modes — write down what could go wrong with the chosen "
        "approach and how you would diagnose it (e.g. 'If the tests fail after this, the "
        "most likely cause is that the session cookie name changed.').\n"
        "5. Decide the next single action — commit to exactly one tool call. "
        "Do not plan several calls at once; decide the next step only.\n\n"
        "Re-read the scratchpad whenever you resume after a tool result to keep your "
        "reasoning grounded in what you have already learned.\n\n"
        "## Done detection\n\n"
        "Do not give a final answer based on the task list being empty alone. "
        "Before declaring the task complete, verify all three of the following:\n\n"
        "1. Structural completion — call todo_list and confirm there are no pending, "
        "in_progress, or failed items.\n"
        "2. Verification — check the output against the original goal. For code tasks: "
        "run the tests or build with run_bash and confirm they pass. For research tasks: "
        "re-read the scratchpad and confirm the assembled answer addresses what was "
        "actually asked.\n"
        "3. Uncertainty check — read the scratchpad and ask: are there unresolved "
        "questions, assumptions that were never validated, or tasks that were cancelled "
        "rather than properly completed?\n\n"
        "If all three are satisfied, give your final answer. If any are not, re-enter "
        "the planning loop — add the outstanding items to the todo list and continue."
    ),
}
```

## Let's test it!

To test our new and powerful agent, we will have to give it a really hard goal. In my case, I asked it to migrate my static site from using Eleventy to Hugo:

```bash
$ python ../agent-harness/agent-planning/agent.py
You: Explore this static site project and migrate it from Eleventy to Hugo
  [tool] write_scratchpad({'content': 'Goal: inspect the static site project, understand the current Eleventy setup, and migrate it to Hugo.\nSurvey: I have not yet inspected the repo. Nee
d to identify project structure, config, templates, content, assets, and build scripts.\nOptions: I could try an incremental migration by reproducing the Eleventy output structure in Hugo,
 or do a clean Hugo reorganization. Incremental is safer because it preserves content and design while minimizing surprises.\nFailure modes: Missing Eleventy-specific features (shortcodes,
 data files, filters, collections) could break the build. Hugo template syntax and content organization differ, so I need to map those carefully. Tests/build may fail if config or paths ar
e wrong.\nNext action: inspect the repository root to find the project files.'})
  [tool result] Successfully written content into scratchpad
  [tool] todo_append({'id': 'migrate-1', 'content': 'Inspect repository structure and identify Eleventy/Hugo-related files', 'status': 'pending'})
  [tool result] Successfully appended to do item migrate-1 in to do list!
  [tool] todo_append({'id': 'migrate-2', 'content': 'Map Eleventy templates/content/assets to Hugo equivalents', 'status': 'pending'})
  [tool result] Successfully appended to do item migrate-2 in to do list!
  [tool] todo_append({'id': 'migrate-3', 'content': 'Implement Hugo configuration, templates, and content migration', 'status': 'pending'})
  [tool result] Successfully appended to do item migrate-3 in to do list!
  [tool] todo_append({'id': 'migrate-4', 'content': 'Run build verification and fix any issues', 'status': 'pending'})
  [tool result] Successfully appended to do item migrate-4 in to do list!
  [tool] run_bash({'command': "pwd && echo '---' && find . -maxdepth 2 -type f | sed 's#^./##' | sort | head -200"})
[........]
  [tool] run_bash({'command': 'hugo --minify'})
  [tool result] Start building sites … 
hugo v0.152.2-6abdacad3f3fe944ea42177844469139e81feda6 darwin/arm64 BuildDate=2025-10-24T15:31:49Z VendorInfo=gohugoio


                  │ EN 
──────────────────┼────
 Pages ...
  [tool] todo_update({'id': 'migrate-4', 'status': 'done'})
  [tool result] Successfully updated to do item migrate-4!
  [tool] todo_list({'include_completed': True})
  [tool result] To Do List (4 items)
0 pending items
0 in_progress items
4 done items
0 cancelled items
0 failed items
-----
- [migrate-1] Inspect repository structure and identify Eleventy/Hugo-related files (done)
...
Assistant: Migrated the site from Eleventy to Hugo and verified the build passes.

What I changed:
- Added Hugo config in `hugo.toml`
- Created Hugo layouts:
  - `layouts/_default/baseof.html`
  - `layouts/index.html`
  - `layouts/_default/list.html`
  - `layouts/_default/single.html`
  - `layouts/404.html`
  - `layouts/_default/rss.xml`
- Migrated content into Hugo’s `content/` structure
- Copied static assets into `static/`
- Updated `package.json` scripts to use Hugo:
  - `build`: `hugo`
  - `serve`: `hugo server -D`
  - `test`: `hugo`

Verification:
- Ran `hugo --minify`
- Build completed successfully

Notes:
- I preserved the site’s existing URL structure as closely as possible:
  - `/articles/...`
  - `/links/...`
  - `/projects/...`
  - `/recent/`
- Hugo now serves the site instead of Eleventy
- Old Eleventy files are still present in the repo, but they’re no longer part of the Hugo build

If you want, I can also clean up the leftover Eleventy-specific files and simplify the repo further.
```

When I got back a few minutes ago, the site was successfully migrated to Hugo!

## What You've Built

This agent is now capable enough not just to work on it's own, but also to work on really hard and long tasks. It can plan, break down tasks, recover and replan if anything goes wrong, and just keep working until the work is done or it hits a wall.

## What's next?

An agent capable of working for a long time to complete a task is a great thing for productivity. But, if you dispatch this agent and go do something else, it might be editing files and running commands it isn't supposed to without your knowledge. You can't just trust your agent to always behave how you are expecting it to, so you want the agent to ping you before doing something potentially catastrophic. You want to be the human in the loop.
