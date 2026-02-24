# Orchid: A Cognitive Choreography Language for LLM Agent Orchestration

**Mike Koogle**

*Independent Researcher*

---

## Abstract

As large language model (LLM) agents grow more capable, the tools we use to orchestrate their behavior have not kept pace. Today's approaches fall into two camps: raw prompt engineering, which is fragile and non-composable, and general-purpose programming frameworks, which bury cognitive intent under API boilerplate. We present Orchid, a domain-specific language (DSL) in which reasoning is the primitive. Rather than writing code that calls an LLM API, an Orchid script describes *how an agent should think* -- using named reasoning strategies, confidence-aware control flow, parallel fork execution, and first-class tool integration via the Model Context Protocol (MCP). The language is human-readable by design: a non-programmer can read an Orchid script and understand the agent's intended behavior. We describe the language's design principles, its 30+ built-in reasoning macros, its hybrid confidence model, and its reference interpreter implementation. Orchid is available today as an open-source npm package (`orchid-lang`) with over 440 passing tests, and its specification is published under the MIT license.

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

1. **Reasoning as a primitive.** Orchid's 30+ built-in reasoning macros -- `CoT`, `CoVe`, `RedTeam`, `ELI5`, `Debate`, and others -- give named, reusable form to cognitive strategies that would otherwise be ad-hoc prompt fragments.

2. **Confidence-native control flow.** Traditional programs assume operations either succeed or fail. Agent operations exist on a spectrum. Orchid's hybrid confidence model blends the LLM's subjective self-assessment with objective runtime signals (retry counts, source diversity, verification status), enabling scripts to adapt to uncertainty rather than ignore it.

3. **Parallel execution with fork.** The `fork` construct runs multiple reasoning paths concurrently and collects results, enabling patterns like multi-perspective analysis, parallel search, and ensemble reasoning in a single readable expression.

4. **First-class tool integration.** Orchid integrates with external tools through the Model Context Protocol (MCP), giving scripts access to file systems, databases, web search, GitHub, and other services through a consistent `namespace:operation()` syntax.

5. **Radical readability.** Every design decision in Orchid prioritizes human comprehension. The syntax borrows familiar elements -- Python-style indentation, the `:=` walrus operator, `#` comments -- and combines them with domain-specific constructs that read like descriptions of thought rather than instructions to a machine.

The reference interpreter is implemented in TypeScript, passes over 440 tests across 13 test suites, and is published on npm as `orchid-lang`. The full language specification, including an EBNF grammar, is published under the MIT license.

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

Orchid ships with over 30 built-in macros organized into six categories:

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
- `Confidence`, `Explain`, `Reflect`, `Trace`, `Checkpoint`, `Rollback`

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

The critical architectural decision is the provider interface. The `OrchidProvider` interface defines a single method -- `execute(operation, input, options, tags)` -- that all reasoning macros delegate to. This decouples the interpreter entirely from any specific LLM:

- **ConsoleProvider**: Returns placeholder strings instantly, requiring no API key. This is the default for development and testing.
- **ClaudeProvider**: Calls the Anthropic Claude API with operation-specific system prompts that guide the model toward the right kind of reasoning for each macro (e.g., adversarial thinking for `RedTeam`, step-by-step deliberation for `CoT`).
- **SandboxProvider**: Wraps any provider with rate limiting and prompt sanitization for security-sensitive deployments.

New providers (OpenAI, Gemini, local models) can be added by implementing the same interface. The scripts themselves do not change.

### 4.3 Current Status

The reference interpreter is implemented in TypeScript (targeting ES2022, compiled to CommonJS). It consists of approximately 5,000 lines of application code and 5,000 lines of tests across 13 test suites with over 440 passing tests covering the lexer, parser, runtime, Claude integration, MCP management, configuration, plugins, confidence tracking, and end-to-end CLI behavior.

The interpreter is published on npm as `orchid-lang` and can be installed globally:

```bash
npm install -g orchid-lang
orchid examples/hello_world.orch
```

The only runtime dependencies are the Anthropic SDK (for the Claude provider), the MCP SDK (for tool integration), and Zod (for schema validation).

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

## 6. Orchid Without the Interpreter

An unusual property of Orchid is that its syntax is close enough to natural language that it can be partially used *without* a formal interpreter. If a user pastes the Orchid specification (or a condensed primer document) into an LLM chat session that has agentic capabilities enabled, the LLM can interpret and follow Orchid scripts directly.

This works because Orchid's macros have intuitive names (`CoT`, `ELI5`, `RedTeam`), its control flow uses familiar indentation-based syntax, and its tags read like English adjectives (`<deep>`, `<urgent>`, `<private>`). An LLM that has read the specification understands the execution model well enough to follow it.

To test this, we gave Google's Gemini model the Orchid language primer and the following script:

```orchid
# Search for a topic
results := Search("latest breakthroughs in fusion energy")

# Verify the claims
vetted := CoVe(results)

# Think step-by-step about what we found
analysis := CoT("summarize the key developments in $vetted")

# Choose output based on confidence
if Confidence(analysis) > 0.7:
    Formal(analysis)
else:
    ELI5(analysis)
```

Before producing its final output, Gemini generated the following execution trace unprompted:

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

