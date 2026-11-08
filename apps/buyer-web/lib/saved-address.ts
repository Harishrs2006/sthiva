// The last delivery address used at checkout, remembered on this device per site PIN so a repeat
// order needs no retyping. Stored only in this browser; the cookie notice covers it as essential.
const KEY = 'sthiva.lastAddress';

export type SavedAddress = { label: string; fullAddress: string; contactPhone: string; pincode?: string };

export function readSavedAddress(pincode?: string): SavedAddress | null {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, SavedAddress>;
    return (pincode && all[pincode]) || all.last || null;
  } catch {
    return null;
  }
}

export function saveAddress(address: SavedAddress) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, SavedAddress>;
    const next: Record<string, SavedAddress> = { ...all, last: address, ...(address.pincode ? { [address.pincode]: address } : {}) };
    // Keep it small: the last address plus up to five sites
    const sites = Object.keys(next).filter((k) => k !== 'last').slice(-5);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([['last', next.last], ...sites.map((k) => [k, next[k]])])));
  } catch {
    // storage blocked: nothing remembered
  }
}
