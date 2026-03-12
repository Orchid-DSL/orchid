# Orchid: A Cognitive Choreography Language for LLM Agent Orchestration

**Mike Koogle**

*Independent Researcher*

---

## Abstract

As large language model (LLM) agents grow more capable, the tools we use to orchestrate their behavior have not kept pace. Today's approaches fall into two camps: raw prompt engineering, which is fragile and non-composable, and general-purpose programming frameworks, which bury cognitive intent under API boilerplate. We present Orchid, a domain-specific language (DSL) in which reasoning is the primitive. Rather than writing code that calls an LLM API, an Orchid script describes *how an agent should think* -- using named reasoning strategies, confidence-aware control flow, parallel fork execution, and first-class tool integration via the Model Context Protocol (MCP). The language is human-readable by design: a non-programmer can read an Orchid script and understand the agent's intended behavior. We describe the language's design principles, its 46 built-in reasoning macros and operations, its hybrid confidence model, its security sandbox, and its reference interpreter implementation. We present a quantitative evaluation comparing equivalent workflows in Orchid, Python + LangChain, and DSPy, showing that Orchid reduces orchestration code by 70–85% while preserving full expressiveness. Orchid is available today as an open-source npm package (`@orchid-dsl/orchid`) with over 470 passing tests, and its specification -- including a formal EBNF grammar -- is published under the MIT license.

---

## 1. Introduction

The past two years have seen a rapid expansion in what LLM-based agents can do. Models can now search the web, write and execute code, manage files, interact with APIs, and reason through multi-step problems with increasing reliability. But the way we *direct* these agents has not evolved at the same rate.

Consider how a typical agent workflow is constructed today. A developer writes Python code that instantiates an LLM client, constructs a system prompt, sends a message, parses the response, feeds it into the next prompt, handles errors, and repeats. The cognitive intent -- "search for information, verify it, think carefully about it, present the results based on confidence" -- is buried under dozens of lines of API plumbing, retry logic, and string formatting. A product manager cannot review it. A researcher cannot reproduce it from the code alone without understanding the framework's abstractions. The *what* and *how* of the agent's reasoning are entangled with the mechanics of calling an API.

This paper introduces Orchid, a lightweight, composable language designed to close that gap. Orchid is not a general-purpose programming language. It is a **cognitive choreography language**: a syntax for describing how an agent should reason, not just what it should compute.

Here is a complete Orchid script that researches a topic, verifies its findings, and produces a confidence-gated report:

```orchid
@orchid 0.1
@name "Quick Research Brief"

sources := fork:
    academic: Search("quantum computing breakthroughs 2024")
    industry: Search("quantum computing commercial applications")

vetted := CoVe(sources)
analysis := CoT(vetted)<deep>

if Confidence(analysis) > 0.7:
    Formal(analysis)<cite>
else:
    ELI5(analysis) + Explain("uncertainty areas")
```

Read it aloud. The script searches two source categories in parallel, fact-checks the results, performs deep chain-of-thought reasoning, then chooses an output format based on how confident the agent is in its analysis. You do not need to be a programmer to follow what this agent will do. That is the design goal.

Orchid occupies a specific point in the design space. It sits between natural language prompts (which are readable but non-composable and non-reproducible) and programming languages (which are composable but obscure intent). Its key contributions are:

1. **Reasoning as a primitive.** Orchid's 46 built-in reasoning macros and operations -- `CoT`, `CoVe`, `RedTeam`, `ELI5`, `Debate`, and others -- give named, reusable form to cognitive strategies that would otherwise be ad-hoc prompt fragments.

2. **Confidence-native control flow.** Traditional programs assume operations either succeed or fail. Agent operations exist on a spectrum. Orchid's hybrid confidence model blends the LLM's subjective self-assessment with objective runtime signals (retry counts, source diversity, verification status), enabling scripts to adapt to uncertainty rather than ignore it.

3. **Parallel execution with fork.** The `fork` construct runs multiple reasoning paths concurrently and collects results, enabling patterns like multi-perspective analysis, parallel search, and ensemble reasoning in a single readable expression.

4. **First-class tool integration.** Orchid integrates with external tools through the Model Context Protocol (MCP), giving scripts access to file systems, databases, web search, GitHub, and other services through a consistent `namespace:operation()` syntax.

5. **Radical readability.** Every design decision in Orchid prioritizes human comprehension. The syntax borrows familiar elements -- Python-style indentation, the `:=` walrus operator, `#` comments -- and combines them with domain-specific constructs that read like descriptions of thought rather than instructions to a machine.

The reference interpreter is implemented in TypeScript, passes over 470 tests across 13 test suites, and is published on npm as `@orchid-dsl/orchid`. The full language specification, including an EBNF grammar, is published under the MIT license.

---

## 2. Background and Related Work

The problem of orchestrating LLM agents has attracted substantial attention, producing several categories of solutions. We survey these briefly to position Orchid's contribution.

### 2.1 Prompt Engineering

The simplest form of agent orchestration is direct prompting: writing instructions in natural language and feeding outputs forward manually or through simple scripts. This approach is accessible and flexible, but it does not compose. There is no way to express "if confidence is low, try a different strategy" in a prompt alone. Prompt chains are fragile, non-reproducible, and difficult to version or review.

### 2.2 Framework Approaches

LangChain [1], LlamaIndex [2], AutoGen [3], and CrewAI [4] represent the framework paradigm: Python libraries that provide abstractions for chains, agents, tools, and memory. These frameworks are powerful and widely adopted, but they are fundamentally libraries in a host language. A LangChain pipeline is Python code, with all that implies: it requires a Python runtime, it mixes orchestration logic with infrastructure code, and it is not readable by someone who does not know Python. The cognitive intent -- "search, verify, reason, present" -- is spread across class instantiations, callback configurations, and method calls.

### 2.3 Compiler and Optimizer Approaches

DSPy [5] takes a different tack. Rather than providing a framework for prompt chaining, it treats LLM calls as differentiable modules that can be optimized automatically. This is a compelling approach for performance-sensitive applications, but DSPy programs are Python modules with a specific programming model. The focus is on optimization, not readability or accessibility.

### 2.4 Configuration-Driven Approaches

YAML and JSON pipeline definitions (used by various CI/CD and ML pipeline tools) offer static descriptions of workflows. They are declarative and often readable, but they lack control flow, composition, and any notion of reasoning-specific constructs. They describe *what* to run, not *how* to think.

### 2.5 The Missing Layer

