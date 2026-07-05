import { useState } from 'react'
import { MANUAL_SECTIONS, manualToHtml } from '../manualContent'

export default function Help(): JSX.Element {
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  async function exportManualPdf(): Promise<void> {
    const result = await window.tradeapp.reports.exportPdf({
      title: 'TradeApp User Manual',
      html: manualToHtml()
    })
    setExportStatus(result.filePath ? `Saved to ${result.filePath}` : 'Export canceled.')
  }

  return (
    <div>
      <h1>Help &amp; User Manual</h1>

      <div className="card">
        <div className="button-row">
          <button type="button" onClick={exportManualPdf}>
            📄 Save this manual as a PDF
          </button>
        </div>
        {exportStatus && <p className="hint-text">{exportStatus}</p>}
        <p className="hint-text">
          Jump to a topic — or just scroll, everything is on this one page.
        </p>
        <div className="help-toc">
          {MANUAL_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.icon} {s.title}
            </a>
          ))}
        </div>
      </div>

      {MANUAL_SECTIONS.map((s) => (
        <div key={s.id} id={s.id} className="card help-section">
          <h2 style={{ marginTop: 0 }}>
            {s.icon} {s.title}
          </h2>
          <div dangerouslySetInnerHTML={{ __html: s.html }} />
        </div>
      ))}
    </div>
  )
}
