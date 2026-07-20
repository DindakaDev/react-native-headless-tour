import { InteractionManager } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { StepLayout, TourCallbacks, TourStep } from './types';

interface TourState {
  isActive: boolean;
  currentIndex: number;
  orderedStepIds: string[];
  currentStepInteracted: boolean;
}

export interface TourSnapshot {
  state: TourState;
  steps: Map<string, TourStep>;
  clipBounds: StepLayout | null;
}

export function markInteracted(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  instance.state = { ...instance.state, currentStepInteracted: true };
  notify(tourId);
}

interface TourInstance {
  callbacks: TourCallbacks;
  configuredSteps: string[];
  steps: Map<string, TourStep>;
  stepRefs: Map<string, RefObject<View>>;
  state: TourState;
  clipBounds: StepLayout | null;
  snapshot: TourSnapshot | null;
}

const tours = new Map<string, TourInstance>();
const listeners = new Map<string, Set<() => void>>();

function getOrCreate(tourId: string): TourInstance {
  if (!tours.has(tourId)) {
    tours.set(tourId, {
      callbacks: {},
      configuredSteps: [],
      steps: new Map(),
      stepRefs: new Map(),
      state: { isActive: false, currentIndex: 0, orderedStepIds: [], currentStepInteracted: false },
      clipBounds: null,
      snapshot: null,
    });
    listeners.set(tourId, new Set());
  }
  return tours.get(tourId)!;
}

export function setClipBounds(tourId: string, bounds: StepLayout | null): void {
  const instance = getOrCreate(tourId);
  instance.clipBounds = bounds;
  notify(tourId);
}

function notify(tourId: string): void {
  const instance = tours.get(tourId);
  if (instance) {
    instance.snapshot = null;
  }
  listeners.get(tourId)?.forEach((listener) => listener());
}

export function subscribe(tourId: string, listener: () => void): () => void {
  getOrCreate(tourId);
  listeners.get(tourId)!.add(listener);
  return () => {
    listeners.get(tourId)?.delete(listener);
  };
}

export function getSnapshot(tourId: string): TourSnapshot {
  const instance = getOrCreate(tourId);
  if (!instance.snapshot) {
    instance.snapshot = {
      state: { ...instance.state },
      steps: new Map(instance.steps),
      clipBounds: instance.clipBounds,
    };
  }
  return instance.snapshot;
}

export function registerTour(tourId: string, callbacks: TourCallbacks, steps: string[]): void {
  const instance = getOrCreate(tourId);
  instance.callbacks = callbacks;
  instance.configuredSteps = steps;
}

export function unregisterTour(tourId: string): void {
  tours.delete(tourId);
  listeners.delete(tourId);
}

export function registerStep(
  tourId: string,
  step: TourStep,
  ref: RefObject<View>,
): void {
  const instance = getOrCreate(tourId);
  instance.steps.set(step.id, step);
  instance.stepRefs.set(step.id, ref);
  notify(tourId);
}

export function unregisterStep(tourId: string, stepId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  instance.steps.delete(stepId);
  instance.stepRefs.delete(stepId);
  notify(tourId);
}

export function updateLayout(
  tourId: string,
  stepId: string,
  layout: StepLayout,
): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  const step = instance.steps.get(stepId);
  if (!step) return;
  instance.steps.set(stepId, { ...step, layout });
  notify(tourId);
}

export function start(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  instance.state = { isActive: true, currentIndex: 0, orderedStepIds: instance.configuredSteps, currentStepInteracted: false };
  instance.callbacks.onStart?.();
  notify(tourId);
}

export function next(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  const { currentIndex, orderedStepIds } = instance.state;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= orderedStepIds.length) {
    instance.state = { ...instance.state, isActive: false };
    instance.callbacks.onComplete?.();
  } else {
    instance.state = { ...instance.state, currentIndex: nextIndex, currentStepInteracted: false };
    instance.callbacks.onStepChange?.(nextIndex);
  }
  notify(tourId);
}

export function previous(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  const prevIndex = Math.max(0, instance.state.currentIndex - 1);
  instance.state = { ...instance.state, currentIndex: prevIndex, currentStepInteracted: false };
  instance.callbacks.onStepChange?.(prevIndex);
  notify(tourId);
}

export function stop(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  instance.state = { ...instance.state, isActive: false };
  notify(tourId);
}

export function goTo(tourId: string, stepId: string): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  const index = instance.state.orderedStepIds.indexOf(stepId);
  if (index === -1) return;
  instance.state = { ...instance.state, currentIndex: index, currentStepInteracted: false };
  instance.callbacks.onStepChange?.(index);
  notify(tourId);
}

export function branch(tourId: string, stepIds: string[]): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  const { currentIndex, orderedStepIds } = instance.state;
  const newOrderedStepIds = [...orderedStepIds.slice(0, currentIndex + 1), ...stepIds];
  instance.state = { ...instance.state, orderedStepIds: newOrderedStepIds, currentStepInteracted: false };
  notify(tourId);
}

export function refresh(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      instance.stepRefs.forEach((ref, stepId) => {
        ref.current?.measureInWindow((x, y, width, height) => {
          updateLayout(tourId, stepId, { x, y, width, height });
        });
      });
    });
  });
}
