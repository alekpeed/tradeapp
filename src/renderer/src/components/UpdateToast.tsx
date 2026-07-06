import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/ipc'

export default function UpdateToast(): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => window.tradeapp.updater.onStatus(setStatus), [])

  async function restart(): Promise<void> {
    await window.tradeapp.updater.restartAndInstall()
  }

  if (status.state === 'downloading') {
    return (
      <div className="update-toast">
        <div className="update-toast-title">Downloading update…</div>
        <p>{status.percent}% — the app keeps working normally while this happens.</p>
      </div>
    )
  }

  if (status.state === 'downloaded') {
    return (
      <div className="update-toast">
        <div className="update-toast-title">Update ready</div>
        <p>Version {status.version} is downloaded and ready to install.</p>
        <button type="button" onClick={restart}>
          Restart now to update
        </button>
      </div>
    )
  }

  return null
}
