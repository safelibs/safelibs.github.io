# SafeLibs

SafeLibs builds memory-safe (Rust) reimplementations of critical load-bearing C/C++ libraries used throughout open source infrastructure, while attempting to preserve drop-in compatibility at compile-time and runtime.

## Mission

- Reimplement widely-used C/C++ libraries in Rust for memory safety.
- Preserve C ABI and behavioral compatibility so existing consumers can relink without source changes.
- Keep ports practical for production by retaining performance characteristics.

## Priorities

1. Drop-in compile-time and runtime compatibility.
2. Performance.
3. Memory safety.

## Non-goal

Long-term maintainability of each individual translated codebase is not a primary goal.

## Maintainability

The working model is retranslating from upstream as original projects evolve (eventually, maybe nightly!), then re-validating compatibility and performance. In fact, we will NOT accept code PRs to the ported libraries themselves: we don't know the codebase well enough to reason about malicious patches, etc. We'll happily accept issues against the repo with an example of the failing workflow, then sic our agents on them, though!

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

In all seriousness, no one but the AI has ever looked at this code, and that goes for both the actual library reimplementations and the pipeline itself.
Even if the libraries _are_ perfect (and I'm sure they're not!), the best they'll do is protect against some memory safety issues in the original library.
The actual programs using these libraries can still be vulnerable, or other libraries can be vulnerable, or the `unsafe` parts of these libraries can still be vulnerable, or there could be new and exotic non-memory errors in these libraries, or these libraries might set your computer on fire and turn your AI agent against you.
_I_ don't use these things, and you'd be crazy to, but they're there if you want to try them out!

### Are these libraries correct?

These libraries pass adapted test cases from the original projects, and work in a drop-in manner with at least one client application.
Beyond that, who knows!

### But should I use these libraries?

If you still have a sandbox on in your AI agent, you should probably not use these libraries.
If your agent's sandbox is off, you have already made the leap!

### Why does this pipeline use codex and not claude?

Unfortunately, despite Claude's dominance, Codex gives FAR more tokens in their top plan, so that's what we're using here.
If you harness it brutally enough, like it's harnessed here, it sometimes works!

### How are the agents harnessed?

This repo uses a four-stage pipeline:

1. Recon - get library source code and other info (CVEs, etc)
2. Setup - prepare the source for porting, including translating the tests to use public APIs where possible and augmenting them in other ways
3. Port - do the rust port!
4. Test - test with additional client applications

Each successful stage results in a git tag in the respective repo.
Each stage uses a https://github.com/zardus/juvenal workflow (or set of workflows) to achieve and verify the goals despite agentic laziness!

## Project Structure

Each target library lives in its own `port-LIBNAME` repo in the https://github.com/safelibs org.
This website lives in https://github.com/safelibs/safelibs.github.io repo.
The pipeline itself lives in https://github.com/safelibs/pipeline

## Port Status

As of April 21, 2026, the SafeLibs org has 24 library `port-*` repositories under active work, plus the shared `port-template` repository.
They are all private right now, so this public site is intentionally not pretending to have a live public scoreboard yet.
When the verification artifacts are ready to expose, this section should show actual compatibility results instead of vibes.

## Port Effort Stats

These statistics were extracted from `~/codex_sessions.bak` on April 21, 2026.
They count Codex JSONL sessions whose metadata points directly at a current library workspace under `/home/yans/code/safelibs/ported/<library>` or `/home/yans/safelibs/port-<library>`.
For each current `port-*` repository, sessions earlier than that repository's first commit were excluded.
That cuts out the older root-level prototype runs in `/home/yans/code/safelibs`, including the February `libzstd`, `libyaml`, `libpng`, `libsodium`, `libjpeg-turbo`, `libcurl`, `libbz2`, and `giflib` attempts: 315 sessions and 646.9M tokens in total.
Generic root-level orchestration sessions were omitted to avoid attributing shared work to the wrong library, and the archive-only `libssl` run was omitted because there is no current `port-libssl` repository.
Token counts are summed from each session's final `total_token_usage.total_tokens`; cached input tokens are included in those totals.
Agent time is the sum of per-session task wall time, so parallel sessions intentionally count as parallel agent-hours.
Calendar span is the first counted session start to the last counted session start for that library.

Stage token buckets use the current repo's `01-recon`, `02-setup`, `03-port`, and `04-test` tag cutovers.
If a repo has not completed a later stage, sessions after the last completed tag are counted toward the next in-progress stage bucket.
That is why `glib`, `libc6`, and `libcurl` have port-token spend even though their completed stage is still `02-setup`, and why `libgcrypt` has test-token spend while completed at `03-port`.

