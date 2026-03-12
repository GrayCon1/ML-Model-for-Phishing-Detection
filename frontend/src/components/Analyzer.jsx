import { useMemo, useState } from 'react'

const initialForm = {
  subject: '',
  body: '',
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

export default function Analyzer() {
  const [formData, setFormData] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      const response = await fetch('/analyze', {
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
        throw new Error('The analysis service could not process this email.')
      }

      const data = await response.json()
      setResult(data)
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

  const indicators = result?.indicators ?? []
  const topSignals = result?.top_signals ?? []

  return (
    <section className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/75 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur xl:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

        <div className="mb-8 space-y-4">
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Threat Detection Console
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              AI Phishing Email Detector
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Paste an email subject and message body to assess phishing risk,
              surface suspicious indicators, and review the model response in a
              clean security-focused dashboard.
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-200"
              htmlFor="subject"
            >
              Email Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Urgent: Verify your account credentials"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="body">
              Email Body
            </label>
            <textarea
              id="body"
              name="body"
              rows="10"
              value={formData.body}
              onChange={handleChange}
              placeholder="Paste the full email content here..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-700 disabled:text-slate-200"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Email'}
            </button>
            <p className="text-sm text-slate-400">
              Results are based on the model score and rule-based phishing
              signals.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur xl:p-10">
        <div className="flex h-full flex-col">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
                Email Analysis Result
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Threat Assessment
              </h2>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${riskTone.pill}`}
            >
              {riskTone.badge}
            </span>
          </div>

          {result ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Phishing Risk</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className={`text-5xl font-semibold ${riskTone.color}`}>
                    {riskPercentage}%
                  </p>
                  <p className="text-sm text-slate-400">
                    Model confidence score
                  </p>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${riskTone.bar}`}
                    style={{ width: `${riskPercentage}%` }}
                  />
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Classification
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      {result.label}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone.pill}`}
                  >
                    {riskPercentage >= 50 ? 'Review Immediately' : 'Lower Urgency'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-lg font-medium text-white">Indicators</h3>
                {indicators.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {indicators.map((indicator) => (
                      <li
                        key={indicator}
                        className="flex items-start gap-3 text-sm text-slate-300"
                      >
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                        <span className="capitalize">{indicator}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    No specific phishing indicators were detected for this
                    message.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <h3 className="text-lg font-medium text-white">Top Signals</h3>
                <p className="mt-2 text-sm text-slate-400">
                  The strongest model features contributing to this phishing
                  prediction.
                </p>
                {topSignals.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topSignals.map((signal, index) => (
                      <span
                        key={`${signal}-${index}`}
                        className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-rose-200"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    No explanatory model signals were returned for this email.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                  Awaiting Submission
                </p>
                <p className="max-w-sm text-sm leading-7 text-slate-400">
                  Submit an email to view phishing risk, indicators, and a
                  color-coded threat summary.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}
