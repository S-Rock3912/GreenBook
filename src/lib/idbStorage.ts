import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * zustand persist 用の IndexedDB ストレージ。
 * グリーン図画像(dataURL)を含むため、容量制限の厳しい
 * localStorage ではなく IndexedDB に保存する。
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
