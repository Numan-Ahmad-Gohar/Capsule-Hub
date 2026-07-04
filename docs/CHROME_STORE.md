# Chrome Web Store — Publishing Checklist

Phase 6 requires manual steps in your Chrome Web Store developer account. This file collects everything you need so submission is copy-paste fast.

## 1. Build the package

```bash
npm run build
cd dist && zip -r ../capsule-hub.zip . && cd ..
```

Upload `capsule-hub.zip` in the Developer Dashboard.

> One-time: a Chrome Web Store developer account costs a $5 registration fee.

## 2. Listing copy

**Name:** Capsule Hub

**Short description (≤132 chars):**
> Capture any ChatGPT, Claude, or Gemini conversation as a reusable context "capsule" and re-inject it into any other AI tool.

**Category:** Productivity

**Detailed description:**
> Stop re-explaining your project every time you switch AI assistants.
>
> Capsule Hub captures the context of a ChatGPT, Claude, or Gemini conversation and distills it — using your own OpenAI or Anthropic API key — into a structured "capsule": your goal, constraints, key decisions, code snippets, and open questions. Capsules are saved locally, tagged, and fuzzy-searchable.
>
> When you switch tools, pick a capsule and inject a clean, formatted context preamble as your first message. Review it, then send. You never re-explain your project again.
>
> • One-click capture on ChatGPT, Claude, and Gemini
> • AI-distilled, structured capsules (not raw transcript dumps)
> • Local-first & privacy-first — your data and API key stay in your browser
> • Bring your own key: OpenAI or Anthropic
> • Fuzzy search across your capsule library
> • Cross-platform reuse with one-click injection (never auto-sends)

## 3. Required assets

| Asset | Spec | Status |
| --- | --- | --- |
| Icon | 128×128 PNG | ✅ `public/icons/icon-128.png` |
| Screenshots | 1280×800 or 640×400, 1–5 images | ⬜ capture from the running popup |
| Small promo tile | 440×280 PNG | ⬜ optional |
| Privacy policy URL | public link | ⬜ host `PRIVACY.md` (e.g. GitHub) |

## 4. Privacy & data disclosures

In the "Privacy practices" tab, declare:

- **Single purpose:** Capture and reuse AI-conversation context across platforms.
- **Permission justifications:**
  - `activeTab` + `scripting`: read the current conversation and insert text into the composer.
  - `storage`: save capsules, settings, and the user's API key locally.
  - host permissions: run on the 3 AI sites and call the OpenAI/Anthropic APIs.
- **Data usage:** No data is collected or sent to the developer. Conversation text goes only to the user's chosen AI provider. (Link the hosted privacy policy.)

## 5. Pre-submission smoke test

Test on a **fresh Chrome profile** (no other extensions):

- [ ] Load unpacked `dist/`, confirm icon + popup render.
- [ ] Onboarding shows on first run.
- [ ] Add an API key, click **Test key** → success.
- [ ] Capture a conversation on ChatGPT and on Claude.
- [ ] Search finds the capsule; preview shows all fields.
- [ ] Inject into a different platform; text lands in the composer (not auto-sent).
- [ ] Delete a capsule; it disappears and persists after reopening.
- [ ] Graceful errors: no key set, non-AI tab, bad key.
