---
layout: article.njk
title: "Build A Basic AI Agent From Scratch: Human in the Loop & Security"
subtitle: ""
category: ai
image: ""
date: 2026-06-16
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

In the previous part of the *Build A Basic AI Agent From Scratch* series, we gave our agent the ability to plan and work on long tasks. We added a scratchpad, a to-do list and a system prompt that explains to the model how to break work down, recover from failures and keep going until the task is actually done.

That made the agent much more useful, but it also made it more dangerous. Running commands and editing files indiscriminately can have bad consequences that cannot be undone. We want our agent to be able to work autonomously but at the same time check with you before running potentially harmful tools.

In this part of the series we will add **human in the loop** controls to our agent. The agent will still be autonomous, but it will have to stop and ask for permission before doing potentially risky actions. It will also get a new tool that lets it ask the user a question when it does not have enough information to proceed.

## Human in the Loop

In AI Agents, the term **human in the loop** means that some decisions require the manual action by a human before they run. This ensures that some sensitive actions are not performed without passing the test of the criterion of a human.

## What Should Require Permission?

Not every tool call needs the same level of scrutiny. If the agent asks the user for permission on every single tool call, it becomes annoying and slow. On the other hand, if the agent never asks for permission, it becomes unsafe.

So we will classify tools by risk:

1. **Read tools** can inspect the filesystem but do not change it.
2. **Planning tools** only update the agent's internal state.
3. **Interaction tools** ask the user for clarification.
4. **Write tools** modify files.
5. **Other action tools** can have broader side effects, like running shell commands or fetching from the network.

For this version of the agent, the safe default is:

- Reading files is allowed.
- Planning is allowed.
- Asking the user a question is allowed.
- Writing files requires permission unless we explicitly start the agent in a mode that accepts edits inside the current project.
- Running bash commands requires permission.
- Fetching web pages requires permission.

## Permission Modes

We will add three permission modes to the agent:

```python
class PermissionMode(Enum):
    DEFAULT = "default"
    ACCEPT_EDITS = "acceptEdits"
    DANGEROUSLY_SKIP_PERMISSIONS = "dangerouslySkipPermissions"
```

The modes work like this:

- `default`: read tools and planning tools are allowed, everything else asks for permission.
- `acceptEdits`: read tools, planning tools and writes inside the current working directory are allowed, everything else asks for permission.
- `dangerouslySkipPermissions`: all tools run without asking.

The last mode is intentionally named in a scary way. Running without any safeguards is the kind of mode you might use in a throwaway sandbox or a trusted automation environment. It shouldn't be the default for an agent running on your machine with precious files and credentials.

We can expose the permissions mode as a command line flag:

```python
parser = argparse.ArgumentParser(
    description="Coding agent with configurable tool permission gating."
)
parser.add_argument(
    "--mode",
    choices=["default", "acceptEdits", "dangerouslySkipPermissions"],
    default="default",
    help=(
        "Permission mode for tool execution. "
        "'default': read tools are free, everything else requires approval. "
        "'acceptEdits': read + write tools are free when inside the working directory, "
        "everything else requires approval. "
        "'dangerouslySkipPermissions': all tools run without any prompt."
    ),
)
```

Then we capture the current working directory when the agent starts, which we will use as the trust boundary for the `acceptEdits` mode. The agent can edit files inside the project, but writing outside the project still requires permission.:

```python
mode = PermissionMode(cli_args.mode)
working_dir = Path.cwd()

print(f"Agent started in '{mode.value}' mode  (working dir: {working_dir})")

client = get_llm_client()
agent_loop(client, mode, working_dir)
```

## Tool Categories

Next, we will group the tools in three groups. Tools that can only **read files** or be **used for planning** will always be allowed because they are safe. Write tools will be more limited:

```python
# Always allowed: read-only filesystem tools
READ_TOOLS = {"read_file", "glob_files", "grep"}

# Always allowed: internal planning/bookkeeping and user-interaction tools
PLANNING_TOOLS = {
    "todo_append",
    "todo_list",
    "todo_update",
    "read_scratchpad",
    "write_scratchpad",
    "ask_question",
}

# Conditionally allowed in acceptEdits mode when target is within working dir
WRITE_TOOLS = {"write_file", "edit_file"}
```

## Checking the Write Path

If the agent is in `acceptEdits` mode, we want to allow writes inside the project and block writes outside the project unless the user approves them.

That means we need to resolve the path and check whether it is inside the working directory:

