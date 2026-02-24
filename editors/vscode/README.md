# Orchid Language for VS Code

Syntax highlighting and editor support for [Orchid](https://github.com/Orchid-DSL/orchid) (`.orch` files) -- a cognitive choreography language for LLM agent orchestration.

## Features

- Syntax highlighting for all Orchid constructs:
  - **Reasoning macros** (`CoT`, `RedTeam`, `ELI5`, `Debate`, etc.)
  - **Meta operations** (`Confidence`, `Trace`, `Checkpoint`, etc.)
  - **Control flow** (`if`/`elif`/`else`, `for`, `while`, `until`, `fork`, `try`/`except`)
  - **Tags** (`<deep>`, `<retry=3>`, `<private>`, etc.)
  - **Directives** (`@orchid`, `@name`, `@requires`)
  - **MCP/Plugin tool calls** (`filesystem:read_text_file(...)`)
  - **String interpolation** (`"$variable"`, `"${expression}"`)
  - **Agent and macro definitions**
  - **Atomic blocks** (`### ... ###`)
- Auto-indentation for blocks
- Bracket matching and auto-closing
- Comment toggling (`#`)

## Installation

### From VSIX (local install)

```bash
cd editors/vscode
npx @vscode/vsce package
code --install-extension orchid-0.1.0.vsix
```

### From source (development)

1. Open the `editors/vscode` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open any `.orch` file to see highlighting

## About Orchid

Orchid is a domain-specific language where reasoning is the primitive. Instead of writing code that calls an LLM API, you write scripts that describe how an agent should think.

```orchid
sources := fork:
    academic: Search("quantum computing breakthroughs")
    industry: Search("quantum computing applications")

vetted := CoVe(sources)
analysis := CoT(vetted)<deep>

if Confidence(analysis) > 0.7:
    Formal(analysis)<cite>
else:
    ELI5(analysis) + Explain("uncertainty areas")
```

Learn more at https://github.com/Orchid-DSL/orchid