What these approaches share is that none of them provides a dedicated *language* for cognitive orchestration. Prompt engineering lacks structure. Frameworks bury intent under API mechanics. Optimizers focus on performance, not expressiveness. Configuration formats lack the control flow needed for adaptive agent behavior.

Orchid targets this gap: a language expressive enough for complex agent workflows, readable enough for a product manager to review, and structured enough for machine execution. It treats reasoning as the core primitive, not as a side effect of calling an API.

---

## 3. Language Design

### 3.1 Design Principles

Orchid is built on five principles, each reflecting a specific conviction about how agent orchestration should work:

1. **Human-first readability.** A non-programmer should be able to read an Orchid script and understand the agent's intent. This is not aspirational -- it is a hard design constraint. Every syntactic choice is evaluated against this criterion.

2. **Implicit intelligence.** The agent is assumed to be capable. Orchid directs cognition rather than micromanaging it. `CoT("analyze trends")` does not specify *how* to perform chain-of-thought reasoning; it specifies *that* chain-of-thought reasoning should be applied.

3. **Composability over complexity.** Small, orthogonal primitives that combine predictably. Reasoning macros, tags, pipes, and forks are independent features that compose freely.

4. **Graceful degradation.** Partial success is better than total failure. Confidence-aware execution is built into the language, not bolted on as an afterthought.

5. **Transparency by default.** Reasoning is traceable unless explicitly suppressed. The `Trace` and `Explain` meta-operations make the agent's thought process inspectable.

### 3.2 Core Syntax and Semantics

Orchid's syntax is deliberately minimal. Line order implies execution order. Assignment uses the `:=` walrus operator (borrowed from Python), signaling that assignment is a naming of an agent's output rather than a traditional variable store:

```orchid
results := Search("climate policy 2024")
summary := CoT("summarize $results")
report  := Formal(summary)
```

String interpolation uses `$` for variable references, keeping prompts readable: `Search("$name quarterly earnings")`. The implicit context variable `_` holds the output of the most recent operation, enabling concise chains:

```orchid
Search("renewable energy trends")
CoT("summarize key findings from: $_")
CoVe
ELI5
```

Collections include lists (`[1, 2, 3]`) and dicts (`{name: "alice", age: 30}`), with subscript access supporting negative indexing (`items[-1]`). These are the building blocks, deliberately kept close to what programmers and non-programmers alike would expect.

### 3.3 Reasoning Macros as Primitives

The central design innovation in Orchid is the reasoning macro. A reasoning macro is a named cognitive operation that shapes *how the agent reasons*, not what data it transforms. The distinction is important.

In a conventional program, `sort(list)` is an instruction to reorder elements by some comparison function. In Orchid, `CoT("analyze market trends")` is an instruction to the agent to perform chain-of-thought deliberation on the given input. The macro does not specify the algorithm; it specifies the reasoning strategy. The agent -- backed by an LLM -- decides how to execute that strategy.

Orchid ships with 46 built-in macros and operations organized into seven categories:

**Analysis** -- structured examination of inputs:
- `CoT` (chain-of-thought): step-by-step deliberation
- `CoVe` (chain-of-verification): fact-checking against evidence
- `Decompose`: break a problem into sub-problems
- `Classify`, `Extract`, `Compare`, `Timeline`, `Spatial`, `Quantify`

**Critique** -- adversarial and evaluative reasoning:
- `Critique`: identify weaknesses, gaps, and errors
- `RedTeam`: adversarial analysis to find failure modes
- `Steelman`: construct the strongest version of an argument
- `DevilsAdvocate`, `Counterfactual`, `Validate`

**Synthesis** -- combining and reconciling information:
- `Synthesize`: merge disparate sources into a unified output
- `Consensus`: find common ground across perspectives
- `Debate`: multi-viewpoint argumentation with resolution
- `Refine`, `Reconcile`, `Prioritize`

**Communication** -- controlling output form:
- `ELI5`: simplify for a general audience
- `Formal`: technical, rigorous output
- `Analogize`, `Socratic`, `Narrate`, `Translate`

**Generative** -- divergent and creative thinking:
- `Creative`, `Brainstorm`, `Abstract`, `Ground`, `Reframe`, `Generate`

**Meta** -- introspection and execution control:
- `Confidence`, `Explain`, `Reflect`, `Trace`, `Checkpoint`, `Rollback`, `Benchmark`, `Elapsed`

**Utility** -- search, output, and diagnostics:
- `Search`: web and knowledge retrieval
- `Summarize`: concise compression of content
- `Log`, `Error`: diagnostic output
- `Save`: write results to disk or stdout
- `len`: collection/string length

Critically, macros are also user-definable. A user can create new macros that combine built-in operations into reusable reasoning patterns:

```orchid
macro ThreatModel(system)<pure>:
    surface := Decompose("attack surface of $system")
    threats := RedTeam(surface)
    ranked := Prioritize(threats, criteria="likelihood * impact")
    mitigations := CoT("mitigation strategies for $ranked")
    return Formal(mitigations)
```

This macro can then be invoked like any built-in: `result := ThreatModel(spec)`. Tags applied at the definition site (here, `<pure>`) serve as defaults; tags at the call site can augment or override them.

### 3.4 Tags: Behavior Modifiers

Tags are inline modifiers that change *how* an operation executes without changing *what* it does. They are appended with angle brackets:

```orchid
Search("topic")<deep, retry=3, timeout=30s>
CoT("sensitive analysis")<private, verbose>
```

Tags fall into four categories:

- **Execution tags** control thoroughness: `<urgent>`, `<quick>`, `<deep>`, `<best_effort>`, `<strict>`
- **Reliability tags** control fault tolerance: `<retry=3>`, `<backoff>`, `<timeout=10s>`, `<cached>`, `<fallback=X>`
- **Output tags** control visibility: `<private>`, `<silent>`, `<verbose>`, `<raw>`, `<cite>`
- **Composition tags** control context: `<append>`, `<isolated>`, `<frozen>`

Tags can also be resolved dynamically from variables (`CoT("analysis")<$mode>`), enabling runtime-configurable behavior. This system keeps the core macro invocation clean while providing fine-grained control when needed.

### 3.5 Confidence-Native Control Flow

Most programming languages treat operations as binary: they succeed or they fail. Agent operations are different. A search might return relevant but inconclusive results. An analysis might be sound but built on incomplete data. Ignoring this spectrum leads to brittle agent behavior.

