import { useStore } from 'zustand';
import { tripStore, type TripState } from '../../app/trip/trip-store.ts';

/** React binding for the app store. */
export function useTripStore(): TripState;
export function useTripStore<T>(selector: (s: TripState) => T): T;
export function useTripStore<T>(selector?: (s: TripState) => T) {
  return useStore(tripStore, selector ?? ((s) => s as unknown as T));
}
