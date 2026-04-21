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
They count Codex JSONL sessions whose metadata points directly at a library workspace under `/home/yans/code/safelibs/ported/<library>` or `/home/yans/safelibs/port-<library>`.
Generic root-level orchestration sessions were omitted to avoid attributing shared work to the wrong library.
Token counts are summed from each session's final `total_token_usage.total_tokens`; cached input tokens are included in those totals.
Agent time is the sum of per-session wall time, so parallel sessions intentionally count as parallel agent-hours.
Calendar span is the first-to-last timestamp range for that library's counted sessions.

The direct library-workspace archive covers 6,343 sessions, 20.09B total tokens, and 1,140.6 agent-hours from March 27, 2026 through April 11, 2026.
It includes 25 archive-backed library directories; `libssl` is archive-only because there is no current `port-libssl` repository.

| Library | Stage | Sessions | Tokens | Agent time | Calendar span | Difficulty signal |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `cjson` | `04-test` | 121 | 292.5M | 18.0h | 17.2h | Small C API; effort concentrated in final hardening and release checks. |
| `giflib` | `04-test` | 202 | 281.5M | 22.6h | 22.2h | Regression closure around tools and downstream harnesses outweighed core decode size. |
| `glib` | `02-setup` | 359 | 1,642.0M | 88.7h | 90.6h | GIRepository exports, symbol versions, and staged runtime checks caused repeated verifier churn. |
| `libarchive` | `04-test` | 294 | 731.3M | 37.1h | 35.1h | Broad archive formats, CVE metadata, and imported-test cleanup made closure wide. |
| `libbz2` | `04-test` | 157 | 237.0M | 18.0h | 16.9h | Small compression surface; most work was workflow consistency and release hardening. |
| `libc6` | `02-setup` | 152 | 704.9M | 45.2h | 59.3h | Huge libc harness; per-test environment and relocated container support were blockers. |
| `libcsv` | `04-test` | 96 | 121.4M | 10.9h | 10.1h | Narrowest port; upstream-behavior checks kept the effort small. |
| `libcurl` | `02-setup` | 290 | 1,364.3M | 79.2h | 90.6h | Protocols, TLS session reuse, benchmarks, and dependent apps drove high effort. |
| `libexif` | `04-test` | 840 | 986.7M | 73.3h | 93.0h | Metadata corpus and release-gate validation produced the most checker sessions. |
| `libgcrypt` | `03-port` | 313 | 1,420.7M | 76.8h | 91.3h | Crypto API coverage plus no-upstream-bridge auditing made closure risky. |
| `libjansson` | `04-test` | 219 | 330.8M | 28.4h | 69.9h | Moderate API; relink/object checks and loader success paths mattered most. |
| `libjpeg-turbo` | `04-test` | 255 | 804.2M | 72.2h | 58.5h | SIMD, command-line tools, package contracts, and bridge removal dominated. |
| `libjson` | `04-test` | 143 | 328.7M | 23.2h | 21.9h | Static archive/layout checks and Debian/autopkgtest gaps drove the finish. |
| `liblzma` | `04-test` | 120 | 470.7M | 21.1h | 19.2h | Compression API plus full fmt, clippy, tests, and ABI gates. |
| `libpng` | `04-test` | 170 | 1,212.5M | 58.1h | 69.2h | Dependent matrix and C-shim boundaries for longjmp/read phases were the hard parts. |
| `libsdl` | `04-test` | 257 | 1,245.4M | 56.4h | 46.2h | Input/device runtime tests and dependent applications made validation complex. |
| `libsodium` | `04-test` | 136 | 276.7M | 18.8h | 18.2h | Crypto primitive coverage with a comparatively compact API surface. |
| `libssl` | `archive-only` | 92 | 159.3M | 12.5h | 11.9h | Archive-only OpenSSL attempt; support-root bootstrap and packaging contracts dominated. |
| `libtiff` | `04-test` | 204 | 577.5M | 30.7h | 27.4h | TIFF utilities, package surface, and EXIF fixture cleanup shaped closure. |
| `libuv` | `04-test` | 532 | 1,489.1M | 80.2h | 101.5h | Async fs, network, process, and unsafe-boundary checks drove sustained effort. |
| `libvips` | `04-test` | 186 | 1,111.9M | 45.0h | 42.5h | Large image-processing dependency graph and final fixups kept effort high. |
| `libwebp` | `04-test` | 154 | 390.8M | 20.8h | 20.5h | Codec, mux, animation, DT_NEEDED, and link-fixture checks were central. |
| `libxml` | `04-test` | 463 | 1,757.6M | 84.9h | 75.5h | Broad parser/ABI surface and workflow/template gates drove one of the largest runs. |
| `libyaml` | `04-test` | 307 | 376.3M | 33.9h | 37.9h | Parser codegen plus artifact-contract consistency, but relatively contained runtime scope. |
| `libzstd` | `04-test` | 281 | 1,775.7M | 84.8h | 128.6h | Largest run; CLI/library/dependent-package image and release entry points dominated. |

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
