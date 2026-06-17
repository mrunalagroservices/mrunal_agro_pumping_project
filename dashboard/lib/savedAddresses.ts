const STORAGE_KEY = "mrunal_saved_addresses";

export interface SavedAddress {
  id: string;
  label: string; // "Home", "Farm", "Office", etc.
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export function getSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function upsertAddress(addr: SavedAddress): SavedAddress[] {
  const list = getSavedAddresses();
  const idx = list.findIndex((a) => a.id === addr.id);
  // If marking as default, clear others
  const updated = addr.isDefault ? list.map((a) => ({ ...a, isDefault: false })) : [...list];
  if (idx === -1) updated.push(addr);
  else updated[idx] = addr;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteAddress(id: string): SavedAddress[] {
  const list = getSavedAddresses().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function setDefaultAddress(id: string): SavedAddress[] {
  const list = getSavedAddresses().map((a) => ({ ...a, isDefault: a.id === id }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function newId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
