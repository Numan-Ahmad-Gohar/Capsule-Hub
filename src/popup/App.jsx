import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCapsules,
  searchCapsules,
  deleteCapsule,
  getSettings,
  onCapsulesChanged,
} from '../lib/storage.js'
import { MSG, CAPTURE_STAGE } from '../lib/messaging.js'
import { captureActiveTab, getActiveContext } from './api.js'
import Header from './components/Header.jsx'
import CaptureBar from './components/CaptureBar.jsx'
import SearchBar from './components/SearchBar.jsx'
import CapsuleList from './components/CapsuleList.jsx'
import CapsulePreview from './components/CapsulePreview.jsx'
import Settings from './components/Settings.jsx'
import Onboarding from './components/Onboarding.jsx'
import Toast from './components/Toast.jsx'

const STAGE_LABEL = {
  [CAPTURE_STAGE.SCRAPING]: 'Reading the conversation…',
  [CAPTURE_STAGE.DISTILLING]: 'Distilling context with AI…',
  [CAPTURE_STAGE.SAVING]: 'Saving your capsule…',
}

export default function App() {
  const [view, setView] = useState('list') // 'list' | 'settings'
  const [capsules, setCapsules] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [settings, setSettings] = useState(null)
  const [context, setContext] = useState({ platform: 'unknown' })
  const [capturing, setCapturing] = useState(false)
  const [captureStage, setCaptureStage] = useState('')
  const [toast, setToast] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const notify = useCallback((kind, title, body) => {
    setToast({ kind, title, body, id: Date.now() })
  }, [])

  // --- initial load ----------------------------------------------------------
  const refresh = useCallback(async () => {
    const list = await getCapsules()
    setCapsules(list)
  }, [])

  useEffect(() => {
    ;(async () => {
      const [list, s, ctx] = await Promise.all([
        getCapsules(),
        getSettings(),
        getActiveContext(),
      ])
      setCapsules(list)
      setSettings(s)
      setContext(ctx)
      if (!s.onboarded) setShowOnboarding(true)
    })()

    // Keep the list in sync if a capture completes while we're open.
    const unsub = onCapsulesChanged((list) => setCapsules(list))
    return unsub
  }, [])

  // --- live capture status from the background worker ------------------------
  useEffect(() => {
    const listener = (msg) => {
      if (msg?.type === MSG.CAPTURE_STATUS) {
        if (msg.stage === CAPTURE_STAGE.ERROR) {
          setCapturing(false)
          setCaptureStage('')
        } else if (msg.stage === CAPTURE_STAGE.DONE) {
          setCaptureStage('')
        } else {
          setCaptureStage(STAGE_LABEL[msg.stage] || '')
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // --- search ----------------------------------------------------------------
  useEffect(() => {
    let alive = true
    searchCapsules(query).then((r) => {
      if (alive) setResults(r)
    })
    return () => {
      alive = false
    }
  }, [query, capsules])

  const hasKey = useMemo(() => {
    if (!settings) return false
    const keyField =
      { openai: 'openaiApiKey', anthropic: 'anthropicApiKey', openrouter: 'openrouterApiKey' }[
        settings.provider
      ] || 'openaiApiKey'
    return Boolean(settings[keyField])
  }, [settings])

  // --- actions ---------------------------------------------------------------
  const handleCapture = useCallback(async () => {
    if (!hasKey) {
      notify('err', 'API key needed', 'Add your API key in Settings to distill conversations.')
      setView('settings')
      return
    }
    setCapturing(true)
    setCaptureStage(STAGE_LABEL[CAPTURE_STAGE.SCRAPING])
    try {
      const capsule = await captureActiveTab()
      await refresh()
      notify('ok', 'Capsule saved', `“${capsule.title}” is ready to reuse.`)
    } catch (e) {
      notify('err', 'Capture failed', e.message)
    } finally {
      setCapturing(false)
      setCaptureStage('')
    }
  }, [hasKey, notify, refresh])

  const handleDelete = useCallback(
    async (id) => {
      await deleteCapsule(id)
      setSelected((cur) => (cur?.id === id ? null : cur))
      await refresh()
      notify('ok', 'Deleted', 'Capsule removed.')
    },
    [notify, refresh],
  )

  const handleSettingsSaved = useCallback((next) => {
    setSettings(next)
  }, [])

  const finishOnboarding = useCallback(async () => {
    setShowOnboarding(false)
    const { saveSettings } = await import('../lib/storage.js')
    const next = await saveSettings({ onboarded: true })
    setSettings(next)
  }, [])

  // --- render ----------------------------------------------------------------
  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="ch-spin h-6 w-6 rounded-full border-2 border-slate-300 border-t-brand-600" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <Header view={view} onNavigate={setView} />

      {view === 'settings' ? (
        <Settings
          settings={settings}
          onSaved={handleSettingsSaved}
          onNotify={notify}
          onBack={() => setView('list')}
        />
      ) : (
        <>
          <CaptureBar
            context={context}
            capturing={capturing}
            captureStage={captureStage}
            hasKey={hasKey}
            onCapture={handleCapture}
          />
          <SearchBar
            value={query}
            onChange={setQuery}
            count={results.length}
            total={capsules.length}
          />
          <CapsuleList
            capsules={results}
            totalCount={capsules.length}
            query={query}
            onSelect={setSelected}
            onDelete={handleDelete}
          />
        </>
      )}

      {selected && (
        <CapsulePreview
          capsule={selected}
          context={context}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onNotify={notify}
        />
      )}

      {showOnboarding && (
        <Onboarding
          onDone={finishOnboarding}
          onOpenSettings={() => {
            finishOnboarding()
            setView('settings')
          }}
        />
      )}

      {toast && <Toast key={toast.id} {...toast} onDone={() => setToast(null)} />}
    </div>
  )
}
