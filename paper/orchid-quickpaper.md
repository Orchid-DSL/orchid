# Orchid: Reasoning as a Language Primitive

**A cognitive choreography language for LLM agent orchestration**

Mike Koogle | March 2026 | [github.com/orchid-dsl/orchid](https://github.com/orchid-dsl/orchid)

---

## The Problem

We orchestrate increasingly capable AI agents using either raw prompts (fragile, non-composable) or general-purpose code (verbose, obscures intent). A product manager can't review a LangChain pipeline. A researcher can't reproduce a prompt chain from a Python script. The cognitive intent -- *search, verify, reason, present* -- is buried under API boilerplate.

## The Idea

Orchid is a domain-specific language where **reasoning is the primitive**. Instead of writing code *about* API calls, you write scripts *about* cognition. Here's a complete, runnable Orchid script:

```orchid
@orchid 0.1
sources := fork:
    academic: Search("quantum computing breakthroughs 2024")
    industry: Search("quantum computing commercial applications")

vetted := CoVe(sources)                    # verify claims against evidence
analysis := CoT(vetted)<deep>              # chain-of-thought reasoning

if Confidence(analysis) > 0.7:
    Formal(analysis)<cite>                 # high confidence -> rigorous report
else:
    ELI5(analysis) + Explain("uncertainty areas")
```

Read it aloud. You don't need to be a programmer to understand what this agent will do.

## Key Design Decisions

**Reasoning macros as primitives.** `CoT("analyze trends")` is not a function call -- it's an instruction to an LLM to perform chain-of-thought reasoning. Orchid ships with 39 built-in macros across six categories: Analysis (CoT, CoVe, Decompose, ...), Critique (RedTeam, Steelman, ...), Synthesis (Debate, Consensus, ...), Communication (ELI5, Formal, ...), Generative (Brainstorm, Generate, ...), and Meta (Confidence, Checkpoint, Reflect, ...).

**Confidence-native control flow.** Agent operations don't just succeed or fail -- they exist on a spectrum. Orchid's hybrid confidence model blends the LLM's self-assessment (50%) with runtime signals (50%): retry counts, source diversity, verification status, and fork branch agreement. This enables `until Confidence() > 0.8: Refine(analysis)` as native syntax.

**Parallel fork execution.** The `fork` construct runs branches concurrently and collects results. Named branches produce a dict; `fork item in list` produces a parallel map. Multi-perspective analysis, ensemble reasoning, and parallel search are single expressions.

**First-class tool integration.** Orchid connects to external tools via the Model Context Protocol (MCP): `filesystem:read_text_file(path="src/main.ts")`. Twelve built-in server configurations ship with the interpreter.

**Tags for behavior modification.** `<deep>`, `<retry=3>`, `<timeout=30s>`, `<private>` -- inline modifiers that change *how* an operation executes without changing *what* it does.

## What Sets It Apart

| | Orchid | Python + LangChain | YAML Configs | DSPy |
|---|---|---|---|---|
| Human-readable | Yes | No | Partially | No |
| Reasoning as primitives | Yes | No | No | Partially |
| Confidence-aware flow | Yes | No | No | No |
| Parallel execution | Yes | Partially | No | No |
| No programming required | Yes | No | Partially | No |
| Formal grammar (EBNF) | Yes | N/A | Yes | No |

## Orchid Without the Interpreter

Because Orchid's syntax is close to natural language, LLMs can interpret scripts directly. Paste the language spec into any capable LLM chat and it will follow Orchid scripts -- searching, verifying, reasoning, and routing output based on confidence. This is a real bootstrapping path: experiment in chat today, graduate to the full interpreter when you need MCP tools, real parallelism, or hybrid confidence tracking.

## Implementation Status

The reference interpreter is TypeScript, published on npm as `@orchid-dsl/orchid`. It includes a complete lexer, parser, and runtime with 470+ tests across 13 test suites. The only dependencies are the Anthropic SDK, the MCP SDK, and Zod. The full language specification with EBNF grammar is published under the MIT license.

```bash
npm install -g @orchid-dsl/orchid
orchid examples/hello_world.orch
```

## What's Next

Python package (`orchid-dsl` on PyPI), additional LLM providers (OpenAI, Gemini, local models), VS Code syntax highlighting, streaming responses, and optional lightweight typing.

---

*Orchid is open source under the MIT license. Full whitepaper, specification, and examples at [github.com/orchid-dsl/orchid](https://github.com/orchid-dsl/orchid).*
