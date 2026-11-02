# Friendly Money Check Copy Implementation Plan

> **For agentic workers:** Use the executing-plans workflow to implement this plan.

**Goal:** Make the Home entry and quiz hub describe the three short money quizzes in friendly, consistent Korean.

**Architecture:** Update existing server-rendered copy in the Home and check templates. Point the Home quiz entry at the existing check hub. Move the Home shortcut into the header and use the freed bottom-tab position for a direct Tarot destination.

**Tech Stack:** Flask/Jinja templates, existing HTML and CSS.

**Spec:** `docs/superpowers/specs/2026-11-03-friendly-money-check-design.md`

## Global Constraints

- Use conversational Korean and the `… 알아보기` title pattern.
- Preserve all three existing quiz destinations and behavior.
- Home stays directly reachable from the upper-right house button.
- Bottom tabs are `오늘`, `타로`, `체크`, and `기록`.

## Review Focus

- Home entry goes to the quiz hub rather than directly to one quiz.
- Today remains the daily-content overview; Tarot is a direct card-draw shortcut.
- Long quiz titles remain readable in the existing card layout.
- Copy describes quizzes as entertainment and reflection, not financial advice.

---

### Task 1: Home entry and quiz hub copy

**Files:**
- Modify `templates/home.html`
- Modify `templates/check.html`

- [ ] Update the Home quiz tile title, helper text, and destination to the check hub.
- [ ] Update the hub title, intro, category labels/titles, and helper copy with the approved wording while preserving the three URLs.
- [ ] Review the rendered Home and check pages for copy, link destinations, and wrapping at the existing viewport.