Without any special tooling, the model understood and followed the Orchid execution model: it searched, verified individual claims with source attribution, performed chain-of-thought synthesis, self-assessed confidence at 0.92, evaluated the conditional branch (`0.92 > 0.7`), and routed its output through the `Formal` macro accordingly. It even labeled each step with the corresponding Orchid operation name.

This "interpretive" mode has real utility. It lets users experiment with Orchid's cognitive patterns before installing the interpreter. It provides a quick way to prototype workflows in any LLM chat interface. And it demonstrates the language's core claim: that these reasoning patterns are close enough to natural cognition that they carry meaning even outside a formal execution environment.

It also highlights a practical bootstrapping path. A user can start with the interpretive mode today -- pasting the primer into any capable LLM -- and graduate to the full interpreter when they need confidence tracking, parallel fork execution, MCP tool integration, or deterministic execution guarantees. The language is the same either way.

The limitations of interpretive mode are clear. Without the interpreter, there is no hybrid confidence model, no real parallelism, no MCP connections, no error handling, and no atomicity guarantees. The interpretive mode is a useful sketch pad; the interpreter is the production runtime.

---

## 7. Discussion

### 7.1 Strengths

Orchid's primary strength is readability. Every script we have shown can be understood by someone who has never written code, yet each is a complete, executable program. This is not incidental -- it is the result of treating cognitive operations as named primitives rather than API calls, using indentation and natural-language keywords for control flow, and keeping the syntax deliberately minimal.

The confidence model is, to our knowledge, unique among agent orchestration tools. By blending subjective LLM assessment with objective runtime signals, Orchid enables adaptive behavior that degrades gracefully rather than failing abruptly.

The provider pattern ensures that Orchid scripts are not locked to any specific LLM. The same script runs against Claude, a local model, or a mock provider for testing, with no code changes.

### 7.2 Limitations

Orchid is untyped. Variables can hold any value, and type errors surface at runtime. We have deferred a type system intentionally -- lightweight types could catch errors early but risk hurting the language's readability and accessibility. This is a tradeoff we are monitoring.

The reference interpreter currently supports only the Anthropic Claude API as a production LLM backend. OpenAI, Gemini, and local model providers are planned but not yet implemented.

The ecosystem is young. There is no syntax highlighting, no language server, no debugger, and no large body of community-written scripts or macros. These are expected gaps for a v0.1 release.

### 7.3 Comparison with Existing Approaches

| Feature                    | Orchid  | Python + LangChain | YAML Configs | DSPy    |
|----------------------------|---------|---------------------|--------------|---------|
| Human-readable             | Yes     | No                  | Partially    | No      |
| Reasoning as primitives    | Yes     | No                  | No           | Partially |
| Native confidence handling | Yes     | No                  | No           | No      |
| Composable agents          | Yes     | Partially           | No           | Partially |
| Parallel execution         | Yes     | Partially           | No           | No      |
| No programming required    | Yes     | No                  | Partially    | No      |
| Tool integration (MCP)     | Yes     | Partially           | Partially    | No      |
| Formal grammar (EBNF)      | Yes     | N/A                 | Yes          | No      |

---

## 8. Future Work

Several directions for future development are planned or under active consideration.

**Python module.** The largest community working with LLM agents today uses Python. A Python package (`orchid-lang` on PyPI) that provides the same `parse()` and `execute()` API as the Node.js package would substantially expand Orchid's reach. This is a near-term priority.

**Additional LLM providers.** The provider interface is designed for extensibility. Implementations for OpenAI, Google Gemini, and local models (via Ollama or similar) are planned.

**VS Code extension.** Syntax highlighting, bracket matching, and language server support (autocomplete, go-to-definition for macros and agents) would improve the authoring experience significantly.

**Optional type system.** A lightweight, opt-in type annotation system could catch common errors (e.g., passing a string where a list is expected) without compromising readability for simple scripts.

**Streaming responses.** The current interpreter waits for each LLM call to complete before proceeding. Streaming support would allow partial results to be displayed and acted on incrementally.

**Cross-process agent events.** The event system (`emit`/`on`) is currently process-local. Distributed eventing via MCP or external message brokers would enable multi-process agent deployments.

**Runtime benchmarks and confidence calibration.** Systematic benchmarking of the confidence model across different providers and task types would help establish recommended weight distributions and identify areas where the hybrid model could be improved.

---

## 9. Conclusion

The central claim of this paper is straightforward: reasoning deserves to be a first-class language primitive. When we write `CoT("analyze trends")<deep>`, we are not calling a function -- we are naming a way of thinking and specifying how thoroughly it should be applied. This distinction, between orchestrating computation and choreographing cognition, is what makes Orchid different from existing approaches.

The language is available today. The npm package (`orchid-lang`) provides a complete interpreter with MCP tool integration, parallel fork execution, a hybrid confidence model, and support for the Anthropic Claude API. The full specification, including a formal EBNF grammar, is published under the MIT license. A Python package is planned.

We built Orchid because we needed it. The experience of writing agent workflows in Python, buried under API boilerplate and retry loops, convinced us that the problem was not the framework but the medium. A dedicated language -- small enough to learn in an afternoon, expressive enough for production workflows, and readable enough to share with non-programmers -- seemed like a gap worth filling.

Whether Orchid is the right language for this purpose is for the community to decide. We welcome feedback, contributions, alternative implementations, and, above all, real-world use. The source code is at https://github.com/orchid-dsl/orchid.

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
