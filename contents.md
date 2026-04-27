# SafeLibs

SafeLibs builds memory-safe (Rust) reimplementations of critical load-bearing C/C++ libraries used throughout open source infrastructure, while attempting to preserve drop-in compatibility at compile-time and runtime.

## What is this?

SafeLibs maintains Rust reimplementations of widely-used C/C++ libraries. Each port ships as a `.deb` that's binary-compatible with the original Ubuntu library package — existing C consumers relink against it without source changes.

### Scope

- Rewrite widely-used C/C++ libraries in Rust for memory safety.
- Hold the original C ABI so existing binaries relink unchanged.
- Match the upstream library's performance — not a soft-fork approximation of it.

### Priorities, in order

1. Drop-in compile-time and runtime compatibility.
2. Performance.
3. Memory safety.

### Maintainability

Per-port maintainability isn't a goal. The ports are regenerable artifacts: when upstream changes, we re-run the pipeline against the new source instead of hand-patching the Rust output (eventually nightly, if the economics work out). For the same reason we don't take code PRs against the ported libraries — we don't audit the generated Rust closely enough to reason about adversarial patches. Reproducer issues are a different story; see the FAQ.

### What a port provides

A completed SafeLibs port should provide:

- Binary-compatible exported symbols.
- C headers compatible with existing consumer builds.
- Equivalent runtime semantics for valid inputs.
- Upstream test-suite parity plus consumer integration validation.

### How we verify it

Each port runs through the same swap test:

- Run baseline tests against the original Ubuntu C library package.
- Purge the original runtime/dev packages from the test environment.
- Install SafeLibs-generated `.deb` replacements.
- Re-run the exact same tests and consumer checks.

## FAQ

### Why Rust instead of some other memory-safe language?

```
 ▐▛███▜▌   Claude Code
▝▜█████▛▘  Optimus 9000.1 · Claude ALL_YOUR_MONEY_PLAN
  ▘▘ ▝▝    /home/YOU
                                                                                
────────────────────────────────────────────────────────────────────────────────
❯ Change this repository from Rust to YOUR_LANGUAGE_HERE
────────────────────────────────────────────────────────────────────────────────
```

### How many tokens does this take?

Any answer to this question will be meaningless, because it will be obsolete in a few weeks and I don't want to update this README that often.

### Do you guarantee I won't get hacked?

rofl

In all seriousness: no. No human has ever read this code — not the library reimplementations, not the pipeline. Even if a port _were_ perfect (and none are), the best it could do is fix memory-safety bugs in that one upstream library. The application using it can still be vulnerable, other libraries it links against can still be vulnerable, or the `unsafe` parts of these libraries can still be vulnerable, or the translation can introduce entirely new non-memory bugs, or these libraries might set your computer on fire and turn your AI agent against you. _I_ don't use these things, and you'd be crazy to — but they're here if you want to try them out.

### Are these libraries correct?

These libraries pass adapted test cases from the original projects, and work in a drop-in manner with at least one client application.
Beyond that, who knows!

### But should I use these libraries?

Rule of thumb: if you still have a sandbox on in your AI agent, you should probably not use these libraries.
If your agent's sandbox is off, you have already made the leap!

### Why does this pipeline use codex and not claude?

Unfortunately, despite Claude's dominance, Codex gives FAR more tokens in their top plan, so that's what we're using here.
If you harness it brutally enough, like it's harnessed here, it sometimes works!

### How are the agents harnessed?

