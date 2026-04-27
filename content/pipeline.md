Each port runs through a four-stage pipeline driven by Juvenal (https://github.com/zardus/juvenal), a workflow manager named after the Roman poet — riffing on "who watches the watchmen?" Each stage uses one or more Juvenal workflows to achieve and verify its goals despite agentic laziness, and each successful stage produces a git tag in the respective repo.

Juvenal leans on a behavioral quirk of coding agents: they will happily cut corners on their own work, but have no incentive to cover for _another_ agent's shortcuts. After every implementation step, several fresh-context validation agents check the result against different criteria; anything missing bounces back to the implementer, dozens of times if necessary. The Port stage in particular doesn't share a workflow across libraries — a planning agent drafts and iteratively refines a library-specific workflow before any porting starts, because no single template fits every C library.

1. Recon - pull the original source (via Ubuntu's source packages) and existing CVEs, so the port has historical context for known non-memory issues.
2. Setup - prepare the source for porting, rewriting tests to use public library APIs (so they survive a clean reimplementation) and adding new ones, both directly against the library and through dependent applications.
3. Port - do the rust port. A planning agent first builds a library-specific workflow, then implementation and validation agents execute and check it step by step.
4. Test - exercise the port against additional client applications and the validator suite.

The full pipeline definitions live in the [pipeline repo](https://github.com/safelibs/pipeline).