Orchid addresses this with a hybrid confidence model. When `Confidence()` is called, the runtime computes a score between 0.0 and 1.0 by blending two signals:

**Provider signal (50%):** The LLM's subjective self-assessment of how certain it is about the result.

**Runtime signal (50%):** Objective metrics tracked during execution:
- Retry count (more retries indicates lower confidence)
- Error count
- Source diversity (more independent sources increases confidence)
- CoVe verification status (verified content gets a boost)
- Fork branch agreement (convergent parallel analyses increase confidence)
- Data freshness (stale cached values degrade confidence)
- Operation chain depth (deeply chained operations lose some confidence)

This blend means that even if an LLM reports high confidence, the runtime will temper that score if the data came from a single source, required multiple retries, or failed verification. Conversely, an LLM that hedges will see its confidence boosted if the data has been cross-verified from multiple sources.

Confidence integrates naturally into control flow:

```orchid
if Confidence(analysis) > 0.8:
    Formal(analysis)
elif Confidence(analysis) > 0.4:
    ELI5(analysis) + Explain("areas of uncertainty")
else:
    Creative("what additional data would help")
```

The `until` loop provides goal-directed iteration gated on confidence or validation:

```orchid
until Confidence() > 0.8:
    Search("additional evidence")<append>
    Refine(analysis)
```

### 3.6 Parallel Execution with Fork

The `fork` construct runs multiple branches concurrently and collects results. Named branches produce a dict; indexed branches produce a list:

```orchid
data := fork:
    market: Search("EV market data")
    tech: Search("battery R&D breakthroughs")
    policy: Search("EV policy incentives")

report := Consensus(data)
```

Fork also supports parallel map over a collection:

```orchid
findings := fork:
    for q in sub_questions:
        Search("$q") >> CoVe >> Extract(_, schema="claims_with_evidence")
```

This enables patterns that are common in sophisticated agent workflows -- multi-perspective analysis, ensemble reasoning, parallel evidence gathering -- in a syntax that reads like a description of the strategy rather than a concurrency implementation.

### 3.7 Agent Composition

Orchid distinguishes between **macros** (pure cognitive transforms with no side effects) and **agents** (stateful, permissioned actors that interact with the world). This distinction is fundamental: if it only thinks, it is a macro; if it acts on the world, it is an agent.

Agents declare permissions explicitly and can communicate through a lightweight event system:

```orchid
agent Researcher(topic, depth="standard"):
    permissions:
        web: [search, fetch]

    sources := fork:
        academic: Search("$topic site:arxiv.org")
        news: Search("$topic recent developments")
        technical: Search("$topic technical analysis")

    vetted := CoVe(sources)
    analysis := CoT(vetted)<$depth>
    return Formal(analysis)
```

Multi-agent pipelines compose naturally by calling agents as you would call macros:

```orchid
raw := Gatherer("CRISPR gene therapy 2024")
insights := Analyst(raw)
article := Writer(insights, tone="technical")
```

Agents communicate through four event primitives: `emit` (broadcast), `on` (register handler), `listen` (block until input), and `Stream` (produce an iterable of events). Events are process-local with at-least-once delivery, and handlers should be idempotent.

### 3.8 Tool Integration via MCP

Orchid connects to external tools through the Model Context Protocol (MCP) [6], a standard for LLM-to-tool communication. MCP servers provide tools for file systems, databases, web search, GitHub, and other services. Orchid scripts declare tool dependencies and call them through a consistent namespace syntax:

```orchid
@requires MCP("filesystem"), MCP("brave-search")

Use MCP("filesystem") as fs
Use MCP("brave-search") as search

headlines := search:brave_news_search(query="NVIDIA earnings", count=10)
analysis := CoT("analyze sentiment from: $headlines")
fs:write_file(path="report.md", content=Formal(analysis))
```

The runtime also supports a plugin system for in-process extensions. Plugins are JavaScript/TypeScript modules that register operations and can call back into the LLM provider. Both MCP tools and plugins share the same `namespace:operation()` invocation syntax.

### 3.9 Error Handling and Atomic Blocks

Orchid provides structured error handling through `try`/`except`/`finally` blocks, with named error types (`Timeout`, `DataUnavailable`, `ValidationError`, `PermissionDenied`) that map to common agent failure modes:

```orchid
try:
    data := API:Fetch(endpoint)
    analysis := CoT(data)
except Timeout:
    data := Cache:Load("last_known")<best_effort>
    analysis := CoT(data) + Explain("using cached data")
except DataUnavailable:
    analysis := CoT("work with available context only")<tentative>
```

Atomic blocks (delimited by `###`) provide transactional semantics: either all operations within the block succeed or none of their results are visible. This is useful for multi-step reasoning chains where partial completion would produce misleading results.

### 3.10 The Pipe Operator and Semantic Arithmetic

Two additional features round out the syntax. The pipe operator `>>` passes the output of one operation as the input to the next, enabling concise chains:

```orchid
Search("topic") >> CoVe >> CoT >> ELI5
```

Orchid also defines semantic arithmetic for string operands. The `+` operator performs LLM-powered synthesis (combining two texts intelligently), while `*` performs literal concatenation. Similarly, `-` performs semantic subtraction (rewriting to remove concepts) while `/` performs literal removal. This gives scripts a natural vocabulary for combining and manipulating text-based reasoning outputs:

```orchid
report := market_analysis + technical_analysis    # LLM synthesizes both
accessible := report - "jargon and acronyms"      # LLM removes jargon
```

---

## 4. Implementation

### 4.1 Architecture

The reference interpreter follows a classic pipeline architecture:

```
Source (.orch) -> Lexer -> Parser -> Interpreter -> Provider -> Output
```

The **lexer** tokenizes Orchid source into a stream of typed tokens (identifiers, operators, strings, numbers, keywords, indentation markers). The **parser** is a hand-written recursive descent parser that produces an abstract syntax tree (AST). The **interpreter** walks the AST, manages scoped environments, handles control flow, and dispatches reasoning operations to a **provider**.

### 4.2 The Provider Pattern

The critical architectural decision is the provider interface. The `OrchidProvider` interface defines five methods that partition all agent behavior into distinct capabilities:

```typescript
interface OrchidProvider {
  execute(operation, input, context, tags, options?)  // reasoning macros
  search(query, tags)                                  // web/knowledge retrieval
  confidence(scope?)                                   // self-assessment (0.0–1.0)
  toolCall(namespace, operation, args, tags)            // MCP/plugin dispatch
  generate(prompt, format, tags)                        // multimedia generation
}
```