This repo uses a four-stage pipeline driven by Juvenal (https://github.com/zardus/juvenal), a workflow manager named after the Roman poet — riffing on "who watches the watchmen?" Each stage uses one or more Juvenal workflows to achieve and verify its goals despite agentic laziness, and each successful stage produces a git tag in the respective repo.

Juvenal leans on a behavioral quirk of coding agents: they will happily cut corners on their own work, but have no incentive to cover for _another_ agent's shortcuts. After every implementation step, several fresh-context validation agents check the result against different criteria; anything missing bounces back to the implementer, dozens of times if necessary. The Port stage in particular doesn't share a workflow across libraries — a planning agent drafts and iteratively refines a library-specific workflow before any porting starts, because no single template fits every C library.

1. Recon - pull the original source (via Ubuntu's source packages) and existing CVEs, so the port has historical context for known non-memory issues.
2. Setup - prepare the source for porting, rewriting tests to use public library APIs (so they survive a clean reimplementation) and adding new ones, both directly against the library and through dependent applications.
3. Port - do the rust port. A planning agent first builds a library-specific workflow, then implementation and validation agents execute and check it step by step.
4. Test - exercise the port against additional client applications and the validator suite.

The full pipeline definitions live in the [pipeline repo](https://github.com/safelibs/pipeline).

### What about upgrading to new library versions?

Each port is a regenerable artifact — the workflow can be rerun from scratch against a new upstream release. There's also a dedicated upgrade stage in the pipeline that's intended to be cheaper than full retranslation, though it hasn't been battle-tested yet.

### Will these work outside of Ubuntu?

The current focus is Ubuntu drop-in replacements via apt, which forces strict ABI compatibility and shapes a sizable chunk of the unsafe-block count. Distributions with stricter, content-addressed semantics (like Nix) would be a better fit for agent-generated replacements; if you're interested in extending coverage there, get in touch.

### How do I report a port bug?

We can't accept code patches against the ported libraries — we don't audit the generated Rust closely enough to reason about adversarial PRs. We _do_ accept reproducer testcases against the [validator repo](https://github.com/safelibs/validator) — the Test stage picks those up and re-runs the affected port until it passes.

## Ports

Across the {{validating_count}} validating ports so far: **{{total_sessions}} sessions, {{total_tokens_b}}B tokens, {{total_agent_hours}} agent-hours**, split {{recon_tokens_b}}B recon, {{setup_tokens_b}}B setup, {{port_tokens_b}}B port, {{test_tokens_b}}B test.

| Library | Completed stage | Sessions | Total tokens | Recon tokens | Setup tokens | Port tokens | Test tokens | Agent time | Calendar span | Total unsafe | ABI unsafe | Other unsafe |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `cjson` | `04-test` | 121 | 292.5M | 3.8M | 77.1M | 93.7M | 117.8M | 18.1h | 17.1h | 5 | 5 | 0 |
| `giflib` | `04-test` | 202 | 281.5M | 2.5M | 56.2M | 121.4M | 101.4M | 22.7h | 22.2h | 522 | 510 | 12 |
| `glib` | `02-setup` | 359 | 1,642.0M | 625.8M | 95.5M | 920.8M | - | 87.4h | 89.7h | 38 | 28 | 10 |
| `libarchive` | `04-test` | 294 | 731.3M | 8.3M | 88.9M | 376.8M | 257.2M | 37.3h | 35.0h | 574 | 348 | 226 |
| `libbz2` | `04-test` | 157 | 237.0M | 2.3M | 31.5M | 139.4M | 63.7M | 18.1h | 16.8h | 83 | 3 | 80 |
| `libc6` | `02-setup` | 152 | 704.9M | 6.0M | 425.6M | 273.2M | - | 45.3h | 59.0h | 9 | 4 | 5 |
| `libcsv` | `04-test` | 96 | 121.4M | 4.4M | 11.7M | 40.1M | 65.1M | 11.0h | 10.1h | 116 | 81 | 35 |
| `libcurl` | `02-setup` | 290 | 1,364.3M | 491.7M | 273.3M | 599.3M | - | 77.9h | 89.8h | 443 | 314 | 129 |
| `libexif` | `04-test` | 840 | 986.7M | 3.1M | 117.4M | 149.9M | 716.3M | 73.8h | 92.7h | 1,205 | 1,165 | 40 |
| `libgcrypt` | `03-port` | 313 | 1,420.7M | 514.1M | 54.6M | 236.5M | 615.5M | 77.1h | 90.6h | 2,976 | 1,147 | 1,829 |
| `libjansson` | `04-test` | 219 | 330.8M | 2.9M | 38.1M | 231.7M | 58.1M | 28.6h | 69.6h | 805 | 790 | 15 |
| `libjpeg-turbo` | `04-test` | 255 | 804.2M | 2.5M | 91.0M | 406.2M | 304.6M | 72.3h | 57.7h | 79 | 1 | 78 |
| `libjson` | `04-test` | 143 | 328.7M | 2.6M | 50.1M | 109.0M | 167.0M | 23.3h | 21.9h | 104 | 93 | 11 |
| `liblzma` | `04-test` | 120 | 470.7M | 2.7M | 33.5M | 357.6M | 76.9M | 21.2h | 19.1h | 296 | 24 | 272 |
| `libpng` | `04-test` | 170 | 1,212.5M | 4.2M | 36.3M | 304.9M | 867.0M | 58.2h | 69.2h | 722 | 644 | 78 |
| `libsdl` | `04-test` | 257 | 1,245.4M | 3.5M | 209.6M | 719.0M | 313.4M | 56.5h | 46.0h | 478 | 66 | 412 |
| `libsodium` | `04-test` | 136 | 276.7M | 6.8M | 22.0M | 190.4M | 57.5M | 18.9h | 18.2h | 532 | 497 | 35 |
| `libtiff` | `04-test` | 204 | 577.5M | 6.4M | 23.6M | 478.2M | 69.3M | 30.9h | 27.3h | 333 | 327 | 6 |
| `libuv` | `04-test` | 532 | 1,489.1M | 918.0M | 84.8M | 292.1M | 194.3M | 80.6h | 101.2h | 3,410 | 3,024 | 386 |
| `libvips` | `04-test` | 186 | 1,111.9M | 2.7M | 62.1M | 659.4M | 387.7M | 45.1h | 42.5h | 2,833 | 2,604 | 229 |
| `libwebp` | `04-test` | 154 | 390.8M | 2.9M | 26.9M | 215.8M | 145.1M | 20.9h | 20.4h | 194 | 133 | 61 |
| `libxml` | `04-test` | 463 | 1,757.6M | 6.1M | 749.3M | 884.8M | 117.4M | 85.2h | 75.5h | 1,560 | 1,425 | 135 |
| `libyaml` | `04-test` | 307 | 376.3M | 1.9M | 34.0M | 187.2M | 153.3M | 34.1h | 37.9h | 126 | 64 | 62 |
| `libzstd` | `04-test` | 281 | 1,775.7M | 1.7M | 210.7M | 514.4M | 1,048.9M | 85.0h | 128.5h | 183 | 153 | 30 |

**{{total_unsafe}}** `unsafe { ... }` blocks across the validating ports — {{abi_unsafe}} ({{abi_unsafe_pct}}%) forced by the C ABI, {{other_unsafe}} ({{other_unsafe_pct}}%) other.

### Notes

Stage columns track each repo's `01-recon`/`02-setup`/`03-port`/`04-test` tags. Sessions past the last completed tag count toward the next in-progress stage, so ports in earlier stages show partial column coverage. Agent time sums per-session wall clock, so parallel sessions stack as parallel agent-hours.

**ABI unsafe** is forced by the C surface — functions taking `*const T`/`*mut T`, `extern "C"` functions, or `unsafe fn` exposed across the FFI boundary. **Other unsafe** is everything else: transmutes, raw allocator handoff, intrinsics, `static mut`. The ABI share is the cost of drop-in compatibility; a Rust-only consumer story, or a non-ABI-stable distro target like Nix, would let a future pipeline drop a large fraction of those blocks.

## Other Efforts

- DARPA's [TRACTOR program](https://www.darpa.mil/research/programs/translating-all-c-to-rust) (Translating All C To Rust) is the broader DoD-funded push behind agentic C-to-Rust translation, and a conceptual ancestor of work like this.
- The "ralph loop" pattern at https://github.com/snarktank/ralph is a popular minimal harness for keeping agents on-task across long jobs; SafeLibs uses a structured planning + validation pipeline instead, but starts from the same observation that agents quit early on big tasks.