```python
def _resolve_tool_path(tool_name: str, args: dict) -> str | None:
    """Return the file-path argument for write tools, or None if not applicable."""
    if tool_name in WRITE_TOOLS:
        return args.get("path")
    return None


def _is_within_working_dir(path: str, working_dir: Path) -> bool:
    """Return True if *path* resolves to somewhere inside *working_dir*."""
    try:
        target = Path(path)
        if not target.is_absolute():
            target = working_dir / target
        target.resolve().relative_to(working_dir.resolve())
        return True
    except ValueError:
        return False
```


## Asking for Permission

When the agent wants to run a tool that is not automatically allowed, we ask the user:

```python
def _ask_permission(tool_name: str, args: dict) -> bool:
    """Interactively ask the user whether to allow a tool call.

    Returns True if the user grants permission, False otherwise.
    """
    print(f"\n  [permission required] {tool_name}")
    print(f"  Arguments: {json.dumps(args, ensure_ascii=False)}")
    while True:
        try:
            answer = input("  Allow this action? [y/n]: ").strip().lower()
        except EOFError:
            print("  (EOF - denying permission)")
            return False
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("  Please enter 'y' or 'n'.")
```

We make it easy to see for the user which action the agent is trying to perform so they can understand what's going on. Before a risky tool runs, the user sees the tool name and the exact arguments the model requested. The user can approve or deny it.

Now we can put all the rules together:

```python
def check_permission(
    tool_name: str,
    args: dict,
    mode: PermissionMode,
    working_dir: Path,
) -> bool:
    """Decide whether a tool call is permitted under the current mode."""
    if tool_name in READ_TOOLS or tool_name in PLANNING_TOOLS:
        return True

    if mode == PermissionMode.DANGEROUSLY_SKIP_PERMISSIONS:
        return True

    if mode == PermissionMode.ACCEPT_EDITS and tool_name in WRITE_TOOLS:
        path = _resolve_tool_path(tool_name, args)
        if path and _is_within_working_dir(path, working_dir):
            return True

    return _ask_permission(tool_name, args)
```

The function returns a boolean that represents whether the harness allows the agent to proceed with the tool call.

## Gating Tool Execution

Now we need to integrate `check_permission` into the tool execution path. This is the part of the agent loop that receives tool calls from the LLM and decides what to do with them:

```python
def handle_tool_calls(
    tool_calls,
    messages,
    mode: PermissionMode,
    working_dir: Path,
):
    """Execute each tool the LLM requested and append the results to messages."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        print(f"  [tool] {name}({args})")

        if name not in TOOL_REGISTRY:
            result = (
                f"Error: unknown tool '{name}'. "
                f"Available tools: {list(TOOL_REGISTRY.keys())}"
            )
        elif not check_permission(name, args, mode, working_dir):
            result = (
                f"Permission denied: the user did not allow '{name}' to run. "
                "Do not retry this tool call without asking the user first."
            )
        else:
            try:
                result = TOOL_REGISTRY[name](**args)
            except TypeError as e:
                result = (
                    f"Error: invalid arguments for tool '{name}': {e}. "
                    "Check the tool schema and retry with the correct arguments."
                )

        print(f"  [tool result] {result[:200]}{'...' if len(result) > 200 else ''}")

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": result,
        })
```

If the permission is denied by the user, we return a tool result back to the model saying that the permission was denied and that it should not retry the same tool call.

This also keeps what happened clear for the agent. The model learns that its requested action did not happen, and it has to adapt.

## Letting the Agent Ask Questions

Permission prompts are initiated by the harness. They happen when the model tries to do something risky.

But there is another kind of human in the loop interaction: the agent itself might realize that it is missing information. Maybe the user asked it to update "the config" but there are multiple config files. Maybe it needs to know which deployment target to use. Maybe it found two possible interpretations of the task and choosing wrong could cause damage.

For that, we add a new tool called `ask_question`:

```python
def ask_question(question: str) -> str:
    """Ask the user a clarifying question and return their answer."""
    print(f"\n  [agent] {question}")
    try:
        answer = input("  Your answer: ").strip()
    except EOFError:
        return "(no answer - EOF)"
    return answer if answer else "(no answer provided)"
```

This tool is very small, but it changes the behavior of the agent. The agent no longer has to guess when guessing would be unsafe. It can stop, ask one focused question, and continue with the user's answer in context.

Then we register it in the tool registry:

