'use client';

import { useState } from 'react';

/** Resets only this app's local sandbox after an explicit visitor action. */
export function ResetDemo({ onReset }: { onReset: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReset();
    } catch {
      setError('Could not reset the demo. Please try again.');
      setBusy(false);
    }
  };
  const confirm = () => {
    const message =
      'Remove this app’s accounts and changes from this device and restore the sample data?';
    if (window.confirm(message)) void reset();
  };
  return (
    <div className="flex flex-col gap-2 py-4">
      <p style={{ color: '#71717a', fontSize: 13 }}>
        Your demo data stays on this device.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={confirm}
        data-testid="reset-demo"
        className="cursor-pointer self-start py-3"
      >
        <span style={{ color: '#ef4444', fontSize: 15, fontWeight: 600 }}>
          {busy ? 'Resetting…' : 'Reset demo'}
        </span>
      </button>
      {error ? (
        <p role="alert" style={{ color: '#ef4444' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
