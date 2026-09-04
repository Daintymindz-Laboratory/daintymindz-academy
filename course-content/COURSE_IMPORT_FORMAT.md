# Course bundle format

A course bundle is one JSON file that the Academy admin turns into a whole
course: every lesson, quiz question, and test case, in one pass. It exists so a
course can be drafted outside the admin UI, by hand or with an AI agent, instead
of being typed field by field into the Lesson Builder.

## Using it

1. Open **Admin > Courses > Import course**. Press **Copy format guide** for the
   spec, and **Download template (.json)** for a working six-lesson bundle.
2. Give both to whoever (or whatever) is writing the course.
3. Drop the JSON it produces back into the same dialog. The dialog validates the
   file, previews every lesson, and only then writes anything.
4. Review the imported lessons in the Lesson Builder before publishing. Imports
   land as drafts unless you choose otherwise.

**Export** on any course row downloads that course as a bundle, which is the
easiest way to get a real template to hand an agent, or to move a course between
environments.

## Where the spec lives

The authoritative spec is `COURSE_IMPORT_GUIDE` in
[lib/courseImport.ts](../lib/courseImport.ts). It is what the Copy button puts on
your clipboard, so it can never drift from the parser next to it. Read it there
rather than restating it here.

[example-course.json](example-course.json) is the same file the **Download
template** button produces: a six-lesson course using every lesson type, from a
markdown article to an auto-graded mini project. It is generated from
`TEMPLATE_BUNDLE` in the same lib file, so edit it there, not here.

## Notes that bite

- The test case `description` is not a label, it is what drives the test. The
  guide explains the three forms it can take.
- Mini projects are graded in the browser and only for Python, JavaScript, and
  TypeScript. Anything else must be a project or assessment with
  `requires_review: true`.
- Instructors, the course owner, and the published state are chosen in the
  import dialog, not in the file, so a bundle stays portable between accounts.
- An import that fails part way removes what it created. You never end up with
  half a course.