The `execute` method handles all reasoning macros (`CoT`, `RedTeam`, `ELI5`, etc.). The remaining four methods handle orthogonal concerns: `search` for information retrieval, `confidence` for self-assessment, `toolCall` for external tool dispatch, and `generate` for multimedia output. An optional `getTokensUsed()` method enables session-level token tracking. This five-method surface decouples the interpreter entirely from any specific LLM:

- **ConsoleProvider**: Returns placeholder strings instantly, requiring no API key. This is the default for development and testing.
- **ClaudeProvider**: Calls the Anthropic Claude API with operation-specific system prompts that guide the model toward the right kind of reasoning for each macro. Each of the 46 operations maps to a tailored system prompt — for example, `RedTeam` instructs the model to adopt an adversarial mindset and look for failure modes, while `CoT` instructs step-by-step deliberation with numbered reasoning steps. Tag modifiers (16 total, across execution, output, and style categories) are appended to the system prompt to adjust behavior without changing the operation's core identity.
- **SandboxProvider**: Wraps any provider with rate limiting, token budgets, and prompt injection detection for security-sensitive deployments (see §4.4).

New providers (OpenAI, Gemini, local models) can be added by implementing the same interface. The scripts themselves do not change.

### 4.3 Tag Resolution

Tags are parsed by lookahead: when the parser encounters `<` after an operation, it speculatively attempts to parse a tag list. If parsing fails (e.g., the `<` was a comparison operator), the parser backtracks. This means tags are syntactically unambiguous despite sharing a delimiter with comparison operators.

At runtime, tags are resolved in two phases:

1. **Static tags** (`<deep>`, `<retry=3>`) pass through directly with their literal names and values.
2. **Dynamic tags** (`<$mode>`) resolve the named variable's string value as the tag name, enabling runtime-configurable behavior without changing the script.

Resolved tags are then dispatched through a behavior wrapper that applies their effects around the operation:

| Tag | Category | Behavior |
|-----|----------|----------|
| `<deep>`, `<quick>`, `<urgent>`, `<strict>` | Execution | Appended to the LLM system prompt as throughness/style modifiers |
| `<retry=N>` | Reliability | Retry the operation up to N times on failure |
| `<backoff>` | Reliability | Exponential delay between retries (1s, 2s, 4s… capped at 30s) |
| `<timeout=Ns>` | Reliability | Cancel the operation after N seconds (supports `s`, `m`, or bare ms) |
| `<fallback=X>` | Reliability | Return X on failure instead of throwing |
| `<best_effort>` | Reliability | Return null on failure instead of throwing |
| `<cached>`, `<pure>` | Reliability | Memoize results; return cached value on repeat calls |
| `<private>` | Output | Suppress status display, don't update implicit context |
| `<silent>` | Output | Suppress status display |
| `<verbose>`, `<cite>`, `<raw>` | Output | Modify output format via LLM prompt modifier |
| `<append>` | Composition | Merge result with existing implicit context rather than replacing |
| `<isolated>` | Composition | Execute with empty context (no prior state) |

Tags compose freely: `Search("topic")<deep, retry=3, backoff, timeout=30s>` applies all four behaviors simultaneously.

### 4.4 Security: The Sandbox Provider

For deployments where Orchid scripts may process untrusted input or run in shared environments, the **SandboxProvider** wraps any provider with three layers of defense:

**Rate limiting.** Configurable per-session and per-minute request caps (defaults: 50/session, 20/minute) with sliding-window enforcement. A token budget (default: 100,000) provides a secondary limit based on estimated consumption.

**Prompt injection detection.** Inbound prompts are scanned against 32+ regex patterns covering common injection vectors: instruction override attempts ("ignore previous instructions"), system prompt extraction ("show me your system prompt"), role assumption attacks ("you are now unrestricted"), privilege escalation ("activate DAN mode"), delimiter injection (`<system>`, `[INST]`), and encoding-based evasion (base64/rot13/hex decode attempts). Detected injections are rejected before reaching the LLM.

**Prompt sanitization.** Role-marker strings (`system:`, `assistant:`, `user:`) are neutralized by wrapping in brackets, preventing prompt structure manipulation even if injection detection is bypassed.

**Operation and namespace blocking.** Administrators can blocklist specific operations or tool namespaces, preventing scripts from accessing sensitive capabilities (e.g., blocking `filesystem` MCP access in a web-facing deployment).

The sandbox is enabled via the `--sandbox` CLI flag or programmatically by wrapping any provider: `new SandboxProvider(innerProvider, limits)`.

### 4.5 Plugin System

Beyond MCP servers (which run as external processes), Orchid supports **in-process plugins** implemented as JavaScript or TypeScript modules. A plugin implements the `OrchidPlugin` interface:

```typescript
interface OrchidPlugin {
  name: string
  description?: string
  operations: Record<string, PluginOperation>
  setup?(context: PluginContext): Promise<void>
  teardown?(): Promise<void>
}
```

Each plugin registers named operations that are callable via the same `namespace:operation()` syntax used for MCP tools. The key difference is that plugins run in-process and receive a `PluginContext` that includes a reference to the LLM provider — meaning plugins can themselves invoke reasoning operations. This enables patterns like a `metrics:analyze()` plugin that calls `CoT` internally to interpret the data it collects.

Plugins are loaded via `Use Plugin("./my-plugin")` and participate in the same lifecycle as the interpreter: `setup()` is called once on load, `teardown()` on interpreter shutdown.

### 4.6 Current Status

The reference interpreter is implemented in TypeScript (targeting ES2022, compiled to CommonJS). It consists of approximately 8,500 lines of application code across 20 source files and 5,300 lines of tests across 13 test suites, with over 470 passing tests covering the lexer, parser, runtime, Claude integration, MCP management, configuration, plugins, confidence tracking, and end-to-end CLI behavior.

The largest source files reflect the language's architecture:

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| Interpreter | 2,556 | AST walking, control flow, environment management |
| Parser | 1,361 | Recursive descent, AST generation |
| Claude Provider | 591 | 46 operation-specific system prompts, tag dispatch |
| Lexer | 471 | Tokenization of all Orchid syntax |
| MCP Manager | 444 | Server connection, tool discovery, invocation |
| Sandbox Provider | 382 | Rate limiting, injection detection, sanitization |

The interpreter is published on npm as `@orchid-dsl/orchid` and can be installed and run in under a minute:

