# Daintymindz Academy — Course Creation Handover

Written 2026-07-16, updated 2026-07-16 (Lesson Reviews admin UI restored —
see "What shipped" and "Known issues" below). This document is
self-contained: a fresh agent/session should be able to pick up course
authoring from here without needing any prior conversation history.

## Context

Daintymindz is a research agency (data analytics, ML, data ops, software
development). `daintymindz-academy` is its internal LMS, used to train
interns and new employees on what they're expected to know before working
on client projects. The immediate task has been authoring **internal
software-development onboarding courses**, built through the `/admin` UI
(Course Manager → Lesson Builder), one lesson at a time, ready to
copy-paste into the form fields.

## Platform schema (read this before authoring anything)

Courses: `title`, `track` (code: `AI`/`DA`/`SE`/`DO` — Artificial
Intelligence / Data Analytics / Software Engineering / Data Operations),
`level` (Beginner/Intermediate/Advanced), `lessons_count`, `duration`,
`description`, `created_by` (admin credited on the issued certificate).

Lessons belong to a course and have `order_index`, `is_published`,
`video_url` (optional, embeds YouTube/Loom at the top of any lesson type),
and a `type`, each with its own fields:

- **`lesson`** — markdown `content` + a side-panel `code`/`code_label`/`language`.
- **`project`** — Monaco editor. `instructions` (markdown), `starter_code`,
  `language`, `code_label`. Optionally has admin-defined test cases
  (auto-graded — see below); without test cases it's just a writing
  exercise with a manual "Mark Complete".
- **`quiz`** — optional markdown intro + multiple-choice/code-output
  questions (`question_text`, `options[]`, `correct_answer`,
  `explanation`). 80% to pass, gates the Next button.
- **`mini_project`** — Monaco editor + `instructions` + `starter_code` +
  admin-defined test cases (`description`, `test_code`, `expected_output`).
  **Only `description` actually drives grading** — it's parsed by one of
  three heuristics (data-literal / function-call / variable-assignment
  splicing); `test_code` is effectively unused by the runtime despite the
  field name. Passing all tests auto-completes the lesson.
- **`assessment`** — markdown-only, good for capstones or read-and-reflect
  content.

New fields shipped in this work (see "What shipped" below):
- `lessons.requires_review` (boolean) — swaps the self-click "Mark
  Complete" for a submission form; completion depends on admin approval.
  **Currently has a gap — see Known Issues.**
- `mini_project` lessons now have a **Language** dropdown
  (python/javascript/typescript) controlling which runner grades them.

## Course progress

### ✅ Course 1: Daintymindz Engineering Onboarding — Git, Workflow & Code Review
Track `SE`, Beginner. **4 lessons, fully drafted, ready to enter.**

