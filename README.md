<p align="center">
  <h1 align="center">🌸 Orchid</h1>
  <p align="center"><strong>A cognitive choreography language for LLM agent orchestration</strong></p>
  <p align="center">
    <a href="docs/specification.md">Specification</a> · <a href="examples/">Examples</a> · <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</p>

---

Orchid is a lightweight, composable language for describing *how AI agents should think* — not just what they should compute. It bridges the gap between natural language prompts and procedural code, giving you human-readable scripts that are machine-executable.

```orchid
@orchid 0.1
@name "Quick Research Brief"

sources := fork:
    academic: Search("quantum computing breakthroughs 2024")
    industry: Search("quantum computing commercial applications")

vetted := CoVe(sources)                           # verify claims against evidence
analysis := CoT(vetted)<deep>                      # chain-of-thought reasoning

if Confidence(analysis) > 0.7:
    Formal(analysis)<cite>                         # high confidence → rigorous report
else:
    ELI5(analysis) + Explain("uncertainty areas")  # low confidence → be transparent
```

Read it aloud. You don't need to be a programmer to understand what this agent will do.

## Why Orchid?

**The problem:** We're orchestrating increasingly sophisticated AI agents using either raw prompts (fragile, non-composable) or general-purpose programming languages (verbose, obscures intent). A product manager can't review a LangChain pipeline. A researcher can't reproduce a prompt chain from a Python script.

**The approach:** Orchid treats reasoning as a first-class primitive. Instead of writing code *about* API calls, you write scripts *about* cognition — with named reasoning strategies, confidence-aware control flow, and parallel execution built into the syntax.

| Feature | Orchid | Python + LangChain | YAML Configs | DSPy |
|---|---|---|---|---|
| Human-readable | ✓ | ✗ | ~ | ✗ |
| Reasoning as primitives | ✓ | ✗ | ✗ | ~ |
| Native confidence handling | ✓ | ✗ | ✗ | ✗ |
| Composable agents | ✓ | ~ | ✗ | ~ |
| Parallel execution | ✓ | ~ | ✗ | ✗ |
| No programming required | ✓ | ✗ | ~ | ✗ |
| Tool integration (MCP) | ✓ | ~ | ~ | ✗ |
| Formal grammar | ✓ | N/A | ✓ | ✗ |

## Key Concepts

### Reasoning Macros
Named cognitive operations that shape *how* an agent thinks. Not functions that transform data — patterns of thought.

```orchid
CoT("analyze market trends")          # chain-of-thought deliberation
CoVe(claims)                          # chain-of-verification fact-checking
RedTeam(plan)                         # adversarial analysis
ELI5(report)                          # simplify for general audience
Debate[3]("should we expand to EU?")  # 3-perspective argumentation
```

### Confidence-Aware Control Flow
Agent operations don't just succeed or fail — they exist on a spectrum. Orchid makes uncertainty a native concept.

```orchid
while Confidence() < 0.7:
    Search("additional evidence")<append>
    Refine(analysis)
```

### Parallel Execution
Fork operations run concurrently and collect results.

```orchid
data := fork:
    market: Search("EV market data")
    tech: Search("battery R&D breakthroughs")
    policy: Search("EV policy incentives")

report := Consensus(data)
```

### Tags (Behavior Modifiers)
Fine-grained control over how operations execute, without changing what they do.

```orchid
Search("topic")<deep, retry=3, timeout=30s>
CoT("sensitive analysis")<private, verbose>
Validate(output, criteria="complete")<retry=5, fallback=draft>
```

### MCP Tool Integration
First-class integration with the Model Context Protocol for external tool access.

```orchid
Use MCP("filesystem") as fs
Use MCP("slack")

data := fs:Read("/data/report.csv")
analysis := CoT(data)
slack:Send("#team", Formal(analysis))
```

## Examples

| Example | Description |
|---|---|
| [`financial_analysis.orch`](examples/financial_analysis.orch) | Multi-phase stock analysis with adversarial review and confidence gating |
| [`deep_research.orch`](examples/deep_research.orch) | Research agent with iterative refinement and self-critique |
| [`threat_model.orch`](examples/threat_model.orch) | STRIDE-based threat modeling with parallel threat generation |
| [`adaptive_tutor.orch`](examples/adaptive_tutor.orch) | Interactive tutoring agent that adapts to student comprehension |
| [`hello_world.orch`](examples/hello_world.orch) | Minimal example to get started |

## Project Structure

```
orchid/
├── docs/
│   └── specification.md    # Full language specification
├── examples/               # Standalone .orch example scripts
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Specification

The complete language specification lives at [`docs/specification.md`](docs/specification.md). It covers:

- Core syntax, variables, and operators
- Reasoning macros (analysis, critique, synthesis, communication, generative)
- Control flow including parallel fork/join
- Tag system for behavior modification
- Meta operations (confidence, checkpoints, reflection)
- MCP and plugin integration
- Agent composition and multi-agent pipelines
- Error model with retry/fallback semantics
- Formal EBNF grammar

## Status

Orchid is in **early draft** (v0.1.0). The language design is stabilizing but not yet frozen. A reference interpreter exists (lexer, parser, AST, runtime executor) and is being prepared for open-source release.

**What's here now:** Language specification, examples, formal grammar.

**What's coming:** Reference interpreter, VS Code syntax highlighting, runtime benchmarks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. The most valuable contributions right now:

- **Feedback on the spec** — Does the syntax make sense? What's confusing?
- **Real-world use cases** — What workflows would you write in Orchid?
- **Runtime implementations** — Build an interpreter in your language of choice
- **Tooling** — Syntax highlighting, linters, formatters

## License

[MIT](LICENSE)

---

*Orchid is an open specification. Contributions, feedback, and implementations are welcome.*