```bash
npm install -g @orchid-dsl/orchid
orchid examples/hello_world.orch                     # console provider (instant, no API key)
orchid --provider claude examples/hello_world.orch   # Claude API (requires ANTHROPIC_API_KEY)
```

The only runtime dependencies are the Anthropic SDK (for the Claude provider), the MCP SDK (for tool integration), and Zod (for schema validation).

### 4.7 Debugging and Diagnostics

Orchid provides several mechanisms for understanding what a script is doing at runtime:

**Trace mode** (`--trace` flag or `Trace()` macro) emits a step-by-step execution log showing each operation, its input, the resolved tags, and the provider's response. This is the primary debugging tool — it shows exactly what the interpreter sent to the LLM and what came back.

**The `Explain` macro** asks the LLM to articulate its reasoning process transparently, including trade-offs considered and alternatives rejected. This is useful for auditing agent decisions after the fact.

**`Checkpoint` and `Rollback`** provide save/restore points within a script, enabling iterative debugging of multi-step reasoning chains without re-executing earlier steps.

**Error messages** are designed to be actionable. Runtime errors include the operation name, the line number in the source script, and a description of what went wrong:

```
DataUnavailable at line 12: Search("quantum computing 2024") returned no results
  in macro ThreatModel, called from line 28
```

The `--parse` and `--lex` flags enable syntax-level debugging by printing the AST or token stream without executing the script.

---

## 5. Practical Applications

To illustrate what Orchid looks like in practice, we walk through four examples of increasing complexity.

### 5.1 Hello World: A 12-Line Research Brief

The introductory example from Section 1 is not a toy -- it is a complete, runnable script that performs web search, fact-checking, chain-of-thought reasoning, and confidence-gated output formatting. It demonstrates the core value proposition: a non-trivial agent workflow expressed in 12 readable lines.

### 5.2 STRIDE Threat Modeling

Security threat modeling is a natural fit for Orchid's parallel reasoning capabilities. The following script reads a system's architecture, decomposes its attack surface, then runs six parallel `RedTeam` analyses (one per STRIDE category) before synthesizing and prioritizing the results:

```orchid
@orchid 0.1
@name "Threat Model Generator"
@requires MCP("filesystem")

Use MCP("filesystem") as fs

macro ThreatModel(system_description):
    components := Decompose("components and interfaces of $system_description")
    surface := CoT("identify entry points and trust boundaries in $components")

    threats := fork:
        spoofing: RedTeam("spoofing attacks against $surface")
        tampering: RedTeam("tampering attacks against $surface")
        repudiation: RedTeam("repudiation risks in $surface")
        info_disc: RedTeam("information disclosure in $surface")
        dos: RedTeam("denial of service against $surface")
        priv_esc: RedTeam("privilege escalation in $surface")

    ranked := Prioritize(Synthesize(threats), criteria="likelihood * impact")
    mitigations := CoT("concrete mitigations for top 10: $ranked")
    return Formal(ranked + mitigations)

spec := fs:read_text_file(path="docs/architecture.md")
report := ThreatModel(spec)
fs:write_file(path="security/threat_model.md", content=report)
```

This example highlights three features: custom macro definition for reusable patterns, fork parallelism for multi-angle analysis, and MCP integration for reading and writing files.

### 5.3 Multi-Agent Research Pipeline

Orchid's agent composition allows structuring complex workflows as pipelines of specialized agents:

```orchid
agent Gatherer(topic):
    permissions:
        web: [search]

    raw := fork:
        general: Search("$topic overview")
        recent: Search("$topic latest developments 2024")
        technical: Search("$topic technical details")

    vetted := CoVe(raw)
    emit DataReady(Extract(vetted, schema="key_facts"))
    return Extract(vetted, schema="key_facts")

agent Analyst(data):
    perspectives := fork:
        optimistic: Steelman(data)
        critical: RedTeam(data)
        neutral: CoT("balanced assessment of: $data")

    return Refine(Synthesize(perspectives))

agent Writer(analysis, tone="formal"):
    if tone == "formal":
        return Formal(analysis)
    else:
        return ELI5(analysis)

raw_data := Gatherer("impact of LLMs on software engineering")
insights := Analyst(raw_data)
article := Writer(insights, tone="formal")
```

Each agent has a clear responsibility, declares its permissions, and communicates through return values and events. The pipeline reads like a description of the workflow, not an implementation of it.

### 5.4 Code Review Agent

The code review example shows Orchid interacting with GitHub via MCP, performing parallel multi-angle analysis, and using confidence to calibrate its output:

```orchid
@orchid 0.1
@requires MCP("github")

pr := github:get_pull_request(owner="org", repo="app", pull_number=42)
files := github:get_pull_request_files(owner="org", repo="app", pull_number=42)

review := fork:
    correctness: CoT("review for bugs and logic errors: $files")
    security: RedTeam("review for security vulnerabilities: $files")
    design: CoT("review architecture and design: $files")
    testing: CoT("identify missing test cases: $files")

summary := Synthesize(review)

if Confidence(summary) > 0.7:
    Formal(summary)
else:
    CoT("rephrase as questions rather than assertions: $summary")
```

When confidence is high, the agent asserts its findings. When confidence is low, it rephrases findings as questions -- a pattern that mirrors good code review practice among human engineers.

---

## 6. Quantitative Evaluation

To move beyond qualitative claims about readability and conciseness, we compare equivalent agent workflows implemented in Orchid, Python + LangChain, and DSPy across four dimensions: lines of orchestration code, number of LLM API calls, token overhead (non-content tokens consumed by framework scaffolding), and time to first working prototype.

### 6.1 Methodology

We implemented four workflows in each framework: (1) a simple search-verify-report pipeline, (2) a multi-perspective analysis with parallel execution, (3) a confidence-gated iterative refinement loop, and (4) a multi-agent research pipeline with tool integration. For Python + LangChain and DSPy, we used idiomatic implementations following each framework's documentation and best practices. Lines of code counts exclude imports, blank lines, and comments to focus on orchestration logic.

### 6.2 Results

**Lines of orchestration code:**

| Workflow | Orchid | Python + LangChain | DSPy | Orchid Reduction |
|----------|--------|---------------------|------|------------------|
| Search-verify-report | 8 | 47 | 32 | 83% / 75% |
| Multi-perspective analysis | 14 | 89 | 61 | 84% / 77% |
| Confidence-gated refinement | 11 | 72 | N/A* | 85% / — |
| Multi-agent pipeline | 38 | 156 | 94 | 76% / 60% |

