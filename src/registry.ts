import { InteractionManager } from 'react-native';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { StepLayout, TourCallbacks, TourStep } from './types';

interface TourState {
  isActive: boolean;
  currentIndex: number;
  orderedStepIds: string[];
}

export interface TourSnapshot {
  state: TourState;
  steps: Map<string, TourStep>;
}

interface TourInstance {
  callbacks: TourCallbacks;
  steps: Map<string, TourStep>;
  stepRefs: Map<string, RefObject<View>>;
  state: TourState;
  snapshot: TourSnapshot | null;
}

const tours = new Map<string, TourInstance>();
const listeners = new Map<string, Set<() => void>>();

function getOrCreate(tourId: string): TourInstance {
  if (!tours.has(tourId)) {
    tours.set(tourId, {
      callbacks: {},
      steps: new Map(),
      stepRefs: new Map(),
      state: { isActive: false, currentIndex: 0, orderedStepIds: [] },
      snapshot: null,
    });
    listeners.set(tourId, new Set());
  }
  return tours.get(tourId)!;
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
    };
  }
  return instance.snapshot;
}

export function registerTour(tourId: string, callbacks: TourCallbacks): void {
  const instance = getOrCreate(tourId);
  instance.callbacks = callbacks;
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
  const orderedStepIds = Array.from(instance.steps.values())
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
  instance.state = { isActive: true, currentIndex: 0, orderedStepIds };
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
    instance.state = { ...instance.state, currentIndex: nextIndex };
    instance.callbacks.onStepChange?.(nextIndex);
  }
  notify(tourId);
}

export function previous(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance || !instance.state.isActive) return;
  const prevIndex = Math.max(0, instance.state.currentIndex - 1);
  instance.state = { ...instance.state, currentIndex: prevIndex };
  instance.callbacks.onStepChange?.(prevIndex);
  notify(tourId);
}

export function stop(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  instance.state = { ...instance.state, isActive: false };
  notify(tourId);
}

export function refresh(tourId: string): void {
  const instance = tours.get(tourId);
  if (!instance) return;
  InteractionManager.runAfterInteractions(() => {
    instance.stepRefs.forEach((ref, stepId) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        updateLayout(tourId, stepId, { x, y, width, height });
      });
    });
  });
}
