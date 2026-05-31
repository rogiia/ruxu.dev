---
layout: article.njk
title: "Build A Basic AI Agent From Scratch: Tools"
subtitle: ""
category: ai
image: ""
date: 2026-05-31
tags:
  - post
  - article
  - ai
  - agents
---

In the previous part of the *[Build A Basic AI Agent From Scratch](https://www.ruxu.dev/articles/ai/build-a-basic-ai-agent/)* series, we built the most basic AI agent harness possible.
It was just a connection to a model, a way to take user input, a store of context of the conversation and a loop that kept the agent running.

Of course, this agent is not very useful. It can only interact by taking your input and answering you based on its internal knowledge.
If we want our agent to be more useful and do work in behalf of us, we have to give it a way to give it some way to take actions in its environment. In this case, the computer it's running on. The way you allow an agent to take actions in your computer is with **tools**.

## What are Tools?

A **tool** are just *programs or functions* that you expose to your LLM to allow it to invoke them autonomously. A tool can be as simple as a Python function implemented in the same agent code and as complex as an MCP (Model Context Protocol) server that does a HTTP request to an API that reads or updates a database.

> Note: MCP is not covered in this part of the series but it will be covered in the future.

## How do Agents use Tools?

Large Language Models output text, so how can they use tools? The first implementations of tool calling relied on suggesting the LLM to 
output a text like *Action: web_fetch* and then the agent harness parsing the text output and running the function. This was a bit unreliable, since the model sometimes didn't exactly follow the format we were expecting.

Modern LLMs already have native tool calling baked into them to make this more reliable. These models are fine-tuned to produce JSON structured tool requests. This native implementation has built-in validation, which minimizes hallucinations and makes the agent more reliable when it has to invoke a tool.

## Improving our Agent with Tools

We will be building on our previous basic agent we already built in the last part of this series: [Build A Basic AI Agent From Scratch](https://www.ruxu.dev/articles/ai/build-a-basic-ai-agent/).

We will start by implementing the most basic tools an AI agent needs to take action. These tools are usually built-in the most common agent harnesses. All of them are simple, but essential and powerful.

In the previous Python code, we will create a *tools* submodule. Here we will implement all our tools and their schemas.

First, let's start with the **bash** tool:

```python
def run_bash(command: str) -> str:
    """Run a bash command and return its output."""
    result = subprocess.run(
        command, shell=True, text=True, capture_output=True
    )
    output = result.stdout
    if result.stderr:
        output += f"\nSTDERR:\n{result.stderr}"
    return output or "(no output)"
```

This is the most powerful tool. Allowing our agent to run bash commands will let it do anything on the computer it's running on. On one hand, this is good because it relieves us from implementing a tool for each program that can just be run using bash and that the LLM already knows how to use. On the other hand, this is the most dangerous tool (also because it will let it do anything on the computer it's running on). In future parts of this series we will crack down on security so this doesn't become a liability.

The next tool is the **read file** tool:

```python
def read_file(path: str, offset: int = 1, limit: int = 200) -> str:
    """Read lines from a file, with optional offset and limit."""
    p = Path(path)
    if not p.exists():
        return f"Error: file not found: {path}"
    lines = p.read_text(errors="replace").splitlines()
    selected = lines[offset - 1: offset - 1 + limit]
    return "\n".join(f"{offset + i}: {line}" for i, line in enumerate(selected))
```

This allows our agent to read the files on the computer. This is useful for many cases, like for example reading all the files in our codebase for coding agents.

The next tool is the **glob files** tool:

```python
def glob_files(pattern: str, path: str = ".") -> str:
    """Find files matching a glob pattern inside a directory."""
    matches = glob_module.glob(f"{path}/**/{pattern}", recursive=True)
    matches += glob_module.glob(f"{path}/{pattern}")
    unique = sorted(set(matches))
    return "\n".join(unique) if unique else "(no matches)"
```

This tool can be used to find files in a directory. Obviously needed so the agent can explore your computer and see which files are available before it reads them.

The next tool is the **grep** tool:

```python
def grep(pattern: str, path: str = ".", include: str = "*") -> str:
    """Search file contents for a regex pattern, optionally filtering by filename glob."""
    results = []
    for filepath in glob_module.glob(f"{path}/**/{include}", recursive=True):
        fp = Path(filepath)
        if not fp.is_file():
            continue
        try:
            for i, line in enumerate(fp.read_text(errors="replace").splitlines(), 1):
                if re.search(pattern, line):
                    results.append(f"{filepath}:{i}: {line}")
        except OSError:
            pass
    return "\n".join(results) if results else "(no matches)"
```

This tool searches file contents using regular expressions and returns matching lines together with their file path and line number. It complements `glob_files` nicely: first you find which files exist, then you search inside them for the content you are actually interested in. The optional `include` parameter lets you restrict the search to files matching a filename pattern, which is useful to avoid searching binary files or to narrow the scope to a specific language.

The next tool is the **write file** tool:

```python
def write_file(path: str, content: str) -> str:
    """Write content to a file, creating it if it does not exist."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return f"Wrote {len(content)} bytes to {path}"
```

This tool lets our agent create new files and write content to them. It automatically creates any missing parent directories, so the agent doesn't have to worry about the directory structure already existing. This is essential for any agent that needs to produce output, generate code, or save results to disk.

The next tool is the **edit file** tool:

```python
def edit_file(path: str, old_string: str, new_string: str) -> str:
    """Replace the first occurrence of old_string with new_string in a file."""
    p = Path(path)
    if not p.exists():
        return f"Error: file not found: {path}"
    original = p.read_text()
    if old_string not in original:
        return f"Error: string not found in {path}"
    p.write_text(original.replace(old_string, new_string, 1))
    return f"Edited {path}"
```

While `write_file` replaces the entire content of a file, `edit_file` performs a targeted string replacement. This is much safer when the agent only needs to make a small change to an existing file, since it avoids accidentally overwriting content it hasn't read. It is the go-to tool for coding agents that need to patch specific lines without rewriting everything.

The last tool is the **webfetch** tool:

```python
def webfetch(url: str) -> str:
    """Fetch a URL and return its full plain-text content (up to 2 MB)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return f"Error fetching {url}: unsupported scheme '{parsed.scheme}'."
    req = urllib.request.Request(url, headers={"User-Agent": "agent/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = b"".join(...).decode(charset, errors="replace")
    soup = BeautifulSoup(raw, "html.parser")
    text = soup.get_text(separator="\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
```

This tool fetches a public web page and returns its content as plain text. It uses BeautifulSoup to strip all the HTML markup so the model only receives the readable text, keeping the context clean and token-efficient. It is restricted to `http` and `https` URLs and caps the response at 2 MB to avoid flooding the context window with enormous pages.

Once all our tools are implemented, we have to let the agent know they exist. The agent also needs to know what each tool does and which parameters it takes. We have to define a **tool schema** for the model:

```python
def get_tool_schemas():
    return [
        {
            "type": "function",
            "function": {
                "name": "run_bash",
                "description": "Run a bash command on the user's machine and return the output.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "The bash command to execute.",
                        }
                    },
                    "required": ["command"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read lines from a file. Returns lines prefixed with line numbers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Absolute or relative path to the file."},
                        "offset": {"type": "integer", "description": "First line to read (1-indexed). Defaults to 1."},
                        "limit": {"type": "integer", "description": "Maximum number of lines to return. Defaults to 200."},
                    },
                    "required": ["path"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "glob_files",
                "description": "Find files matching a glob pattern (e.g. '**/*.py') inside a directory.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {"type": "string", "description": "Glob pattern to match against file names."},
                        "path": {"type": "string", "description": "Root directory to search in. Defaults to '.'."},
                    },
                    "required": ["pattern"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "grep",
                "description": "Search file contents for a regex pattern and return matching lines with file paths and line numbers.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {"type": "string", "description": "Regular expression to search for."},
                        "path": {"type": "string", "description": "Directory to search in. Defaults to '.'."},
                        "include": {"type": "string", "description": "Filename glob to restrict which files are searched (e.g. '*.py'). Defaults to '*'."},
                    },
                    "required": ["pattern"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "write_file",
                "description": "Write content to a file, creating it (and any missing parent directories) if it does not exist.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path of the file to write."},
                        "content": {"type": "string", "description": "Full content to write to the file."},
                    },
                    "required": ["path", "content"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "edit_file",
                "description": "Replace the first occurrence of a string in a file with a new string.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Path of the file to edit."},
                        "old_string": {"type": "string", "description": "Exact string to find and replace."},
                        "new_string": {"type": "string", "description": "String to replace it with."},
                    },
                    "required": ["path", "old_string", "new_string"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "webfetch",
                "description": (
                    "Fetch a public URL (http/https only) and return its full plain-text content (up to 2 MB)."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "The URL to fetch (http/https)."},
                    },
                    "required": ["url"],
                },
            },
        },
    ]
```

Then, we can integrate the tools into our previous agent loop:

```python

TOOL_REGISTRY = get_tool_registry()
TOOL_SCHEMAS = get_tool_schemas()

def handle_tool_calls(tool_calls, messages):
    """Execute each tool the LLM requested and append the results to messages."""
    for tool_call in tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        print(f"  [tool] {name}({args})")

        if name not in TOOL_REGISTRY:
            result = f"Error: unknown tool '{
                name}'. Available tools: {list(TOOL_REGISTRY.keys())}"
        else:
            result = TOOL_REGISTRY[name](**args)

        print(f"  [tool result] {result[:200]}{
              '...' if len(result) > 200 else ''}")

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": result,
        })


def agent_loop(client):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. You have tools to read and write files, "
                "search the file system, and fetch web pages. Use them to help the user."
            ),
        }
    ]

    while True:
        user_input = input("You: ")
        if user_input.lower() == "\\exit":
            break

        messages.append({"role": "user", "content": user_input})

        while True:
            response = client.chat.completions.create(
                model="gemma4",
                messages=messages,
                tools=TOOL_SCHEMAS,
                temperature=0.7,
            )

            message = response.choices[0].message

            messages.append(message)

            if message.tool_calls:
                handle_tool_calls(message.tool_calls, messages)
            else:
                print(f"Assistant: {message.content}")
                break
```

Let's test our new and more powerful agent! If we run the updated agent we can use many tools to accomplish for example fetching a web page and writing a file based on it:

```bash
$ python agent.py
You: Read the frontpage of ruxu.dev and list all the articles in a markdown file ruxu.md
  [tool] webfetch({'url': 'https://ruxu.dev'})
  [tool result] Blog | Roger Oriol
Roger Oriol
My name is Roger Oriol, I am a Software Architect based in Barcelona, Spain. I am a MSc graduate in Big Data Management, Technologies and Analytics. This blog will be th...
  [tool] write_file({'path': 'ruxu.md', 'content': '# Articles on ruxu.dev\n\n- Build a Basic AI Agent From Scratch\n- 🔗 [Link] GPT-5\n- 🔗 [Quote] GPT-5 variants\n- 🔗 [Link] GPT-OSS\n- 🔗 [Quote] How we built our multi-agent research system\n- 🔗 [Link] Artificial Intelligence 3E: Foundations of computational agents\n- 🔗 [Link] AGI is not multimodal\n- 🔗 [Quote] Hype Coding - Steve Krouse\n- 🔗 [Link] OpenAI Codex CLI\n- 🔗 [Link] GPT 4.1'})
  [tool result] Wrote 375 bytes to ruxu.md
Assistant: Done — I created `ruxu.md` with the article list from the front page of ruxu.dev.
```

## What You've Built

We now have a tool-calling agent that is already very powerful. If you ask the agent to do something in your behalf, it can leverage all those basic tools to accomplish very complex tasks. Actually, this can already be used as a coding agent or assistant and it actually works. It's still lacking many features that Claude Code or Hermes Agent have, but we are slowly getting there.

## What's next?

If we use the current agent for a bit, we can get a glimpse of its potential, but we will often find that it uses tools without planning long-term and it often runs short on complex tasks. In the next part of this series, we will leverage tools by arming our agent with planning and task management tools that will allow it to be able to tackle longer running tasks. 
