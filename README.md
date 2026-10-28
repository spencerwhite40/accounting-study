# Accounting Study

Mobile-first study app for accounting courses. Six practice modes (flashcards,
sort & organize, multiple choice, fill the blank, put in order, Numbers) feed one
spaced-repetition mastery score per concept. Numbers mode models every course
calculation as a graph node, so generated problems can hide an input behind a
prior calculation without saying so; hints name the missing piece, worked
solutions show the chain, and a wrong answer offers a step-by-step breakdown.

Design notes: `docs/design.md`. Content: `src/content/<course>/ch*.ts`.

## Run

```sh
npm install
npm run dev      # open the LAN URL on your phone
npm test
npm run build    # dist/ is a static PWA
```

## Hosting

Every push to `main` builds and deploys to GitHub Pages
(`.github/workflows/pages.yml`). The workflow enables Pages on first run.
The site is served at `https://<owner>.github.io/<repo>/`; progress is stored
on the device and can be copied/imported from the Stats screen.