*DSPy does not natively support confidence-gated control flow; a custom metric module would be required.

Orchid reduces orchestration code by **70–85%** compared to LangChain and **60–77%** compared to DSPy. The reduction is most dramatic for workflows that use confidence gating, parallel fork, or multi-agent composition — features that require substantial boilerplate in general-purpose frameworks.

**LLM API calls per workflow execution:**

All three frameworks produce the same number of LLM API calls for equivalent workflows. Orchid does not introduce additional calls — its macros map 1:1 to provider invocations. The difference is entirely in the orchestration layer, not the LLM interaction layer.

**Token overhead:**

Orchid's Claude provider appends a system prompt (50–150 tokens) per operation to guide the model's reasoning strategy. LangChain's agent executor appends similar system context plus tool descriptions and output parsers (100–400 tokens per call). DSPy's compiled modules are optimized for token efficiency but require an upfront compilation step. In practice, per-call token overhead is comparable across frameworks; the difference is in developer time, not API cost.

**Time to first working prototype:**

In informal testing with developers familiar with all three frameworks, Orchid scripts reached a working state in 2–5 minutes for simple workflows and 10–15 minutes for complex multi-agent pipelines. Equivalent LangChain implementations took 15–30 minutes and 45–90 minutes respectively, largely due to boilerplate setup, chain configuration, and debugging callback behavior. DSPy fell between the two, with compilation adding a fixed overhead.

### 6.3 Discussion

The quantitative results confirm Orchid's qualitative claim: orchestration code is dramatically shorter. But the more important finding is that Orchid's reduction does not come at the cost of expressiveness. Every workflow that can be expressed in LangChain or DSPy can be expressed in Orchid, and several patterns (confidence-gated loops, fork parallelism) are easier to express in Orchid because they are language primitives rather than library abstractions.

The primary tradeoff is flexibility. LangChain and DSPy, being Python libraries, can fall back to arbitrary Python code when the framework's abstractions are insufficient. Orchid cannot — it is constrained to its own syntax. For most agent orchestration workflows, this constraint is a feature (it keeps scripts readable and auditable), but for edge cases requiring custom data transformations or complex business logic, a hybrid approach (Orchid for orchestration, plugins for custom logic) may be appropriate.

---

## 7. Orchid Without the Interpreter

An unusual property of Orchid is that its syntax is close enough to natural language that it can be partially used *without* a formal interpreter. If a user pastes the Orchid specification (or a condensed primer document) into an LLM chat session that has agentic capabilities enabled, the LLM can interpret and follow Orchid scripts directly.

This works because Orchid's macros have intuitive names (`CoT`, `ELI5`, `RedTeam`), its control flow uses familiar indentation-based syntax, and its tags read like English adjectives (`<deep>`, `<urgent>`, `<private>`). An LLM that has read the specification understands the execution model well enough to follow it.

### 7.1 Methodology

We tested interpretive mode with three models: Google Gemini 2.5 Pro (with web search enabled), Anthropic Claude Opus 4, and OpenAI GPT-4o. Each model received the same inputs: (1) the Orchid language primer document (a condensed version of the specification), and (2) a test script. We used two test scripts: a simple search-verify-report pipeline and a more complex multi-perspective fork analysis. For each combination, we evaluated whether the model: (a) followed the execution order, (b) respected the macro semantics, (c) evaluated the confidence branch correctly, and (d) labeled its steps with Orchid operation names.

### 7.2 Results

All three models successfully interpreted the simple pipeline. The Gemini result is reproduced here as a representative example.

**Test script:**

```orchid
results := Search("latest breakthroughs in fusion energy")
vetted := CoVe(results)
analysis := CoT("summarize the key developments in $vetted")

if Confidence(analysis) > 0.7:
    Formal(analysis)
else:
    ELI5(analysis)
```

**Gemini execution trace** (generated unprompted):

```
Search(...): Queried global news and scientific journals for fusion
breakthroughs across late 2025 and early 2026.

CoVe(_): Extracted and verified key claims from the search noise:
  Claim: Private fusion investment exceeded $10B-$13B.
    (Status: Verified via IAEA/FIA Global Fusion Reports).
  Claim: Inertia Enterprises raised $450M.
    (Status: Verified via February 2026 financial reporting).
  Claim: AI digital twins are predicting plasma turbulence.
    (Status: Verified via Berkeley Lab, Feb 2026).
  Claim: China's EAST reactor broke plasma density limits.
    (Status: Verified via January 2026 scientific publications).

CoT(_): Synthesizing the vetted claims into three core themes:
Capital/Commercialization, AI/Computational progress, and Physical
Reactor limits.

Confidence(_): Evaluated at 0.92. The sources are highly reputable
(Department of Energy, IAEA, Berkeley Lab) and the data is heavily
cross-corroborated.

Control Flow: 0.92 > 0.7. Routing output through the Formal macro.
```

**Cross-model comparison:**

| Capability | Gemini 2.5 Pro | Claude Opus 4 | GPT-4o |
|------------|---------------|----------------|--------|
| Correct execution order | Yes | Yes | Yes |
| Macro semantics respected | Yes | Yes | Yes |
| Confidence branch evaluated | Yes | Yes | Yes |
| Steps labeled with operation names | Yes | Yes | Partial* |
| Fork branches executed independently | Yes | Yes | No** |

*GPT-4o labeled most but not all steps. **GPT-4o tended to merge fork branches into a single analysis rather than maintaining independent perspectives.

### 7.3 Significance

Without any special tooling, the models understood and followed the Orchid execution model: searching, verifying individual claims with source attribution, performing chain-of-thought synthesis, self-assessing confidence, evaluating the conditional branch, and routing output through the appropriate macro. This demonstrates the language's core claim: that these reasoning patterns are close enough to natural cognition that they carry meaning even outside a formal execution environment.

This "interpretive" mode has real utility. It lets users experiment with Orchid's cognitive patterns before installing the interpreter. It provides a quick way to prototype workflows in any LLM chat interface. And it highlights a practical bootstrapping path: a user can start with interpretive mode today and graduate to the full interpreter when they need hybrid confidence tracking, real parallelism, MCP tool integration, or deterministic execution guarantees.

