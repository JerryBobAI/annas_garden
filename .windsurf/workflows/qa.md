---
description: Systematically QA test a web application and fix bugs found
---

Use the `skill` tool to invoke the `qa` skill from gstack.

Steps:
1. Ask the user for the URL to test (or use localhost dev server)
2. Run systematic QA testing across the site
3. Categorize bugs by severity (critical/high/medium/low)
4. Iteratively fix bugs in source code
5. Commit each fix atomically and re-verify
6. Produce before/after health scores and ship-readiness summary

Three tiers: Quick (critical/high only), Standard (+ medium), Exhaustive (+ cosmetic).
