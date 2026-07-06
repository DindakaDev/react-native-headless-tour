import { useSyncExternalStore, useCallback } from 'react';
import * as registry from './registry';
import type { TourControls, TourStep } from './types';

export function useTour(tourId: string): TourControls {
  const subscribe = useCallback(
    (listener: () => void) => registry.subscribe(tourId, listener),
    [tourId],
  );

  const getSnapshot = useCallback(
    () => registry.getSnapshot(tourId),
    [tourId],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const { state, steps } = snapshot;
  const activeStepId = state.isActive
    ? (state.orderedStepIds[state.currentIndex] ?? null)
    : null;
  const activeStepData: TourStep | null = activeStepId
    ? (steps.get(activeStepId) ?? null)
    : null;

  const start = useCallback(() => registry.start(tourId), [tourId]);
  const next = useCallback(() => registry.next(tourId), [tourId]);
  const previous = useCallback(() => registry.previous(tourId), [tourId]);
  const stop = useCallback(() => registry.stop(tourId), [tourId]);
  const refresh = useCallback(() => registry.refresh(tourId), [tourId]);

  return {
    start,
    next,
    previous,
    stop,
    refresh,
    isActive: state.isActive,
    currentStep: state.currentIndex,
    activeStepData,
    totalSteps: state.orderedStepIds.length,
  };
}
