# Privacy Policy — Capsule Hub

_Last updated: 2026-07-03_

Capsule Hub is designed to be **privacy-first**. This policy explains exactly what the extension does and does not do with your data.

## Summary

- **There is no Capsule Hub server.** We do not operate any backend, and your data is never sent to us.
- Your **capsules** and **API key** are stored **only in your browser**, using Chrome's `chrome.storage.local`.
- Conversation text is sent **only** to the AI provider **you** configure (OpenAI or Anthropic), and **only** when you explicitly click to capture a conversation.

## What data the extension handles

| Data | Where it lives | When it leaves your device |
| --- | --- | --- |
| Your API key (OpenAI/Anthropic) | `chrome.storage.local` on your machine | Sent only to that provider's API, as the request credential |
| Conversation text you capture | Read from the active tab in-memory | Sent to your chosen AI provider to generate a capsule |
| Generated capsules | `chrome.storage.local` on your machine | Never (unless you use the manual Export feature) |
| Settings | `chrome.storage.local` on your machine | Never |

## What we do **not** do

- We do **not** collect, transmit, or store any of your data on any server we control.
- We do **not** use analytics, tracking, telemetry, or advertising.
- We do **not** sell or share your data with anyone.
- We do **not** read your conversations in the background — scraping happens only when you click **Capsule this conversation**.

## Third-party AI providers

When you capture a conversation, its text is sent to the provider you selected in Settings:

- **OpenAI** — see <https://openai.com/policies/privacy-policy>
- **Anthropic** — see <https://www.anthropic.com/legal/privacy>

Your use of those APIs is governed by their respective terms and privacy policies. You use your own API key and are responsible for the associated usage costs.

## Permissions the extension requests

- `activeTab` / `scripting` — to read the conversation on, and inject text into, the tab you're actively using.
- `storage` — to save capsules, settings, and your API key locally.
- Host access to `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com` — to run the capture/inject content scripts on those sites.
- Host access to `api.openai.com`, `api.anthropic.com` — so the extension can call the distillation API you chose.

## Data deletion

You control all your data. Delete individual capsules from the popup, or remove everything by uninstalling the extension (this clears `chrome.storage.local`).

## Contact

For questions about this policy, open an issue on the project's GitHub repository.
