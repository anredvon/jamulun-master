# Commercial content UX implementation plan

## 1. Content and interaction regression tests

- Add Python smoke assertions for Home/Today navigation copy, score framing, check disclaimers, share card contents, and History storage explanation.
- Add Node tests for the palm reading text catalog and fallback messages, keeping line-type coverage complete.
- Run the new tests first and confirm they fail for the current unsupported or abstract copy.

## 2. Make user-facing copy concrete and truthful

- Update Home and Today hierarchy while retaining all routes and the four-tab navigation.
- Rewrite check result copy with grounded, non-predictive language and a practical suggestion; mark the score as answer-based reflection.
- Remove fabricated share deltas and percentile claims from private and public share surfaces.
- Rewrite palm line readings and summary language in short, conversational Korean; add explicit uncertainty and on-device/photo entertainment notes.
- Clarify History's local versus server-backed records.

## 3. Verify and release

- Run Python unittest and Node test suites, inspect the rendered route smoke tests, and review the final diff.
- Open a PR against `main`; wait for CI and merge.
- Check Lightsail's active SHA and release procedure, deploy the merged SHA using the existing deployment script, and verify health and updated pages in production.
- Do not create new production draws or check records during final verification.
