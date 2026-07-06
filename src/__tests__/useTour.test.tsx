import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useTour } from '../useTour';
import * as registry from '../registry';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((cb: () => void) => {
        cb();
        return { cancel: jest.fn() };
      }),
    },
  };
});

function setupTour(tourId: string) {
  registry.registerTour(tourId, {});
  const makeRef = () => {
    const ref = { current: { measureInWindow: jest.fn() } };
    return ref as any;
  };
  registry.registerStep(tourId, { id: 'a', order: 1, metadata: { title: 'Step A' }, layout: null }, makeRef());
  registry.registerStep(tourId, { id: 'b', order: 2, metadata: { title: 'Step B' }, layout: { x: 10, y: 20, width: 100, height: 50 } }, makeRef());
  registry.updateLayout(tourId, 'a', { x: 5, y: 10, width: 80, height: 40 });
}

afterEach(() => {
  registry.unregisterTour('hook-tour');
});

it('returns isActive=false and totalSteps initially', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  expect(result.current.isActive).toBe(false);
  expect(result.current.totalSteps).toBe(0);
});

it('start() sets isActive=true and totalSteps', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  expect(result.current.isActive).toBe(true);
  expect(result.current.totalSteps).toBe(2);
  expect(result.current.currentStep).toBe(0);
});

it('activeStepData reflects current step after start', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  expect(result.current.activeStepData?.id).toBe('a');
  expect(result.current.activeStepData?.layout).toEqual({ x: 5, y: 10, width: 80, height: 40 });
});

it('next() advances to next step', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  act(() => result.current.next());
  expect(result.current.currentStep).toBe(1);
  expect(result.current.activeStepData?.id).toBe('b');
});

it('next() on last step sets isActive=false', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  act(() => result.current.next());
  act(() => result.current.next());
  expect(result.current.isActive).toBe(false);
  expect(result.current.activeStepData).toBeNull();
});

it('previous() moves back', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  act(() => result.current.next());
  act(() => result.current.previous());
  expect(result.current.currentStep).toBe(0);
});

it('stop() sets isActive=false', () => {
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.start());
  act(() => result.current.stop());
  expect(result.current.isActive).toBe(false);
});

it('refresh() calls registry.refresh', () => {
  jest.spyOn(registry, 'refresh');
  setupTour('hook-tour');
  const { result } = renderHook(() => useTour('hook-tour'));
  act(() => result.current.refresh());
  expect(registry.refresh).toHaveBeenCalledWith('hook-tour');
  jest.restoreAllMocks();
});

it('two hooks with different tourIds are independent', () => {
  registry.registerTour('hook-tour', {});
  registry.registerTour('other-tour', {});
  registry.registerStep('hook-tour', { id: 'x', order: 1, metadata: {}, layout: null }, { current: { measureInWindow: jest.fn() } } as any);

  const { result: r1 } = renderHook(() => useTour('hook-tour'));
  const { result: r2 } = renderHook(() => useTour('other-tour'));

  act(() => r1.current.start());
  expect(r1.current.isActive).toBe(true);
  expect(r2.current.isActive).toBe(false);

  registry.unregisterTour('other-tour');
});
