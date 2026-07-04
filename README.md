# 🧠 Capsule Hub

> **Capture once. Continue anywhere.**

A privacy-first Chrome Extension that lets you save the context of AI conversations and seamlessly continue them across **ChatGPT**, **Claude**, and **Gemini**.

Instead of rebuilding prompts or re-explaining your project every time you switch AI assistants, Capsule Hub preserves everything important in a reusable **Capsule**.

---

## 💡 Why Capsule Hub?

If you've ever worked on a long project with AI assistants, you've probably experienced this:

* 💬 You spend hours building context with ChatGPT, Claude, or Gemini.
* ⏳ You hit the free-plan message limit.
* 🔒 You can't continue the conversation until your quota resets, or you're prompted to upgrade to a paid plan.
* 😩 You switch to another AI tool—but now you have to explain your entire project again.

**Capsule Hub solves this problem.**

Before leaving a conversation, create a **Capsule** that captures everything important your goals, decisions, constraints, code, and current progress.

Then, open another AI assistant, inject the Capsule, and continue working immediately without starting from scratch.

> **Your conversation may pause, but your project's context doesn't.**

---

## ✨ Features

* 🧠 **AI-Powered Context Distillation**

  * Transform long AI conversations into structured, reusable Capsules.

* 🔄 **Cross-AI Continuity**

  * Continue your work seamlessly across ChatGPT, Claude, and Gemini.

* 🚀 **One-Click Context Injection**

  * Restore your project's context in another AI assistant with a single click.

* 📚 **Capsule Library**

  * Save and organize conversations locally.

* 🔍 **Lightning-Fast Search**

  * Instantly find Capsules using fuzzy search.

* 🏷️ **Smart Tagging**

  * Organize projects with searchable tags.

* 🔒 **Privacy First**

  * Local storage only.
  * No accounts.
  * No cloud database.
  * Your API keys remain yours.

---

# 🚀 How It Works

```text
1. Open a conversation in ChatGPT, Claude, or Gemini.

          │
          ▼

2. Click "Create Capsule"

          │
          ▼

3. Capsule Hub reads the conversation.

          │
          ▼

4. An AI model distills it into a structured Capsule containing:

   • Goal
   • Requirements
   • Constraints
   • Decisions
   • Code
   • Progress
   • Open Questions

          │
          ▼

5. Capsule is stored locally.

          │
          ▼

6. Open another AI assistant.

          │
          ▼

7. Select a Capsule.

          │
          ▼

8. Inject it as your first message.

Continue exactly where you left off.
```

---

# 📦 What is a Capsule?

A **Capsule** is a compact, AI-friendly summary of an entire conversation.

Instead of hundreds of messages, you get a structured snapshot containing:

* 🎯 Project Goal
* 📋 Requirements
* ⚙️ Constraints
* ✅ Decisions Made
* 💻 Important Code
* 📌 Current Progress
* ❓ Open Questions
* 📝 Additional Context

Think of it as **portable memory for your AI projects.**

---

# 🏗 Architecture

```text
               ┌────────────────────────────┐
               │        React Popup         │
               │────────────────────────────│
               │ Capsule Library            │
               │ Search                     │
               │ Settings                   │
               └────────────▲───────────────┘
                            │
               Chrome Runtime Messaging
                            │
               ┌────────────┴───────────────┐
               │ Background Service Worker  │
               │────────────────────────────│
               │ Distillation Pipeline      │
               │ Storage                    │
               │ LLM Client                 │
               └────────────▲───────────────┘
                            │
               Chrome Runtime Messaging
                            │
               ┌────────────┴───────────────┐
               │      Content Scripts       │
               │────────────────────────────│
               │ Read Conversations         │
               │ Inject Capsules            │
               └────────────────────────────┘
```

---

# 🛠 Tech Stack

| Technology         | Purpose                    |
| ------------------ | -------------------------- |
| Manifest V3        | Chrome Extension           |
| React              | User Interface             |
| Vite               | Build Tool                 |
| Tailwind CSS       | Styling                    |
| Fuse.js            | Fast Fuzzy Search          |
| Chrome Storage API | Local Storage              |
| OpenAI API         | Context Distillation       |
| Anthropic API      | Context Distillation       |
| OpenRouter         | Multi-Provider LLM Support |

---

# 📂 Project Structure

```text
Capsule-Hub/

├── public/
├── src/
│
├── background/
│   ├── distillation
│   └── storage
│
├── content/
│   ├── scraper
│   └── injector
│
├── popup/
│   ├── library
│   ├── search
│   └── settings
│
├── lib/
├── components/
├── hooks/
│
├── manifest.json
├── package.json
└── README.md
```

---

# ⚡ Installation

Clone the repository.

```bash
git clone https://github.com/Numan-Ahmad-Gohar/Capsule-Hub.git
```

Install dependencies.

```bash
npm install
```

Build the extension.

```bash
npm run build
```

Open Chrome and navigate to:

```
chrome://extensions
```

Enable **Developer Mode**, click **Load unpacked**, and select the generated `dist/` folder.

---

# ⚙ Configuration

Capsule Hub supports multiple LLM providers.

Simply add your preferred API key inside the extension settings.

Supported providers:

* OpenAI
* Anthropic
* OpenRouter

---

# 🌐 Supported Platforms

| Platform | Status |
| -------- | ------ |
| ChatGPT  | ✅      |
| Claude   | ✅      |
| Gemini   | ✅      |

---

# 🔒 Privacy

Privacy is a core design principle.

* ✅ Local browser storage
* ✅ No cloud database
* ✅ No telemetry
* ✅ No user accounts
* ✅ User-controlled API keys

Your conversations stay under your control.

---

# 💼 Perfect For

* AI Developers
* Software Engineers
* Students
* Researchers
* Product Managers
* Technical Writers
* Anyone working across multiple AI assistants

---
---




</div>
