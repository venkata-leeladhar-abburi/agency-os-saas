# Start here

Three steps to go from this pack to Claude Code building Agency OS.

## 1. Create the repository and upload the pack

1. On GitHub, create a new **private** repository named `agency-os-app` (no README, no licence; this pack has them).
2. Upload **everything inside this folder** to the root of the repository, keeping the folders as they are: `CLAUDE.md`, `README.md`, `START-HERE.md`, `docs/`, `tokens/`, `design/`.
   - Easiest: on the repository page choose "uploading an existing file", drag the contents of the unzipped folder in, and commit to `main`.
3. Check that `CLAUDE.md` sits at the root (not inside another folder). Claude Code reads it automatically.

## 2. Set up the cloud environment (once)

In Claude Code on the web, start a new session on `agency-os-app`. Then, from the cloud environment menu in the session's title bar, choose **Edit**:

- **Network access:** allow the package managers and the hosts listed in `docs/04-engineering/environments-and-deploy.md` (step 7).
- **Secrets:** add dev and test keys as you create the accounts (names in the same file). Never paste keys into the chat.

You can do this later; Claude tells you exactly what is missing when it gets there.

## 3. Start the build

Paste this as the first message of the new session:

```
Read CLAUDE.md, then docs/00-plan/build-plan.md and docs/00-plan/progress.md.
Start the plan: ask me the open questions you need now (docs/00-plan/open-questions.md)
in one batch, then begin milestone M0 and keep going milestone by milestone.
Stop at each gate and show me what I need to approve. Update progress.md as you go.
```

From then on:

- Claude asks questions in batches with a recommended answer; reply with your choices, or "go with your defaults".
- At each gate (G0 to G4), Claude sends links and screenshots. Reply "Approve G1" (or the gate's name), or list the changes you want.
- To continue in a later session, say: "Continue the plan from progress.md."

## Before G3 you will need

A chartered accountant to review the GST invoice template, a lawyer for the terms, privacy policy and signing, live Razorpay keys, and the product domain. The full list is in `docs/00-plan/open-questions.md`.