```python
from tools.interaction import ask_question


def get_tool_registry():
    return {
        "run_bash":          run_bash,
        "read_file":         read_file,
        "glob_files":        glob_files,
        "grep":              grep,
        "write_file":        write_file,
        "edit_file":         edit_file,
        "webfetch":          webfetch,
        "todo_append":       todo_append,
        "todo_list":         todo_list,
        "todo_update":       todo_update,
        "read_scratchpad":   read_scratchpad,
        "write_scratchpad":  write_scratchpad,
        "ask_question":      ask_question,
    }
```

And we expose it to the model with a schema:

```python
{
    "type": "function",
    "function": {
        "name": "ask_question",
        "description": (
            "Ask the user a clarifying question and wait for their answer. "
            "Use this when you are missing information required to complete the task "
            "and cannot reasonably infer it from context. "
            "Ask one focused question at a time. "
            "Do not use this for progress updates or to confirm actions you can already "
            "take - only ask when you are genuinely blocked."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "The question to ask the user.",
                },
            },
            "required": ["question"],
        },
    },
}
```

## Updating the System Prompt

We also need to mention the new tool in the system prompt:

```python
"- Clarification (ask_question): ask the user a single focused question when you "
"are genuinely blocked and cannot reasonably infer the missing information from "
"context. Do not use it for progress updates or to confirm actions you can already "
"take - only ask when it is strictly necessary to proceed.\n\n"
```

## Let's test it!

Now we can run the agent in default mode:

```bash
$ python agent.py
Agent started in 'default' mode  (working dir: /Users/roger/project)
You: Create a markdown summary of this project
  [tool] glob_files({'pattern': '*', 'path': '.'})
  [tool result] ./README.md
./src/main.py
./pyproject.toml
  [tool] read_file({'path': './README.md'})
  [tool result] 1: # Example Project
2: This project is a small CLI...
  [tool] write_file({'path': 'summary.md', 'content': '# Project Summary\n\nThis project is a small CLI...'})

  [permission required] write_file
  Arguments: {"path": "summary.md", "content": "# Project Summary\n\nThis project is a small CLI..."}
  Allow this action? [y/n]: y
  [tool result] Wrote 61 bytes to summary.md
Assistant: Done. I created `summary.md` with a short summary of the project.
```

The agent could explore and read files without bothering us. But when it wanted to write a new file, it had to ask for permission.

If we deny the action, the tool does not run:

```bash
  [tool] run_bash({'command': 'rm -rf build'})

  [permission required] run_bash
  Arguments: {"command": "rm -rf build"}
  Allow this action? [y/n]: n
  [tool result] Permission denied: the user did not allow 'run_bash' to run. Do not retry this tool call without asking the user first.
Assistant: I did not remove the build directory because permission was denied.
```

This is the safety behavior we want. The agent can propose an action, but the user remains in control.

Now let's test the clarification tool:

```bash
$ python agent.py --mode acceptEdits
Agent started in 'acceptEdits' mode  (working dir: /Users/roger/project)
You: Update the config to use production
  [tool] glob_files({'pattern': '*config*', 'path': '.'})
  [tool result] ./config.dev.json
./config.prod.json
./src/config.py
  [tool] ask_question({'question': 'I found multiple config files. Which one should I update: config.dev.json, config.prod.json, or src/config.py?'})

  [agent] I found multiple config files. Which one should I update: config.dev.json, config.prod.json, or src/config.py?
  Your answer: src/config.py
  [tool result] src/config.py
  [tool] edit_file({'path': 'src/config.py', 'old_string': 'ENV = "development"', 'new_string': 'ENV = "production"'})
  [tool result] Edited src/config.py
Assistant: Updated `src/config.py` to use production.
```

In `acceptEdits` mode, the edit inside the working directory was allowed automatically. But the agent still asked a question first because it was not sure which file the user meant.

## What You've Built

We now have an agent that is not only capable of using tools and planning long tasks, but also has a basic safety model around tool execution.

The agent can:

- Read and explore without unnecessary interruption.
- Track its work with planning tools.
- Ask the user clarifying questions when it is genuinely blocked.
- Prompt for permission before risky tool calls.
- Automatically allow project-local edits in `acceptEdits` mode.
- Refuse to execute a denied tool call and report that denial back to the model.

This is a big step toward building agents that can work autonomously without giving free reign to do whatever they want in your machine.

## What's next?

Human in the loop is the first step towards security in AI Agents. But its not everything you should consider if you worry about agent security. In the next part, we will complete the missing parts of security by taking a look at sandboxing and audit logs.

