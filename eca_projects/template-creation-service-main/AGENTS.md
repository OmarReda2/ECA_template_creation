# Agent Instructions


- Follow `submission-module-spec.md` strictly when working on the submission module.
- Keep the system as a modular monolith.
- Keep backend architecture layered / n-tier.
- Make minimal modifications only.
- Do not broadly refactor the existing template module.
- Reuse the existing template/version/schema logic as the source of truth.
- Do not implement submission persistence, approval workflow, or correction/edit UI.
- Do not refactor export architecture unless strictly required.
- Keep diffs small and reviewable.
- Implement one slice at a time only.
- Before coding, explain the plan, files to change, and assumptions.

# Source of Truth Rules

1. /docs/* = system truth (architecture, flows, constraints)
2. spec files = feature intent (what to build)
3. If conflict exists → follow /docs/*