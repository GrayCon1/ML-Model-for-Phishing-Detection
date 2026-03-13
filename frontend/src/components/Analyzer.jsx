import { useMemo, useState } from 'react'

const initialForm = {
  subject: '',
  body: '',
}

function asSafeText(value) {
  return typeof value === 'string' ? value : ''
}

function asSafeStringList(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

function normalizeUrlIntelligence(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      url: asSafeText(item.url),
      is_suspicious: Boolean(item.is_suspicious),
      flags: asSafeStringList(item.flags),
    }))
    .filter((item) => item.url.length > 0)
}

function normalizeAnalyzeResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  return {
    phishing_risk:
      typeof payload.phishing_risk === 'number' ? payload.phishing_risk : 0,
    label: asSafeText(payload.label),
    indicators: asSafeStringList(payload.indicators),
    top_signals: asSafeStringList(payload.top_signals),
    url_intelligence: normalizeUrlIntelligence(payload.url_intelligence),
  }
}

function normalizeRiskScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 0
  }

  if (score <= 1) {
    return Math.round(score * 100)
  }

  return Math.round(score)
}

function getRiskTone(risk) {
  if (risk >= 75) {
    return {
      badge: 'High risk',
      color: 'text-rose-300',
      pill: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
      bar: 'bg-rose-500',
    }
  }

  if (risk >= 40) {
    return {
      badge: 'Moderate risk',
      color: 'text-amber-300',
      pill: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      bar: 'bg-amber-400',
    }
  }

  return {
    badge: 'Low risk',
    color: 'text-emerald-300',
    pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    bar: 'bg-emerald-400',
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightedSegments(text, signals, urlItems) {
  if (!text) return []

  const len = text.length
  const marks = new Array(len).fill('normal')

  for (const signal of signals) {
    try {
      const pattern = new RegExp(escapeRegex(signal), 'gi')
      let match
      while ((match = pattern.exec(text)) !== null) {
        for (let i = match.index; i < match.index + match[0].length; i++) {
          if (marks[i] === 'normal') marks[i] = 'signal'
        }
      }
    } catch {
      // skip invalid patterns
    }
  }

  for (const urlItem of urlItems) {
    const idx = text.indexOf(urlItem.url)
    if (idx !== -1) {
      const t = urlItem.is_suspicious ? 'url-suspicious' : 'url-clean'
      for (let i = idx; i < idx + urlItem.url.length; i++) {
        marks[i] = t
      }
    }
  }

  const segs = []
  let i = 0
  while (i < len) {
    const type = marks[i]
    let j = i + 1
    while (j < len && marks[j] === type) j++
    segs.push({ text: text.slice(i, j), type })
    i = j
  }
  return segs
}

function HighlightedSegments({ segments }) {
  return segments.map((seg, idx) => {
    switch (seg.type) {
      case 'signal':
        return (
          <span
            key={idx}
            className="rounded-sm bg-rose-500/30 px-0.5 text-rose-100 outline outline-1 outline-rose-400/50"
          >
            {seg.text}
          </span>
        )
      case 'url-suspicious':
        return (
          <span
            key={idx}
            className="rounded-sm bg-amber-500/25 px-0.5 text-amber-200 outline outline-1 outline-amber-400/40"
          >
            {seg.text}
          </span>
        )
      case 'url-clean':
        return (
          <span
            key={idx}
            className="rounded-sm bg-cyan-500/20 px-0.5 text-cyan-200 outline outline-1 outline-cyan-400/30"
          >
            {seg.text}
          </span>
        )
      default:
        return <span key={idx}>{seg.text}</span>
    }
  })
}

export default function Analyzer() {
  const [formData, setFormData] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const riskPercentage = useMemo(
    () => normalizeRiskScore(result?.phishing_risk),
    [result],
  )
  const riskTone = useMemo(() => getRiskTone(riskPercentage), [riskPercentage])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!formData.subject.trim() || !formData.body.trim()) {
      setError('Enter both an email subject and email body before analyzing.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('https://ml-model-for-phishing-detection.onrender.com/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          body: formData.body.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(
          response.status >= 500
            ? 'The analysis service is temporarily unavailable.'
            : 'The analysis service could not process this email.',
        )
      }

      const data = await response.json()
      const normalizedResult = normalizeAnalyzeResponse(data)

      if (!normalizedResult) {
        throw new Error('The analysis service returned an invalid response.')
      }

      setResult(normalizedResult)
      setIsLocked(true)
    } catch (requestError) {
      setResult(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to analyze the email right now.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit() {
    setIsLocked(false)
  }

  function handleClear() {
    setFormData(initialForm)
    setResult(null)
    setError('')
    setIsLocked(false)
  }

  const indicators = result?.indicators ?? []
  const topSignals = result?.top_signals ?? []
  const urlIntelligence = result?.url_intelligence ?? []

  const subjectSegments = useMemo(
    () =>
      result
        ? buildHighlightedSegments(formData.subject, topSignals, urlIntelligence)
        : [],
    [result, formData.subject, topSignals, urlIntelligence],
  )

  const bodySegments = useMemo(
    () =>
      result
        ? buildHighlightedSegments(formData.body, topSignals, urlIntelligence)
        : [],
    [result, formData.body, topSignals, urlIntelligence],
  )

  return (
    <section className="flex h-full w-full flex-col gap-3 p-4">
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4 shadow-xl shadow-cyan-950/30 backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

        <div className="mb-4 space-y-3">
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Threat Detector
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Analyze Email
            </h1>
            <p className="text-xs leading-5 text-slate-400">
              Review subject lines, message body content, and model signals in a
              compact extension-friendly layout.
            </p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-300" htmlFor="subject">
                Email Subject
              </label>
              {isLocked && (
                <span className="text-[11px] tracking-wide text-slate-500">
                  Locked, click Edit to modify
                </span>
              )}
            </div>
            {isLocked ? (
              <div className="min-h-10 w-full overflow-hidden rounded-xl border border-slate-600/60 bg-slate-950/80 px-3 py-2 text-sm leading-relaxed text-slate-100 select-text">
                <HighlightedSegments segments={subjectSegments} />
              </div>
            ) : (
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Urgent: Verify your account credentials"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="body">
              Email Body
            </label>
            {isLocked ? (
              <pre className="max-h-40 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-600/60 bg-slate-950/80 px-3 py-2.5 font-sans text-sm leading-relaxed text-slate-100 select-text">
                <HighlightedSegments segments={bodySegments} />
              </pre>
            ) : (
              <textarea
                id="body"
                name="body"
                rows="4"
                value={formData.body}
                onChange={handleChange}
                placeholder="Paste the full email content here..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            )}
          </div>

          {isLocked && topSignals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/50 px-3 py-2">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Highlighted
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="inline-block h-2 w-2 rounded-sm bg-rose-500/40 outline outline-1 outline-rose-400/50" />
                Signal words
              </span>
              {urlIntelligence.some((u) => u.is_suspicious) && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-sm bg-amber-500/30 outline outline-1 outline-amber-400/40" />
                  Suspicious URLs
                </span>
              )}
              {urlIntelligence.some((u) => !u.is_suspicious) && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-sm bg-cyan-500/25 outline outline-1 outline-cyan-400/30" />
                  Clean URLs
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isLocked ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex min-w-[96px] items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
              >
                Edit
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-700 disabled:text-slate-200"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Email'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-w-[96px] items-center justify-center rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              Clear
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Results combine model scoring with rule-based phishing indicators.
          </p>

          {error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <aside className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/30 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Analysis Result
            </p>
            <h2 className="text-base font-semibold text-white">Threat Assessment</h2>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${riskTone.pill}`}
          >
            {riskTone.badge}
          </span>
        </div>

        {result ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Phishing Risk</p>
                  <p className={`mt-1 text-3xl font-semibold ${riskTone.color}`}>
                    {riskPercentage}%
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${riskTone.pill}`}
                >
                  {riskPercentage >= 50 ? 'Review Now' : 'Lower Urgency'}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${riskTone.bar}`}
                  style={{ width: `${riskPercentage}%` }}
                />
              </div>
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Classification
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {result.label}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">
                  Rule-Based Indicators
                </h3>
              </div>
              {indicators.length > 0 ? (
                <ul className="space-y-2">
                  {indicators.map((indicator) => (
                    <li
                      key={indicator}
                      className="flex items-start gap-2 text-xs text-slate-300"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span className="capitalize">{indicator}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  No specific phishing indicators were detected for this message.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">XAI Top Signals</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Strongest features contributing to the prediction.
                </p>
              </div>
              {topSignals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {topSignals.map((signal, index) => (
                    <span
                      key={`${signal}-${index}`}
                      className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-200"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No explanatory model signals were returned for this email.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-white">URL Intelligence</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Link health and suspicious-pattern checks.
                </p>
              </div>
              {urlIntelligence.length > 0 ? (
                <div className="space-y-2">
                  {urlIntelligence.map((item, index) => (
                    <div
                      key={`${item.url}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="min-w-0 flex-1 truncate font-mono text-xs text-cyan-300"
                          title={item.url}
                        >
                          {item.url}
                        </span>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                            item.is_suspicious
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                          }`}
                        >
                          {item.is_suspicious ? 'Suspicious' : 'Clean'}
                        </span>
                      </div>

                      {item.flags.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {item.flags.map((flag, flagIndex) => (
                            <li
                              key={`${flag}-${flagIndex}`}
                              className="flex items-start gap-2 text-xs text-rose-300"
                            >
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-300" />
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-300">
                          No URL risk flags detected.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No URLs were extracted from this email.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Awaiting Submission
              </p>
              <p className="text-xs leading-5 text-slate-400">
                Submit an email to view phishing risk, indicators, and signal
                badges.
              </p>
            </div>
          </div>
        )}
      </aside>
    </section>
  )
}
