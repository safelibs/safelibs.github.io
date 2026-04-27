### Why Rust instead of some other memory-safe language?

```
 ▐▛███▜▌   Claude Code
▝▜█████▛▘  Optimus 9000.1 · Claude ALL_YOUR_MONEY_PLAN
  ▘▘ ▝▝    /home/YOU
                                                                                
────────────────────────────────────────────────────────────────────────────────
❯ Change this repository from Rust to YOUR_LANGUAGE_HERE
────────────────────────────────────────────────────────────────────────────────
```

### How many tokens does this take?

Any specific answer will be obsolete in a few weeks. But if you really want the order of magnitude: about **{{total_tokens_b}}B** tokens across the {{validating_count}} validating ports so far, averaging out to roughly tens to hundreds of millions per library depending on size and how cleanly the C source factored. Per-library breakdown lives in [The Ports](#ports).

### Do you guarantee I won't get hacked?

rofl

In all seriousness: no. No human has ever read this code — not the library reimplementations, not the pipeline. Even if a port _were_ perfect (and none are), the best it could do is fix memory-safety bugs in that one upstream library. The application using it can still be vulnerable, other libraries it links against can still be vulnerable, or the `unsafe` parts of these libraries can still be vulnerable, or the translation can introduce entirely new non-memory bugs, or these libraries might set your computer on fire and turn your AI agent against you. _I_ don't use these things, and you'd be crazy to — but they're here if you want to try them out.

### Are these libraries correct?

These libraries pass adapted test cases from the original projects, and work in a drop-in manner with at least one client application.
Beyond that, who knows!

### But should I use these libraries?

Rule of thumb: if you still have a sandbox on in your AI agent, you should probably not use these libraries.
If your agent's sandbox is off, you have already made the leap!

### How can I help?

Two real bottlenecks right now: humanpower and tokens.

**Humanpower.** Scaling agentic ports is tricky from a security standpoint — supply-chain attacks are exactly the kind of thing that gets worse as you grow. If you and I trust each other and you're interested in pitching in, get in touch. If you're in a position to fund this kind of work, sponsoring [our research center](https://ctf.asu.edu) is the most direct way to keep it going.

**AI compute.** Much of this work was done during a brief experiment where Arizona State University gave every employee **infinite** codex usage. ASU's infinite-Codex experiment is over and there's no great replacement queued up. If you can throw tokens our way, that's huge.

**Beyond-frontier models.** One obvious next move is using more agents to audit the agent-generated code, and it'd be especially cool to see what a next-generation frontier model could do here — if a frontier lab wants to collaborate on this, let us know!

[Email me](mailto:yans@asu.edu) for more info!

### What about upgrading to new library versions?

Each port is a regenerable artifact — the workflow can be rerun from scratch against a new upstream release. There's also a dedicated upgrade stage in the pipeline that's intended to be cheaper than full retranslation, though it hasn't been battle-tested yet.

### Will these work outside of Ubuntu?

The current focus is Ubuntu drop-in replacements via apt, which forces strict ABI compatibility and shapes a sizable chunk of the unsafe-block count. Distributions with stricter, content-addressed semantics (like Nix) would be a better fit for agent-generated replacements; if you're interested in extending coverage there, get in touch.

### How do I report a port bug?

We can't accept code patches against the ported libraries — we don't audit the generated Rust closely enough to reason about adversarial PRs. We _do_ accept reproducer testcases against the [validator repo](https://github.com/safelibs/validator) — the Test stage picks those up and re-runs the affected port until it passes.

### What if there is already a Rust implementation?

Ideally the agents wrap it in a C ABI compatibility layer rather than redoing the work from scratch. The goal is rustification — getting C consumers off C — not reimplementation for its own sake. If a mature Rust implementation already exists, gluing a drop-in C ABI onto it is the cheaper, lower-risk path, and it inherits whatever review the existing crate has already had.

### What's the license on a port?

IANAL, but: almost certainly the original library's license. A port is a derivative work — the C source shapes the Rust translation, and the test suite is lifted (and adapted) directly from upstream. I treat each port as carrying the upstream license until somebody who actually is a lawyer says otherwise.
