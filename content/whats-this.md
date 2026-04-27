SafeLibs maintains Rust reimplementations of widely-used C/C++ libraries. Each port ships as a `.deb` that's binary-compatible with the original Ubuntu library package — already-built consumer binaries pick up the replacement at runtime, no relink (let alone recompile) required.

### Scope

- Rewrite widely-used C/C++ libraries in Rust for memory safety.
- Hold the original C ABI so already-built binaries pick up the replacement at runtime, no relink required.
- Match the upstream library's performance — not a soft-fork approximation of it.

### Priorities, in order

1. Drop-in compile-time and runtime compatibility.
2. Performance.
3. Memory safety.

### Maintainability

Per-port maintainability isn't a goal. The ports are regenerable artifacts: when upstream changes, we re-run the pipeline against the new source instead of hand-patching the Rust output (eventually nightly, if the economics work out). For the same reason we don't take code PRs against the ported libraries — we don't audit the generated Rust closely enough to reason about adversarial patches. Reproducer issues are a different story; [see the FAQ](#faq).

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
