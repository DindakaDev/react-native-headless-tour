import { useSyncExternalStore, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const { state, steps, clipBounds } = snapshot;
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
  const markInteracted = useCallback(() => registry.markInteracted(tourId), [tourId]);
  const goTo = useCallback((stepId: string) => registry.goTo(tourId, stepId), [tourId]);
  const branch = useCallback((stepIds: string[]) => registry.branch(tourId, stepIds), [tourId]);
  const setClipBounds = useCallback((bounds: import('./types').StepLayout | null) => registry.setClipBounds(tourId, bounds), [tourId]);

  const activeStepRequiresInteraction = activeStepData?.requiresInteraction ?? false;

  const layout = activeStepData?.layout ?? null;
  const activeStepLayoutIsReady = !!(
    layout &&
    layout.width > 0 &&
    layout.height > 0 &&
    layout.x >= 0 &&
    layout.x < screenWidth &&
    layout.y >= 0 &&
    layout.y < screenHeight
  );

  return {
    start,
    next,
    previous,
    stop,
    refresh,
    markInteracted,
    goTo,
    branch,
    isActive: state.isActive,
    currentStep: state.currentIndex,
    activeStepData,
    totalSteps: state.orderedStepIds.length,
    activeStepRequiresInteraction,
    activeStepInteracted: state.currentStepInteracted,
    activeStepLayoutIsReady,
    clipBounds,
    setClipBounds,
  };
}
