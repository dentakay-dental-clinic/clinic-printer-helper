const CACHE_KEY = "patient_info_cache";

export interface CachedPatientInfo {
  gender?: string;
  birthDate?: string;
}

function load(): Record<string, CachedPatientInfo> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCachedPatientInfo(ak: string): CachedPatientInfo {
  return load()[ak] ?? {};
}

export function cachePatientInfo(ak: string, info: CachedPatientInfo) {
  const data = load();
  data[ak] = { ...data[ak], ...info };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}
