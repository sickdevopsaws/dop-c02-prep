# DOP-C02 Prep

A daily practice app for the **AWS Certified DevOps Engineer – Professional (DOP-C02)** exam.
Static site, no build step, no backend — runs on GitHub Pages.

## Modes

- **Today** — a daily session (default 30 questions): reviews that are due plus new questions,
  balanced by exam domain weight. Wrong or guessed answers come back at the end of the session
  and again the next day (Leitner spaced repetition: 1 → 3 → 7 → 16 → 35 days).
- **Practice** — drill one domain (weakest questions first) or a mixed set.
- **Exam** — 75 questions, 180 minutes, weighted like the real exam, no feedback until you
  submit, with a question navigator, flags and a per-domain breakdown.
- **Review** — search the whole bank, your mistakes, flagged questions and your own notes.

Every option has an explanation of why it is right or wrong, plus a one-line takeaway and the
trap the question is testing.

Keyboard: `A–F` choose · `Enter` submit/next · `G` "I guessed" · `F` flag · `N` note · `?` help.

Progress lives in `localStorage` in your browser. Use **Settings → Export** to back it up or move
it to another device.

## Adding questions

Questions live in `data/*.json`. After editing, run:

```bash
node tools/build.js   # validates every question and regenerates questions.js
```

Schema:

```json
{
  "id": "sdlc-019",
  "domain": "sdlc | iac | resilience | monitoring | incident | security",
  "topic": "CodeDeploy",
  "difficulty": "medium | hard",
  "scenario": "A company ...",
  "question": "Which solution meets these requirements with the LEAST operational overhead?",
  "qualifier": "LEAST operational overhead",
  "select": 1,
  "options": [{ "text": "...", "correct": true, "why": "..." }],
  "takeaway": "One sentence to remember.",
  "trap": "Short name of the trap",
  "services": ["CodeDeploy"]
}
```

## Run locally

Open `index.html` directly, or `python3 -m http.server` and visit http://localhost:8000.

---

The questions are original, written for study. They are not real exam questions, and this project
is not affiliated with or endorsed by AWS.