Note: an original 5th lesson ("Client Confidentiality & IP Handling") was
cut — it didn't fit a git/workflow/code-review course and was judged to
need real company-specific policy input rather than generic content. It's
a legitimate topic for a separate course later (e.g. "Working with
Clients").

**Lesson 1 — Our Git Workflow & Branching**
- Type: Lesson (article + code) · Order: 1
- Video URL: `https://www.youtube.com/watch?v=mAFoROnOfHs` (freeCodeCamp Git & GitHub Crash Course)
- Content (Markdown):
```markdown
# Our Git Workflow & Branching

Every project at Daintymindz — no matter the client or the stack — moves through the same cycle: **branch → commit → pull request → review → merge**. This lesson covers the mechanics; the next lesson covers what reviewers actually look for.

Watch the video above first if you're new to Git — it covers the core commands (`add`, `commit`, `push`, `pull`, branching, merging) in about an hour. Everything below assumes you're comfortable with that.

## Our branching convention

- `main` is always deployable. Nobody commits to it directly.
- Every change gets its own short-lived branch: `feature/<short-description>` or `fix/<short-description>`.
- Keep branches small — one feature or one fix per branch. Small branches get reviewed faster and are easier to revert if something breaks.

## Commit messages

We use **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, etc.) followed by a concise description. Write commit messages that explain *why*, not just *what* — the diff already shows what changed.

## Opening a pull request

1. Push your branch: `git push -u origin your-branch-name`
2. Open a PR targeting `main` on **GitHub**
3. Fill in what changed and why — link the ticket if there is one
4. Request review from `[ADJUST: who — a specific reviewer, a team, a bot rule?]`

Don't merge your own PR, even if you technically can — that's what the next lesson is about.

## Go deeper

- [Atlassian: Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow)
- [Atlassian: What Is a Pull Request?](https://www.atlassian.com/git/tutorials/making-a-pull-request)
```
- Code Example (right panel):
```
# 1. Sync main and create a feature branch
git checkout main
git pull origin main
git checkout -b feature/short-description

# 2. Work, then stage and commit
git add path/to/file
git commit -m "feat: short description of the change"

# 3. Push and open a PR
git push -u origin feature/short-description
# open a PR targeting `main`
```
  Language: `bash` · File Label: `workflow-example.sh`

**Lesson 2 — Code Review Standards at Daintymindz**
- Type: Lesson (article + code) · Order: 2 · Video URL: (blank — no verified strong video found)
- Content (Markdown):
```markdown
# Code Review Standards at Daintymindz

Code review isn't gatekeeping — Google's own internal research found it's the single most effective way to catch defects before they ship, more effective than testing or static analysis alone. Every PR gets reviewed here, no exceptions, regardless of how senior the author is.

## What reviewers are looking for

- **Correctness** — does it actually do what the PR description claims?
- **Readability** — would someone unfamiliar with this code understand it in six months?
- **Scope** — is the diff focused on one thing, or mixing unrelated changes?
- **Tests** — are the important edge cases covered?
- **Security basics** — no committed secrets, no obvious injection holes, no unvalidated input at trust boundaries.

## How review works on GitHub

1. Open the **Files changed** tab on the PR.
2. Leave inline comments on specific lines — general comments belong on the PR itself.
3. Resolve with **Approve**, **Request changes**, or just **Comment**.
4. `[ADJUST: how many approvals are required before merge? Can the author merge their own PR once approved, or does the reviewer merge?]`
5. `[ADJUST: any required CI checks — tests, lint, build — that must pass before merge?]`

## Giving feedback well

- Comment on the code, not the person who wrote it.
- Separate **blocking** ("this must change before merge") from **nit** ("optional, your call").
- If you're unsure why something was done a certain way, ask a question instead of asserting it's wrong.

## Receiving feedback well

- Assume good intent — a comment is about the code, not a judgment of you.
- If you disagree, explain your reasoning instead of just pushing back or silently complying.
- "Good catch, fixing" is a completely normal response. So is "I don't think so, here's why — happy to talk it through."

## Go deeper

- [Google: How to Do a Code Review](https://google.github.io/eng-practices/review/) — the industry-standard reference. Treat it as required reading for anyone reviewing PRs here.
```
- Code Example (right panel):
```
## What & why
<!-- One or two sentences: what changed and why -->

## How to test
<!-- Steps to verify locally -->

## Screenshots
<!-- If it's a UI change -->
```
  Language: `markdown` · File Label: `pr_template.md`

**Lesson 3 — Git & Workflow Check** (Quiz, 80% pass, Order 3, video blank)
- Quiz Introduction: "A quick check on what you've covered so far — our branching convention, commit style, and how review works on GitHub. You need 80% to pass, and you can retake it as many times as you need."
- Q1: `In our workflow, where should new code changes be committed?` → options: `Directly to main` / `A short-lived feature branch` / `Whichever branch is convenient` / `A personal fork only` → correct: `A short-lived feature branch` → explanation: "main is always deployable — nobody commits to it directly. All work happens on a dedicated branch."
- Q2: `Which commit message follows our Conventional Commits convention?` → options: `fixed stuff` / `feat: add CSV export to reports page` / `WIP` / `Update index.tsx` → correct: `feat: add CSV export to reports page` → explanation: "Conventional Commits use a type prefix (feat:, fix:, chore:, docs:, etc.) followed by a concise description of the change."
- Q3: `According to Google's own internal research, how effective is code review at catching defects compared to testing or static analysis alone?` → options: `Less effective` / `About equally effective` / `More effective` / `It doesn't catch defects` → correct: `More effective` → explanation: "Google found code review to be the single most effective method for finding defects — more effective than testing or static analysis in isolation."
- Q4: `On GitHub, where do you leave a comment tied to a specific line of code?` → options: `The PR description` / `The Files changed tab` / `A commit message` / `The repo's README` → correct: `The Files changed tab` → explanation: "Inline, line-specific feedback belongs in Files changed; general comments go on the PR conversation itself."
- Q5: `You disagree with a reviewer's comment. What's the right move?` → options: `Ignore it and merge anyway` / `Push back with no explanation` / `Explain your reasoning and discuss` / `Ask a teammate to override the reviewer` → correct: `Explain your reasoning and discuss` → explanation: "Assume good intent on both sides — explain your reasoning instead of silently complying or dismissing the feedback."

**Lesson 4 — Practice PR: Ship Your First Change** (Assessment, Order 4, video blank)
- ⚠️ Set **Requires review** on this lesson — see Known Issues before relying on it.
- Content (Markdown):
```markdown
# Practice PR: Ship Your First Change

This is the real thing — no sandbox, no auto-grading. You'll branch, commit, and open a pull request against an actual Daintymindz repo, following exactly the workflow and standards from the last three lessons.

## The exercise

1. Clone `[ADJUST: link to your onboarding-practice repo]`
2. Pick up the task assigned to you by `[ADJUST: your onboarding buddy/manager]`
3. Create a branch following our naming convention
4. Make the change, then commit using Conventional Commits
5. Push and open a PR using the template from **Code Review Standards at Daintymindz**
6. Request review from `[ADJUST: who reviews onboarding PRs]`
7. Respond to feedback and get it merged

## Definition of done

- [ ] Branch created off the latest `main`
- [ ] Commit message(s) follow Conventional Commits
- [ ] PR description filled in — what & why, how to test
- [ ] At least one review requested
- [ ] All review feedback addressed
- [ ] PR merged

## Before you click "Mark Complete"

This lesson isn't auto-graded — completion here runs on trust. **Don't mark it complete until your PR has actually been reviewed and merged.** `[ADJUST: decide if you want a manual sign-off too — e.g. your onboarding buddy confirms in Slack, or an admin spot-checks the Students tab in /admin — since the platform won't verify this one on its own.]`
```

### ✅ Course 2: Software Engineering Fundamentals — Clean Code & Testing
Track `SE`, Beginner/Intermediate. **7 lessons, fully drafted, ready to enter.**
Sequencing rule established here (apply to future courses too): **a quiz
after at most 2 non-quiz lessons**, to test chunks of ideas rather than
waiting until the course ends.

**Lesson 1 — Naming, Functions & Readability** (Lesson, Order 1, video blank — no strong verified video found; leans on the Baeldung article)
```markdown
# Naming, Functions & Readability

Good naming is the cheapest way to make code easier to review, debug, and change later. This lesson covers the small habits that make the biggest difference in everyday readability — before you touch anything more advanced like refactoring or testing.

## Naming variables

A good name answers three questions: why does this exist, what does it do, how is it used. If a name needs a comment next to it to make sense, the name is doing its job poorly.

- Avoid single-letter names, except for short, obvious loop counters.
- Avoid abbreviations that aren't universally understood — `usrCnt` saves four characters and costs a reader several seconds every time they see it.

## Naming functions

- Function names should be verbs — a function *does* something: `calculate_total`, not `total`.
- A boolean function or variable should read like a yes/no question: `is_valid`, `has_permission`.

## Function size and focus

- A function should do one thing, at one level of abstraction.
- If you need the word "and" to describe what a function does, it's probably two functions.

## Go deeper

- [Baeldung: Clean Code — Naming](https://www.baeldung.com/cs/clean-coding-naming)
```
Code Example:
```python
# Before
def calc(x, y, z):
    if z == 1:
        return x + y
    else:
        return x - y

# After
def combine_values(a, b, operation):
    if operation == "add":
        return a + b
    return a - b
```
Language: `python` · File Label: `naming_example.py`

**Lesson 2 — Refactoring & Code Smells** (Lesson, Order 2, video blank — Refactoring.Guru is a catalog site, not a video)
```markdown
# Refactoring & Code Smells

Naming problems are one code smell among many. This lesson covers how to recognize common smells and the small, mechanical moves used to fix them. Refactoring is not a rewrite — it's a series of small, safe steps that don't change behavior.

## What is a code smell

A code smell isn't a bug — the code works. It's a signal that something will be expensive to change later. Catching them early keeps small messes from becoming big ones.

## Common smells to know

- **Duplicated code** — the same logic copy-pasted in more than one place.
- **Long function** — doing too much to hold in your head at once.
- **Large class / god object** — one class doing the job of five.
- **Deeply nested conditionals** — several levels of if/else instead of early returns.

## A few refactoring moves worth knowing by name

- **Extract Function** — pull a chunk of a long function out into its own named function.
- **Rename** — improve a name without changing behavior (see the previous lesson).
- **Replace Nested Conditional with Guard Clauses** — return early on edge cases instead of nesting the "happy path" inside multiple `if` blocks.

## The golden rule of refactoring

Refactor and add features in separate commits, ideally separate PRs. Mixing "I renamed this" with "I also added a new feature" makes both harder to review — ties directly back to the PR-scope point in Code Review Standards.

## Go deeper

- [Refactoring.Guru: Catalog of Refactorings](https://refactoring.guru/refactoring/catalog)
- [Refactoring.Guru: Code Smells](https://refactoring.guru/refactoring/smells)
```
Code Example:
```python
# Before: deeply nested
def get_discount(user):
    if user is not None:
        if user.is_active:
            if user.orders_count > 10:
                return 0.2
            else:
                return 0.1
        else:
            return 0
    else:
        return 0

# After: guard clauses, early returns
def get_discount(user):
    if user is None or not user.is_active:
        return 0
    if user.orders_count > 10:
        return 0.2
    return 0.1
```
Language: `python` · File Label: `refactor_example.py`

**Lesson 3 — Naming & Refactoring Check** (Quiz, Order 3, video blank)
Intro: "A quick check on naming and refactoring before you apply both in the next lesson's hands-on project. 80% to pass — retake anytime."
- Q1: `Which function name best follows our naming convention?` → `data`/`process_payment`/`handle`/`temp` → correct `process_payment` → "Function names should be verbs describing the action they perform."
- Q2: `What's a good name for a boolean flag that tracks whether a user's account is active?` → `active`/`is_active`/`activeFlag`/`status` → correct `is_active` → "Boolean names should read like a yes/no question."
- Q3: `A "code smell" means...` → `The code has a bug`/`The code won't compile`/`The code works but will be expensive to change later`/`The code is missing tests` → correct: 3rd → "A smell isn't a bug — it's a signal about future cost."
- Q4: `Replacing deeply nested if/else with early returns is an example of which refactoring move?` → `Extract Function`/`Rename`/`Replace Nested Conditional with Guard Clauses`/`Extract Class` → correct: 3rd → "This move flattens nested conditionals by returning early on edge cases."
- Q5: `What's the golden rule about mixing refactoring with new features?` → `Always do both in the same PR to save time`/`Refactor and add features in separate commits/PRs`/`Never refactor, only add features`/`Refactoring should be done by a separate team` → correct: 2nd → "Mixing pure refactors with behavior changes makes both much harder to review."

**Lesson 4 — Refactor a Messy Module** (Project, Order 4, video blank, Language: Python)
Instructions (Markdown):
```markdown
# Refactor a Messy Module

The function below works, but it's exactly what the last two lessons warned about: bad names, deep nesting, and two unrelated jobs — computing an average, then mapping it to a letter grade — crammed into one function.

## Your task

Refactor `average_grade` without changing what it returns for any input:

1. Extract the average calculation into its own well-named helper function.
2. Extract the score-to-letter mapping into its own well-named helper function, using guard clauses instead of nested if/else.
3. Rename variables so each name explains what it holds.
4. **Keep the function signature `average_grade(s1, s2, s3)` unchanged** — the tests call it directly, so if you rename or restructure the entry point, they'll fail.

This is graded automatically: if your refactor changes behavior, a test will fail. If it doesn't run at all, everything fails — check your indentation before submitting.
```
Starter Code:
```python
def average_grade(s1, s2, s3):
    t = s1 + s2 + s3
    a = t / 3
    if a >= 90:
        r = "A"
    else:
        if a >= 80:
            r = "B"
        else:
            if a >= 70:
                r = "C"
            else:
                if a >= 60:
                    r = "D"
                else:
                    r = "F"
    return r
```
Test Cases (description / test_code / expected_output):
1. `average_grade(95, 92, 98) should return 'A'` / `print(average_grade(95, 92, 98))` / `A`
2. `average_grade(85, 82, 79) should return 'B'` / `print(average_grade(85, 82, 79))` / `B`
3. `average_grade(75, 70, 71) should return 'C'` / `print(average_grade(75, 70, 71))` / `C`
4. `average_grade(65, 60, 55) should return 'D'` / `print(average_grade(65, 60, 55))` / `D`
5. `average_grade(40, 30, 20) should return 'F'` / `print(average_grade(40, 30, 20))` / `F`

**Lesson 5 — Testing Fundamentals** (Lesson, Order 5, video blank)
```markdown
# Testing Fundamentals

Tests are a safety net that lets you refactor and add features without breaking existing behavior. That's exactly why the refactor exercise you just finished could be graded automatically — the tests defined what "correct" meant, independent of how you wrote the code.

## Anatomy of a good test

- **Arrange** — set up the inputs and state.
- **Act** — call the function.
- **Assert** — check the actual output against the expected one.

## What makes a test good

- **Fast** — runs in milliseconds, no network or disk.
- **Isolated** — doesn't depend on other tests or shared state.
- **Repeatable** — same result every run.
- **Descriptive** — its name or description tells you what broke without reading the test body.

## Test the edges, not just the happy path

Empty input, zero, negative numbers, boundary values (e.g. a score exactly at a grade cutoff), unexpected types. A function only ever tested with "normal" inputs will surprise you in production.

## Tests as a specification

Sometimes tests come *before* the code: you're given expected inputs and outputs, and your job is to write code that satisfies them. That's exactly how the next exercise works — reading a case like `average_grade(65, 60, 55) → "D"` should tell you exactly what's expected, with nothing else needed.

## Go deeper

- [Microsoft Learn: Best Practices for Writing Unit Tests](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [IBM: Unit Testing Best Practices](https://www.ibm.com/think/insights/unit-testing-best-practices)
```
Code Example:
```python
def is_valid_password(password):
    return len(password) >= 8

# Arrange
password = "short"

# Act
result = is_valid_password(password)

# Assert
assert result == False, "Passwords under 8 characters should be invalid"

# Edge case: exactly at the boundary
assert is_valid_password("12345678") == True, "Exactly 8 characters should be valid"
```
Language: `python` · File Label: `testing_example.py`

**Lesson 6 — Refactoring & Testing Check** (Quiz, Order 6, video blank)
Intro: "A check on testing fundamentals and how they connect to the refactor you just did. 80% to pass — retake anytime."
- Q1: `In the Arrange-Act-Assert pattern, what happens in the "Act" step?` → correct: `You call the function being tested`
- Q2: `Which of these is NOT a property of a good test?` → correct: `Depends on the order other tests ran in`
- Q3: `Why should you test boundary values, like a score of exactly 60 in a grading function?` → correct: `Boundaries are where off-by-one bugs usually hide`
- Q4: `What does it mean to treat tests as a specification?` → correct: `Given inputs and expected outputs, you write code to satisfy them`
- Q5: `Why were you able to refactor average_grade's internals without breaking the exercise's grading?` → correct: `The tests checked behavior (output), not implementation details`
(Each has 3 plausible distractors and an explanation — see Course 2 discussion above for full option lists if rebuilding from scratch; the point values are what matter for parity.)

**Lesson 7 — Make the Test Suite Pass** (Mini Project, Order 7, video blank — this is the course's last lesson → "Finish & Earn Certificate")
Instructions (Markdown):
```markdown
# Make the Test Suite Pass

Capstone for this course: implement `password_strength(password)` to satisfy the specification and test suite below — applying everything from this course, clear naming, guard clauses instead of nested conditionals, and code that passes its tests without you needing to guess what "correct" means.

## Specification

Return one of three strings based on the password:

- `"weak"` — if the password is shorter than 8 characters
- `"strong"` — if it's at least 12 characters long **and** contains at least one letter and at least one digit
- `"medium"` — everything else

## Requirements

- Keep the function signature `password_strength(password)` unchanged — the tests call it directly.
- Use guard clauses rather than nested if/else (Lesson 2).
- Give any helper variables clear, honest names (Lesson 1).

This is graded automatically against the test cases below — if your logic differs from the spec on an edge case, a test will catch it.
```
Starter Code:
```python
def password_strength(password):
    # TODO: implement according to the spec above
    pass
```
Test Cases:
1. `password_strength('abc') should return 'weak' (too short)` / `print(password_strength('abc'))` / `weak`
2. `password_strength('abcdefgh') should return 'medium' (8 chars, letters only, not yet 12)` / `print(password_strength('abcdefgh'))` / `medium`
3. `password_strength('abcdefghijkl') should return 'medium' (12 letters, no digit)` / `print(password_strength('abcdefghijkl'))` / `medium`
4. `password_strength('abcdefgh1234') should return 'strong' (12 chars, letters + digits)` / `print(password_strength('abcdefgh1234'))` / `strong`
5. `password_strength('') should return 'weak' (empty string)` / `print(password_strength(''))` / `weak`

### 🚧 Course 3: Full-Stack Development with Next.js & Supabase
Track `SE`, Intermediate. **Only Lesson 1 of 7 is drafted — this is where the next agent should pick up.**

Planned sequence (respecting the "quiz every ≤2 lessons" rule, and the
platform-constraint adjustments below):
1. ✅ Lesson — Next.js App Router Fundamentals (drafted, below)
2. ⬜ Lesson — Data Fetching & Server Actions
3. ⬜ Quiz — Next.js Fundamentals Check
4. ⬜ Lesson — Supabase Auth & Row-Level Security
5. ⬜ Project — Write an RLS Policy (self-checked against a reference answer, **not** auto-graded — Monaco is just a text editor, there's no live Postgres/RLS execution in-browser)
6. ⬜ Quiz — Supabase & Auth Check
7. ⬜ Assessment — Capstone: Ship a Feature End-to-End (real repo, real PR, **requires_review = true** — same known-issue caveat as Course 1 Lesson 4)

**Important platform constraint for this course**: unlike Course 2, nothing
here can be programmatically graded the way Python/JS mini-projects can —
Monaco is a text editor, not a live dev server or database. Lesson 5
("Write an RLS Policy") should be framed as a practice-writing exercise
with a revealed reference answer, not a pass/fail auto-grade. Lesson 7 (the
capstone) has to be a real external task, same pattern as Course 1 Lesson 4.

**Lesson 1 — Next.js App Router Fundamentals** (Lesson, Order 1, video blank — no video felt current/reliable enough; App Router conventions shift across versions)
```markdown
# Next.js App Router Fundamentals

Daintymindz's own tools — including this Academy platform you're using right now — are built on Next.js App Router. This lesson covers the core conventions so you can read, and eventually contribute to, any of our Next.js codebases.

## File-based routing

- Every folder under `app/` containing a `page.tsx` becomes a route: `app/catalog/page.tsx` → `/catalog`.
- Dynamic segments use brackets: `app/lesson/[courseId]/[lessonId]/page.tsx` → `/lesson/12/34`.
- `layout.tsx` wraps every page beneath it in the folder tree — shared nav, shared providers, etc.

## Server vs Client Components

- By default, every component under `app/` is a **Server Component** — it renders on the server and never ships its JS to the browser. It can't use `useState`, `useEffect`, or `onClick`.
- Add `'use client'` at the top of a file to opt into a **Client Component** — only then can you use hooks and browser events.
- Rule of thumb: keep components server-rendered by default. Only mark something `'use client'` when it genuinely needs interactivity.

## See it in our own code

Open this Academy app's source and look at:
- `app/catalog/page.tsx` — starts with `'use client'` because it uses `useState`/`useEffect` for filters and data fetching.
- `app/layout.tsx` — the root layout every page renders inside.
- `middleware.ts` — runs before every request, e.g. for auth redirects.

## Go deeper

- [Next.js App Router docs](https://nextjs.org/docs/app/getting-started)
- [Official interactive tutorial](https://nextjs.org/learn/dashboard-app)
```
Code Example:
```jsx
// app/hello/page.tsx
export default function HelloPage() {
  return <h1>Hello from the App Router</h1>;
}

// Visiting /hello now renders this page inside app/layout.tsx
```
Language: `jsx` (React / JSX) · File Label: `page.tsx`

**Next step for whoever continues this**: draft Lessons 2–7 above, following
the exact field-by-field format used throughout this document (Title,
Type, Order, Video URL, Content/Instructions, Code/Starter Code, Test
Cases where applicable). Suggested resources already identified during
research: [Supabase Docs: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security),
[RLS Step-by-Step Guide by Jon Meyers](https://www.youtube.com/watch?v=Ow_Uzedfohk)
(check it's still current before using — it's from 2021).

## Established conventions (apply going forward)

- **Video policy**: only set `video_url` when a genuinely strong,
  verified-current third-party resource exists (YouTube/Loom). Leave it
  blank rather than force a mediocre pick — several lessons above
  deliberately have no video for this reason.
- **Third-party resources over self-produced content**: link real
  articles/docs/videos (with real, checked URLs) directly in lesson
  markdown rather than assuming everything must be recorded in-house.
  Revisit links periodically — they rot faster than owned content.
- **`[ADJUST: ...]` placeholders**: used throughout for anything that's
  genuinely company-specific and unknown (who reviews PRs, exact tooling)
  rather than inventing fake specifics. Course 1 confirmed: **GitHub** (not
  GitLab) and **Conventional Commits** — those two are resolved and baked
  into the text above; other `[ADJUST]` markers (branch-naming specifics,
  who reviews onboarding PRs, etc.) are still open and are your call.
- **Quiz cadence**: a quiz after at most 2 non-quiz lessons, established
  from Course 2 onward. Course 1 already satisfies this incidentally
  (lesson, lesson, quiz, assessment).
- **Lesson-type-to-task fit**: don't force a task into a type the platform
  can't actually support. Real-world/unauditable tasks (a real PR, a real
  shipped feature) → `assessment` + `requires_review` (see Known Issues).
  Auto-gradable code exercises → `project`/`mini_project` in a language the
  runner actually supports (Python, JavaScript, or TypeScript-as-JS).
  Anything requiring a live dev server/database (a running Next.js app, a
  real Supabase project) → not gradable in-browser at all; use a
  self-check/reveal-answer pattern or a real external task instead.

## What shipped in this work (submission review + JS/TS grading)

Full technical detail is in the merged PR:
https://github.com/Daintymindz-Laboratory/daintymindz-academy/pull/1
(merged as commit `8388ff1`).

- **`lessons.requires_review`** (boolean) + **`lesson_submissions`** table
  (migration `20260703_lesson_submissions.sql`). When true, the lesson
  page shows a `LessonSubmission` component (URL + optional note) instead
  of a bare "Mark Complete" button, and the Next button / certificate
  issuance are gated on an `approved` status. Admins review these under
  the **Lesson Reviews** sidebar tab (branch
  `fix/restore-lesson-review-ui`, not yet merged as of this update — see
  "Known issues" #1 for why a fresh tab/state/function set was needed
  instead of just restoring the original names).
- **`lib/codeRunner.ts`** — shared test-execution runtime extracted from
  the previously-duplicated Pyodide logic in `MiniProjectLesson.tsx` /
  `ProjectLesson.tsx`. Adds a plain JavaScript Web Worker (no WASM needed)
  alongside the existing Python/Pyodide one. `mini_project` lessons now
  have a **Language** dropdown (python/javascript/typescript) in the admin
  form. TypeScript lessons run as plain JS — no real transpilation (a
  deliberate scope call, not a bug).
  - Known limitation: the "variable assignment" test-case style (e.g.
    `x = 5, y = 10`) doesn't match idiomatic JS declarations like
    `const x = 5`. **For JS/TS mini-projects, use the function-call test
    style** (`description: "add(2, 3)"`) — it's unaffected by this.

## Known issues

1. **RESOLVED (pending merge): `lesson_submissions` admin review UI.**
   After PR #1 merged, a separate/independent commit (`077189d feat:
   project submission and instructor grading workflow`) shipped a
   **parallel** submission system (`project_submissions` table, scoped to
   `mini_project`/`project` types only, with its own "Submissions" admin
   tab). That commit reused the `loadSubmissions`/`Submission`/`submissions`
   names and overwrote them to work against `project_submissions` instead
   of `lesson_submissions`, and removed the "Reviews" sidebar entry
   entirely (the JSX block itself was dropped in a later merge, not just
   made unreachable).

   Fixed on branch `fix/restore-lesson-review-ui` (not yet merged — merge
   it, or re-apply the same change, before relying on `requires_review`):
   added a **new, non-colliding** `LessonReview` type, `lessonReviews`
   state, `loadLessonReviews`/`reviewLessonSubmission` functions, and a
   **"Lesson Reviews"** sidebar tab (distinct from "Submissions") that
   queries `lesson_submissions` directly. Fully additive — doesn't touch
   `project_submissions`/`gradeSubmission`/the "Submissions" tab at all.
   `tsc`/`next build` both verified clean on this branch.

2. **Needs consolidation: two parallel submission/review systems.** The
   fix above restores function without merging anything — it leaves real,
   confirmed duplication in place, not just a naming coincidence:

   | | `lesson_submissions` (mine) | `project_submissions` (theirs) |
   | --- | --- | --- |
   | What's submitted | a URL + note | code + notes |
   | Status values | `pending`/`approved`/`rejected` | `pending`/`approved`/`rework` |
   | Admin tab | "Lesson Reviews" | "Submissions" |
   | Load function | `loadLessonReviews` | `loadSubmissions` |
   | Approve/reject function | `reviewLessonSubmission` | `gradeSubmission` |
   | Notifies student on decision | yes (`notify()`) | yes (`notify()`) |

   Both are the same underlying job — student submits something, admin
   reviews, approves/rejects with feedback, student gets notified,
   completion updates — implemented twice, for different lesson-type
   scopes (mine: `lesson`/`assessment`/project-without-tests, needs just a
   link; theirs: `mini_project`/`project`, needs the actual code +
   auto-grader context). That scope difference is real, but it doesn't
   require two separate tables/tabs/functions — a single submissions
   table with an optional `submission_code` vs `submission_url` field
   (or a `kind` discriminator) could serve both, with one admin tab.

   **Action needed:** consolidate these into one system before adding any
   more review-gated lesson types, so a third variant doesn't show up
   later. Whoever does this should decide the unified schema/status
   vocabulary (`rejected` vs `rework` — pick one), migrate existing rows
   from both tables, and remove the now-redundant tab/functions on
   whichever side loses.

   Also worth checking as part of that work, not confirmed either way:
   `gradeSubmission`'s approve path does
   `supabase.from('progress').upsert({ user_id, course_id, lesson_id, completed: true }, { onConflict: 'user_id,course_id' })`,
   but the `progress` table everywhere else (including `markComplete` in
   the lesson page) tracks completion via a `completed_lessons` jsonb
   array, not a per-row `lesson_id`/`completed` boolean. Upsert only
   touches the columns passed, so it shouldn't be actively wiping
   `completed_lessons` — but it's not confirmed those columns exist on
   the live `progress` table at all (vs. silently erroring). Check this
   before assuming project-submission approval correctly marks a lesson
   complete end-to-end.

3. **`AGENTS.md`** in this repo contains prompt-injection-style content
   (false claims about "breaking Next.js changes," pointing agents at a
   non-existent doc path). Still present, unaddressed — worth finding out
   how it got there and removing it.
4. `supabase/migrations/20260710_project_submissions.sql` was added
   separately to capture `077189d`'s previously-uncommitted DDL — run it
   (and `20260703_lesson_submissions.sql`, and
   `20260710_notifications_comments_messages.sql` if not already applied)
   against your Supabase project before relying on any of this.

## Repo / process notes

- Org repo: `Daintymindz-Laboratory/daintymindz-academy` (remote `origin`).
  A personal fork exists (remote `fork`, `tony-eneh/daintymindz-academy`)
  but isn't needed — the account has admin access to the org repo
  directly.
- Migrations are plain `.sql` files under `supabase/migrations/`, run
  manually via Supabase Dashboard → SQL Editor. There's no CLI-linked
  migration runner in this project.
- No `.env.local` is committed (correctly gitignored). Testing live flows
  requires real `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
  pointed at a real project — `middleware.ts` calls Supabase on every
  single request, so nothing renders at all without them.
