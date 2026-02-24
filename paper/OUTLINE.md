# Orchid White Paper -- Outline

**Working Title:** Orchid: A Cognitive Choreography Language for LLM Agent Orchestration

**Target:** arXiv (cs.PL / cs.AI cross-list), Twitter/X distribution

**Tone:** Technical but accessible. Academic structure with practical emphasis.
Audience: AI researchers, ML engineers, agent framework developers, technical PMs.

---

## Structure

### 1. Abstract (~150 words)
- What Orchid is (DSL for LLM orchestration where reasoning is the primitive)
- The gap it fills (no human-readable, machine-executable language for agent cognition)
- Key contributions (reasoning macros, confidence-native control flow, fork parallelism, MCP integration)
- Current status (npm package live, reference interpreter complete, 440+ tests)

### 2. Introduction (~800 words)
- The agent orchestration problem: agents are getting more capable, orchestration tools are not keeping up
- Current approaches and their pain points (raw prompting, Python+LangChain, YAML, DSPy)
- The core insight: reasoning should be a first-class language primitive, not an API wrapper
- "Read it aloud" -- Orchid's design goal of radical readability
- Contributions summary (5 bullet points)

### 3. Background and Related Work (~600 words)
- Prompt engineering as ad-hoc orchestration
- Framework approaches (LangChain, LlamaIndex, AutoGen, CrewAI)
- Compiler/optimizer approaches (DSPy)
- Config-driven approaches (YAML/JSON pipelines)
- What is missing: a proper language

### 4. Language Design (~1500 words)
#### 4.1 Design Principles (5 principles from spec)
#### 4.2 Core Syntax and Semantics
  - Sequential execution, walrus assignment, implicit context
  - String interpolation, collections, index access
#### 4.3 Reasoning Macros as Primitives
  - 30+ built-in macros across 6 categories
  - Key insight: macros encode *how to think*, not what to compute
  - Custom macro definition and tag composition
#### 4.4 Tags (Behavior Modifiers)
  - Execution, reliability, output, composition tags
  - Dynamic tag resolution
#### 4.5 Confidence-Native Control Flow
  - Hybrid confidence model (50% provider + 50% runtime signals)
  - Runtime signals: retries, errors, source diversity, CoVe, fork agreement
  - until loops with confidence gating
#### 4.6 Parallel Execution with Fork
  - Named forks (dict result), indexed forks (list result), parallel map
#### 4.7 Agent Composition
  - Agents vs macros distinction
  - Multi-agent pipelines
  - Event system (emit/on/listen/Stream)
#### 4.8 Tool Integration via MCP
  - Model Context Protocol for external tool access
  - Plugin system for in-process extensions

### 5. Implementation (~600 words)
- Architecture: Source -> Lexer -> Parser -> Interpreter -> Provider -> Output
- Provider pattern (decoupled from any specific LLM)
- Reference interpreter: TypeScript, ~5000 lines of tests, 440+ passing
- npm package: orchid-lang, installable today
- Sandbox mode for rate limiting and security

### 6. Practical Applications (~800 words)
- Walk through 3-4 real examples showing different capabilities:
  1. Hello World (12-line research brief -- the "read it aloud" example)
  2. STRIDE threat modeling (macros, fork parallelism, MCP tools)
  3. Multi-agent research pipeline (agents, events, confidence gating)
  4. Code review agent (GitHub MCP, parallel analysis, confidence-gated output)
- Emphasis on readability by non-programmers

### 7. Orchid Without the Interpreter (~400 words)
- The specification itself as a "prompt protocol"
- Pasting the spec/primer into an LLM session for interpretive execution
- Why this works: the language is close enough to natural language
- Limitations of interpretive vs. compiled execution

### 8. Discussion (~500 words)
- Strengths: readability, composability, confidence-awareness, provider-agnostic
- Limitations: untyped, single-provider reference impl, early ecosystem
- Comparison table (Orchid vs LangChain vs YAML vs DSPy)

### 9. Future Work (~400 words)
- Python module (orchid-lang on PyPI) to reach the Python ML community
- Additional LLM providers (OpenAI, local models, Gemini)
- VS Code syntax highlighting and language server
- Optional type system
- Streaming responses
- Cross-process agent events
- Runtime benchmarks and confidence calibration across providers

### 10. Conclusion (~200 words)
- Orchid demonstrates that reasoning can be a language primitive
- Available today via npm
- Open specification, MIT licensed, contributions welcome
- Call to action

### References
- Anthropic Claude, Model Context Protocol
- LangChain, DSPy, AutoGen, CrewAI
- Chain-of-Thought prompting (Wei et al. 2022)
- Tree of Thoughts (Yao et al. 2023)
- ReAct (Yao et al. 2022)

---

## Style Notes
- No m-dashes (use hyphens or "-- ")
- Straight apostrophes only
- No emojis
- Avoid "delve", "realm", "landscape", "leverage" and other overused words
- Write in first person plural ("we") for authorship
- Keep code examples short and self-explanatory
- Every code block should be readable by someone who has never seen Orchid