The current-repo archive covers 6,251 sessions, 19.93B total tokens, and 1,129.5 agent-hours from March 27, 2026 through April 11, 2026 UTC.
Across those sessions, the stage token split is 2.63B recon, 2.90B setup, 8.50B port, and 5.90B test.

The `unsafe` columns count `unsafe { ... }` blocks in each port's current `safe/` tree, split into two buckets.
The first is forced by C ABI/API compatibility: the enclosing function takes raw `*const T`/`*mut T` parameters, is `extern "C"`, or is itself an `unsafe fn` exposed across the FFI boundary, so any work it does on those pointers has to live inside an `unsafe` block.
The second is everything else: blocks whose enclosing function has a fully safe Rust signature, meaning the unsafety was chosen for internal reasons (transmutes, raw allocator handoff, intrinsics, `static mut`, etc.) rather than imposed by the C surface.
Counts are computed by the textual analyzer in `pipeline/ports/.unsafe-non-abi.py`, with comments and string literals stripped before classification.
Across the 24 active ports there are 17,626 `unsafe { }` blocks: 13,450 (76.3%) for C ABI/API compatibility and 4,176 (23.7%) for other reasons.

| Library | Completed stage | Sessions | Total tokens | Recon tokens | Setup tokens | Port tokens | Test tokens | Agent time | Calendar span | Total unsafe | ABI unsafe | Other unsafe | Difficulty notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `cjson` | `04-test` | 121 | 292.5M | 3.8M | 77.1M | 93.7M | 117.8M | 18.1h | 17.1h | 5 | 5 | 0 | Small C API, but setup and test still needed public-API rewrites, ABI packaging checks, and final release hardening. |
| `giflib` | `04-test` | 202 | 281.5M | 2.5M | 56.2M | 121.4M | 101.4M | 22.7h | 22.2h | 522 | 510 | 12 | Decoder scope was modest; command-line tools, installed utility behavior, and downstream harness closure consumed the hard work. |
| `glib` | `02-setup` | 359 | 1,642.0M | 625.8M | 95.5M | 920.8M | - | 87.4h | 89.7h | 38 | 28 | 10 | The run is still pre-port-completion, but GIRepository, symbol versions, Meson/package surfaces, and staged runtime checks already forced repeated verifier cycles. |
| `libarchive` | `04-test` | 294 | 731.3M | 8.3M | 88.9M | 376.8M | 257.2M | 37.3h | 35.0h | 574 | 348 | 226 | Archive-format breadth made the port wide, while CVE metadata, imported-test cleanup, and package verification made closure noisy. |
| `libbz2` | `04-test` | 157 | 237.0M | 2.3M | 31.5M | 139.4M | 63.7M | 18.1h | 16.8h | 83 | 3 | 80 | The compression surface was small; most difficulty was keeping workflow contracts, release artifacts, and compatibility checks consistent. |
| `libc6` | `02-setup` | 152 | 704.9M | 6.0M | 425.6M | 273.2M | - | 45.3h | 59.0h | 9 | 4 | 5 | The libc harness dwarfs the current implementation state: per-test environments, relocated container support, and platform assumptions dominated setup. |
| `libcsv` | `04-test` | 96 | 121.4M | 4.4M | 11.7M | 40.1M | 65.1M | 11.0h | 10.1h | 116 | 81 | 35 | Narrow API and behavior surface kept this smallest run bounded; finish work was mostly upstream parity and packaging sanity. |
| `libcurl` | `02-setup` | 290 | 1,364.3M | 491.7M | 273.3M | 599.3M | - | 77.9h | 89.8h | 443 | 314 | 129 | Protocol breadth, TLS/session behavior, benchmark expectations, and dependent applications made both recon and early port work expensive. |
| `libexif` | `04-test` | 840 | 986.7M | 3.1M | 117.4M | 149.9M | 716.3M | 73.8h | 92.7h | 1,205 | 1,165 | 40 | Metadata corpus handling was manageable, but release-gate validation produced the most checker sessions and a large test-stage tail. |
| `libgcrypt` | `03-port` | 313 | 1,420.7M | 514.1M | 54.6M | 236.5M | 615.5M | 77.1h | 90.6h | 2,976 | 1,147 | 1,829 | Crypto API coverage, security expectations, and no-upstream-bridge auditing made closure risky; test-stage work is in progress after the port tag. |
| `libjansson` | `04-test` | 219 | 330.8M | 2.9M | 38.1M | 231.7M | 58.1M | 28.6h | 69.6h | 805 | 790 | 15 | Moderate JSON API size, but relink checks, object layout, loader success paths, and package behavior made the port stage heavier than setup. |
| `libjpeg-turbo` | `04-test` | 255 | 804.2M | 2.5M | 91.0M | 406.2M | 304.6M | 72.3h | 57.7h | 79 | 1 | 78 | SIMD boundaries, command-line tools, package contracts, and removal of upstream bridge assumptions dominated implementation and test. |
| `libjson` | `04-test` | 143 | 328.7M | 2.6M | 50.1M | 109.0M | 167.0M | 23.3h | 21.9h | 104 | 93 | 11 | Static archive layout, Debian/autopkgtest gaps, and installed artifact checks were harder than the small JSON surface itself. |
| `liblzma` | `04-test` | 120 | 470.7M | 2.7M | 33.5M | 357.6M | 76.9M | 21.2h | 19.1h | 296 | 24 | 272 | Core compression APIs drove the port spend, followed by strict fmt, clippy, test, ABI, and package gates. |
| `libpng` | `04-test` | 170 | 1,212.5M | 4.2M | 36.3M | 304.9M | 867.0M | 58.2h | 69.2h | 722 | 644 | 78 | Dependent matrix work and C-shim boundaries around longjmp, read phases, and packaging pushed most cost into final verification. |
| `libsdl` | `04-test` | 257 | 1,245.4M | 3.5M | 209.6M | 719.0M | 313.4M | 56.5h | 46.0h | 478 | 66 | 412 | Input, device, and runtime behavior required broad compatibility scaffolding; dependent applications made validation more complex than the API count suggests. |
| `libsodium` | `04-test` | 136 | 276.7M | 6.8M | 22.0M | 190.4M | 57.5M | 18.9h | 18.2h | 532 | 497 | 35 | Compact API, but crypto primitive coverage, deterministic fixtures, and security-sensitive compatibility kept the port stage nontrivial. |
| `libtiff` | `04-test` | 204 | 577.5M | 6.4M | 23.6M | 478.2M | 69.3M | 30.9h | 27.3h | 333 | 327 | 6 | TIFF utilities, package surface, EXIF fixture cleanup, and format-edge behavior concentrated the cost in implementation. |
| `libuv` | `04-test` | 532 | 1,489.1M | 918.0M | 84.8M | 292.1M | 194.3M | 80.6h | 101.2h | 3,410 | 3,024 | 386 | Async fs, network, process, event-loop, and unsafe-boundary semantics drove sustained effort; a late recon tag makes discovery look unusually large. |
| `libvips` | `04-test` | 186 | 1,111.9M | 2.7M | 62.1M | 659.4M | 387.7M | 45.1h | 42.5h | 2,833 | 2,604 | 229 | Large image-processing dependency graph, pipeline behavior, and final dependent/package fixups kept both port and test stages high. |
| `libwebp` | `04-test` | 154 | 390.8M | 2.9M | 26.9M | 215.8M | 145.1M | 20.9h | 20.4h | 194 | 133 | 61 | Codec, mux, animation, DT_NEEDED, and link-fixture checks were the central compatibility risks. |
| `libxml` | `04-test` | 463 | 1,757.6M | 6.1M | 749.3M | 884.8M | 117.4M | 85.2h | 75.5h | 1,560 | 1,425 | 135 | Broad parser and ABI surface made setup and port enormous; workflow/template gates added repeated validation churn. |
| `libyaml` | `04-test` | 307 | 376.3M | 1.9M | 34.0M | 187.2M | 153.3M | 34.1h | 37.9h | 126 | 64 | 62 | Parser codegen, artifact-contract consistency, and release checks mattered more than runtime breadth. |
| `libzstd` | `04-test` | 281 | 1,775.7M | 1.7M | 210.7M | 514.4M | 1,048.9M | 85.0h | 128.5h | 183 | 153 | 30 | Largest current run; CLI/library entry points, dependent-package images, and final release validation dominated the test-stage tail. |

## Compatibility Contract

A completed SafeLibs port should provide:

- Binary-compatible exported symbols.
- C headers compatible with existing consumer builds.
- Equivalent runtime semantics for valid inputs.
- Upstream test-suite parity plus consumer integration validation.

### Verification Philosophy

SafeLibs verification is clean-room by design:

- Run baseline tests against the original Ubuntu C library package.
- Purge original runtime/dev packages from the test environment.
- Install SafeLibs-generated `.deb` replacements.
- Re-run the exact same tests and consumer checks.

If a port still forwards to the original C implementation, the replacement stage fails after purge.