The limitations of interpretive mode are clear. Without the interpreter, there is no hybrid confidence model (the LLM fabricates a confidence number rather than blending provider and runtime signals), no real parallelism (fork branches execute sequentially within the LLM's single response), no MCP connections, no error handling, and no atomicity guarantees. The interpretive mode is a useful sketch pad; the interpreter is the production runtime.

---

## 8. Discussion

### 8.1 Strengths

Orchid's primary strength is readability. Every script we have shown can be understood by someone who has never written code, yet each is a complete, executable program. This is not incidental -- it is the result of treating cognitive operations as named primitives rather than API calls, using indentation and natural-language keywords for control flow, and keeping the syntax deliberately minimal.

The confidence model is, to our knowledge, unique among agent orchestration tools. By blending subjective LLM assessment with objective runtime signals, Orchid enables adaptive behavior that degrades gracefully rather than failing abruptly.

The provider pattern ensures that Orchid scripts are not locked to any specific LLM. The same script runs against Claude, a local model, or a mock provider for testing, with no code changes.

The security sandbox (§4.4) addresses a concern that is often an afterthought in agent frameworks: what happens when scripts process untrusted input. By providing prompt injection detection, rate limiting, and namespace blocking as a first-class wrapper, Orchid makes secure deployment a configuration choice rather than a reimplementation effort.

### 8.2 Limitations

Orchid is untyped. Variables can hold any value, and type errors surface at runtime. We have deferred a type system intentionally -- lightweight types could catch errors early but risk hurting the language's readability and accessibility. This is a tradeoff we are monitoring.

The reference interpreter currently supports only the Anthropic Claude API as a production LLM backend. OpenAI, Gemini, and local model providers are planned but not yet implemented.

The ecosystem is young. There is no syntax highlighting, no language server, no debugger, and no large body of community-written scripts or macros. These are expected gaps for a v0.1 release.

The quantitative evaluation (§6) compares lines of code and development time, but does not yet measure output quality — whether Orchid's structured reasoning macros produce better results than equivalent ad-hoc prompts. This is a meaningful gap that future work should address with systematic output quality benchmarks.

### 8.3 Comparison with Existing Approaches

| Feature                    | Orchid  | LangChain [1] | DSPy [5] | AutoGen [3] | CrewAI [4] |
|----------------------------|---------|---------------|----------|-------------|------------|
| Human-readable             | Yes     | No            | No       | No          | Partially  |
| Reasoning as primitives    | Yes     | No            | Partially| No          | No         |
| Native confidence handling | Yes     | No            | No       | No          | No         |
| Composable agents          | Yes     | Partially     | Partially| Yes         | Yes        |
| Parallel execution         | Yes     | Partially     | No       | Yes         | Partially  |
| No programming required    | Yes     | No            | No       | No          | No         |
| Tool integration (MCP)     | Yes     | Partially     | No       | Partially   | Partially  |
| Security sandbox           | Yes     | No            | No       | No          | No         |
| Formal grammar (EBNF)      | Yes     | N/A           | No       | N/A         | N/A        |
| Lines of code (search-verify-report) | 8 | 47 | 32 | ~55 | ~40 |

---

## 9. Getting Started

Orchid is designed to go from install to first working script in under five minutes.

**Step 1: Install**

```bash
npm install -g @orchid-dsl/orchid
```

**Step 2: Write a script** (save as `hello.orch`)

```orchid
@orchid 0.1
@name "Hello Orchid"

topic := "the future of renewable energy"
research := Search(topic)
verified := CoVe(research)
summary := CoT(verified)<deep>

if Confidence(summary) > 0.7:
    Formal(summary)
else:
    ELI5(summary)
```

**Step 3: Run with the console provider** (no API key needed)

```bash
orchid hello.orch
```

This produces placeholder output instantly, letting you verify syntax and structure.

**Step 4: Run with a real LLM** (requires `ANTHROPIC_API_KEY`)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
orchid --provider claude hello.orch
```

**Step 5: Add tools** (optional — requires `orchid.config.json`)

```bash
orchid mcp install filesystem    # auto-configures MCP server
```

The `examples/` directory contains 11 complete scripts demonstrating progressively advanced features, from basic reasoning chains to multi-agent pipelines with MCP tool integration.

---

## 10. Future Work

Several directions for future development are planned or under active consideration.

**Python module.** The largest community working with LLM agents today uses Python. A Python package (`orchid-dsl` on PyPI) that provides the same `parse()` and `execute()` API as the Node.js package would substantially expand Orchid's reach. This is a near-term priority.

**Additional LLM providers.** The provider interface is designed for extensibility. Implementations for OpenAI, Google Gemini, and local models (via Ollama or similar) are planned.

**VS Code extension.** Syntax highlighting, bracket matching, and language server support (autocomplete, go-to-definition for macros and agents) would improve the authoring experience significantly.

**Optional type system.** A lightweight, opt-in type annotation system could catch common errors (e.g., passing a string where a list is expected) without compromising readability for simple scripts.

**Streaming responses.** The current interpreter waits for each LLM call to complete before proceeding. Streaming support would allow partial results to be displayed and acted on incrementally.

**Cross-process agent events.** The event system (`emit`/`on`) is currently process-local. Distributed eventing via MCP or external message brokers would enable multi-process agent deployments.

**Output quality benchmarks.** Systematic evaluation of whether Orchid's structured reasoning macros (with their tailored system prompts) produce measurably better outputs than equivalent ad-hoc prompts, across different task types and LLM providers.

**Confidence calibration.** Systematic benchmarking of the confidence model across different providers and task types to establish recommended weight distributions and identify areas where the hybrid model could be improved.

---

## 11. Conclusion

The central claim of this paper is straightforward: reasoning deserves to be a first-class language primitive. When we write `CoT("analyze trends")<deep>`, we are not calling a function -- we are naming a way of thinking and specifying how thoroughly it should be applied. This distinction, between orchestrating computation and choreographing cognition, is what makes Orchid different from existing approaches.

The language is available today. The npm package (`@orchid-dsl/orchid`) provides a complete interpreter with 46 built-in operations, MCP tool integration, parallel fork execution, a hybrid confidence model, a security sandbox, and support for the Anthropic Claude API. The full specification, including a formal EBNF grammar, is published under the MIT license. A Python package is planned.

We built Orchid because we needed it. The experience of writing agent workflows in Python, buried under API boilerplate and retry loops, convinced us that the problem was not the framework but the medium. A dedicated language -- small enough to learn in an afternoon, expressive enough for production workflows, and readable enough to share with non-programmers -- seemed like a gap worth filling.

Whether Orchid is the right language for this purpose is for the community to decide. We welcome feedback, contributions, alternative implementations, and, above all, real-world use. The source code is at https://github.com/orchid-dsl/orchid.

---

## Appendix A: EBNF Grammar

The complete formal grammar for Orchid 0.1. Terminal symbols are in `UPPER_CASE`; non-terminals in `lower_case`.

```ebnf
program        ::= header? statement*
header         ::= metadata+
metadata       ::= '@' IDENTIFIER value NEWLINE

statement      ::= assignment | operation | control | atomic_block
                  | agent_def | macro_def | import_stmt | use_stmt
                  | emit_stmt | on_stmt | return_stmt | comment

assignment     ::= IDENTIFIER ':=' expression NEWLINE
                 | IDENTIFIER '+=' expression NEWLINE

expression     ::= pipe_expr
pipe_expr      ::= alt_expr ('>>' alt_expr)*
alt_expr       ::= or_expr ('|' or_expr)*
or_expr        ::= and_expr ('or' and_expr)*
and_expr       ::= not_expr ('and' not_expr)*
not_expr       ::= 'not' not_expr | cmp_expr
cmp_expr       ::= in_expr (cmp_op in_expr)?
cmp_op         ::= '==' | '!=' | '>' | '<' | '>=' | '<='
in_expr        ::= merge_expr ('in' merge_expr)?
merge_expr     ::= arith_expr ('+' arith_expr)*
arith_expr     ::= unary_expr (('*' | '/' | '-') unary_expr)*
unary_expr     ::= '-' unary_expr | postfix_expr
postfix_expr   ::= primary ('.' IDENTIFIER | '(' args? ')' | '[' expression ']')*
primary        ::= operation | IDENTIFIER | literal | '(' expression ')'
                 | fork_expr | listen_expr | stream_expr

operation      ::= IDENTIFIER count? '(' args? ')' tags?
               |   IDENTIFIER tags?
               |   namespace ':' IDENTIFIER '(' args? ')' tags?
count          ::= '[' INTEGER ']'

args           ::= arg (',' arg)*
arg            ::= expression | IDENTIFIER '=' expression

tags           ::= '<' tag (',' tag)* '>'
tag            ::= IDENTIFIER ('=' value)? | '$' IDENTIFIER

control        ::= if_stmt | for_stmt | while_stmt | until_stmt
               |   try_stmt | assert_stmt | require_stmt

if_stmt        ::= 'if' expression ':' suite
                    ('elif' expression ':' suite)*
                    ('else' ':' suite)?
for_stmt       ::= 'for' IDENTIFIER 'in' expression ':' suite
while_stmt     ::= 'while' expression ':' suite
until_stmt     ::= 'until' expression ':' suite
try_stmt       ::= 'try' ':' suite
                    ('except' IDENTIFIER ':' suite)*
                    ('finally' ':' suite)?

assert_stmt    ::= 'assert' expression (',' STRING)?
require_stmt   ::= 'require' expression (',' STRING)?

agent_def      ::= 'agent' IDENTIFIER '(' params? ')' ':'
                    docstring? permissions? suite
macro_def      ::= 'macro' IDENTIFIER '(' params? ')' tags? ':' suite

permissions    ::= 'permissions' ':' NEWLINE INDENT perm_line+ DEDENT
perm_line      ::= IDENTIFIER ':' list NEWLINE

import_stmt    ::= 'import' path ('as' IDENTIFIER)?
use_stmt       ::= 'Use' ('MCP' | 'Plugin') '(' STRING ')' ('as' IDENTIFIER)?

fork_expr      ::= 'fork' ('[' INTEGER ']')? ':' NEWLINE INDENT fork_body DEDENT
fork_body      ::= statement+
               |   (IDENTIFIER ':' statement NEWLINE)+
               |   for_stmt

emit_stmt      ::= 'emit' IDENTIFIER '(' expression? ')'
on_stmt        ::= 'on' IDENTIFIER '(' IDENTIFIER? ')' ':' suite
listen_expr    ::= 'listen' IDENTIFIER '(' ')'
stream_expr    ::= 'Stream' '(' expression? ')'

atomic_block   ::= '###' NEWLINE statement+ '###' NEWLINE

literal        ::= STRING | NUMBER | BOOLEAN | collection
collection     ::= list | dict
list           ::= '[' (expression (',' expression)*)? ']'
dict           ::= '{' (IDENTIFIER ':' expression
                        (',' IDENTIFIER ':' expression)*)? '}'

suite          ::= NEWLINE INDENT statement+ DEDENT
comment        ::= '#' TEXT NEWLINE
docstring      ::= '"""' TEXT '"""' NEWLINE
```

---

## References

[1] Chase, H. (2022). LangChain. https://github.com/langchain-ai/langchain

[2] Liu, J. (2022). LlamaIndex. https://github.com/run-llama/llama_index

[3] Wu, Q., Bansal, G., Zhang, J., Wu, Y., Li, B., Zhu, E., Jiang, L., Zhang, X., Zhang, S., Liu, J., Awadallah, A.H., White, R.W., Burger, D., & Wang, C. (2023). AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation. arXiv:2308.08155.

[4] Moura, J. (2023). CrewAI. https://github.com/crewai/crewai

[5] Khattab, O., Singhvi, A., Maheshwari, P., Zhang, Z., Santhanam, K., Vardhamanan, S., Haq, S., Sharma, A., Joshi, T.T., Mober, H., et al. (2023). DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines. arXiv:2310.03714.

[6] Anthropic. (2024). Model Context Protocol. https://modelcontextprotocol.io

[7] Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. arXiv:2201.11903.

[8] Yao, S., Yu, D., Zhao, J., Shafran, I., Griffiths, T.L., Cao, Y., & Narasimhan, K. (2023). Tree of Thoughts: Deliberate Problem Solving with Large Language Models. arXiv:2305.10601.

[9] Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2022). ReAct: Synergizing Reasoning and Acting in Language Models. arXiv:2210.03629.

[10] Dhuliawala, S., Komeili, M., Xu, J., Raileanu, R., Li, X., Celikyilmaz, A., & Weston, J. (2023). Chain-of-Verification Reduces Hallucination in Large Language Models. arXiv:2309.11495.

[11] Hong, S., Zhuge, M., Chen, J., Zheng, X., Cheng, Y., Zhang, C., Wang, J., Wang, Z., Yau, S.K.S., Lin, Z., Zhou, L., Ran, C., Xiao, L., Wu, C., & Schmidhuber, J. (2024). MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework. arXiv:2308.00352.

[12] Significant Gravitas. (2023). AutoGPT. https://github.com/Significant-Gravitas/AutoGPT
