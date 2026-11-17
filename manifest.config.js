import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

/**
 * Manifest V3 definition for Capsule Hub.
 *
 * Scoped strictly to the supported AI platforms and distillation backend APIs
 * to comply with Chrome Web Store Least Privilege policies.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Capsule Hub',
  version: pkg.version,
  description:
    'Capture the context of an AI conversation as a reusable "Capsule" and re-inject it into ChatGPT, Claude, or Gemini.',
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'index.html',
    default_title: 'Capsule Hub',
    default_icon: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.js',
    type: 'module',
  },
  // Only essential storage permissions needed
  permissions: ['storage', 'unlimitedStorage'],

  // Explicitly scoped hosts (No wildcards like https://*/*)
  host_permissions: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'http://localhost:3000/*',
    'http://127.0.0.1:3000/*',
    'https://openrouter.ai/*', // Add OpenRouter API domain if background worker calls it directly
  ],
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
      js: ['src/content-scripts/chatgpt.js'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://claude.ai/*'],
      js: ['src/content-scripts/claude.js'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://gemini.google.com/*'],
      js: ['src/content-scripts/gemini.js'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['icons/*'],
      matches: [
        'https://chatgpt.com/*',
        'https://chat.openai.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*',
      ],
    },
  ],
})