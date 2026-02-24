# arXiv Submission Notes

## Category

Primary: **cs.PL** (Programming Languages)
Cross-list: **cs.AI** (Artificial Intelligence), **cs.SE** (Software Engineering)

cs.PL is the right primary because Orchid is fundamentally a language design paper.
cs.AI gets it in front of the agent/LLM community. cs.SE covers the tooling angle.

## Format

The paper is already written in LaTeX: `orchid-whitepaper.tex`

The LaTeX source uses standard packages (article class, listings, booktabs,
natbib, hyperref, etc.) and should compile on any modern TeX distribution.

### To compile locally (if you install a TeX distribution):

```bash
cd paper
pdflatex orchid-whitepaper.tex
pdflatex orchid-whitepaper.tex   # run twice for references/ToC
```

Recommended distributions: MiKTeX (Windows), TeX Live (cross-platform).

### To compile via Overleaf (easiest path):

1. Go to https://www.overleaf.com and create a free account
2. New Project > Upload Project > upload `orchid-whitepaper.tex`
3. Hit "Recompile" -- the PDF renders in the right pane
4. Overleaf has a direct "Submit to arXiv" button under the menu

### To submit to arXiv directly:

arXiv accepts `.tex` source files. Upload `orchid-whitepaper.tex` and
arXiv's servers will compile it. No need to upload a PDF.

## arXiv Account Setup

1. Go to https://arxiv.org/user/register
2. You need an institutional endorsement OR an endorsement from an existing
   arXiv author in the category. For cs.PL and cs.AI, endorsement is often
   required for first-time submitters.
3. If you don't have an endorser, post the paper publicly (e.g. GitHub,
   personal site) and reach out to researchers in the field. Many will
   endorse a good paper from an independent researcher.

## Submission Checklist

- [x] Convert to LaTeX (orchid-whitepaper.tex -- done)
- [x] Add proper LaTeX formatting for code blocks (uses `listings` with custom Orchid language definition)
- [x] Verify all references have correct arXiv IDs where applicable
- [x] Add an ACM-style abstract
- [ ] Compile to PDF and verify figures/tables render correctly
- [ ] Create arXiv account and secure endorsement
- [ ] Submit .tex file to arXiv
- [ ] Write a brief cover letter if submitting to a workshop/conference later

## Complementary Distribution

### Twitter/X Strategy
- Thread format works well for language announcements
- Lead with the "read it aloud" 12-line example -- it's the hook
- Key angles:
  - "What if reasoning was a language primitive?"
  - Show the comparison table (Orchid vs LangChain vs YAML vs DSPy)
  - "You can try it right now: npm install -g orchid-lang"
  - Link to the paper, spec, and GitHub
- Tag relevant accounts: AI researchers, agent framework maintainers, PL researchers

### Hacker News
- Good fit for the "Show HN" format
- Title: "Show HN: Orchid -- a language where reasoning is the primitive"
- Lead with a code example, not the abstract
- The npm install line is important -- people want to try things immediately

### Reddit
- r/MachineLearning, r/LocalLLaMA, r/ProgrammingLanguages
- r/MachineLearning has a weekly "What are you working on?" thread

### Blog Post
- Consider a shorter, less formal version of the paper as a blog post
- Focus on the "why" and the examples, link to the paper for the full treatment
- Medium, Substack, or personal blog all work

## Timeline Suggestion

1. Compile the .tex to PDF (Overleaf is the easiest path) and review formatting
2. Submit to arXiv
3. Once the arXiv link is live (usually 1-2 business days after submission),
   post on Twitter/X, HN, and Reddit with the link
4. Engage with feedback and iterate on the spec/implementation
