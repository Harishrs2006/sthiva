'use client';

import { useState } from 'react';
import { useDeliveryServiceability, useLocationSelector, useSelectedLocation } from '@sthiva/web-core';

// "Does Sthiva deliver to my site?" answered in the first screen. Uses the same PIN check and saved
// location as the rest of the site, so product lists and checkout follow the PIN typed here.
export function HeroPinCheck() {
  const location = useSelectedLocation();
  const area = useDeliveryServiceability();
  const { state, submitPincode } = useLocationSelector();
  const [pin, setPin] = useState('');
  const [editing, setEditing] = useState(false);

  const checking = state.phase === 'checking';
  const result = state.phase === 'result' ? state.check : null;

  if (location && !editing && !checking) {
    const served = area.status === 'serviceable';
    const none = area.status === 'not-serviceable';
    return (
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-white/15 bg-ink/50 px-4 py-3 text-[14px] text-sand backdrop-blur-md">
        <span className="material-symbols-outlined text-[20px] text-lime" aria-hidden="true">location_on</span>
        <span>
          Your site: <span className="font-mono font-semibold">{location.pincode}</span>
          {served && <span className="text-sand/75"> · suppliers deliver here</span>}
          {none && <span className="text-sand/75"> · no supplier yet, Sthiva will find one when you order</span>}
        </span>
        <button type="button" onClick={() => { setPin(''); setEditing(true); }} className="font-semibold text-lime underline underline-offset-4">
          Change
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-auto w-full max-w-md"
      onSubmit={(e) => { e.preventDefault(); submitPincode(pin); setEditing(false); }}
      aria-label="Check delivery to your site"
    >
      <label htmlFor="hero-pin" className="mb-2 block text-[14px] font-medium text-sand/80">Check delivery to your site</label>
      <div className="flex gap-2 rounded-full border border-white/20 bg-ink/50 p-1.5 backdrop-blur-md focus-within:border-lime">
        <input
          id="hero-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Site PIN code"
          className="min-w-0 flex-1 bg-transparent px-4 font-mono text-[16px] text-sand placeholder:text-sand/40 focus:outline-none"
        />
        <button type="submit" disabled={pin.length !== 6 || checking} className="btn h-11 shrink-0 bg-sand px-5 text-[15px] text-ink hover:bg-lime disabled:opacity-60">
          {checking ? 'Checking...' : 'Check'}
        </button>
      </div>
      {result && result.status !== 'serviceable' && result.status !== 'not-serviceable' && (
        <p role="alert" className="mt-2 text-[14px] text-[#FFB4B6]">{result.message}</p>
      )}
    </form>
  );
}
