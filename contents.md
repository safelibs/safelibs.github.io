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

TODO: get the status of the repos

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
