---
description: Merge PR, wait for CI and deploy, verify production health
---

Use the `skill` tool to invoke the `land-and-deploy` skill from gstack.

Takes over after /ship creates the PR. Merges, waits for CI and deploy, then verifies production health via canary checks.
