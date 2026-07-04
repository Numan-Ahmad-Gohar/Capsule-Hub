import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

/**
 * Manifest V3 definition for Capsule Hub.
 *
 * Host permissions are intentionally scoped to the three supported AI platforms
 * plus the two LLM API endpoints used for distillation. The API hosts are
 * required so the background service worker can make cross-origin fetch calls
 * (MV3 service workers can only fetch hosts granted here).
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
  permissions: ['activeTab', 'storage', 'scripting'],
  host_permissions: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://api.openai.com/*',
    'https://api.anthropic.com/*',
    'https://openrouter.ai/*',
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
