// src/__tests__/registry.test.ts
import { InteractionManager } from 'react-native';
import { createRef } from 'react';
import type { View } from 'react-native';
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

function makeRef(measureInWindowMock = jest.fn()) {
  const ref = createRef<View>();
  Object.defineProperty(ref, 'current', {
    value: { measureInWindow: measureInWindowMock },
    writable: true,
  });
  return ref;
}

afterEach(() => {
  registry.unregisterTour('test');
  registry.unregisterTour('other');
});

describe('registerTour / unregisterTour', () => {
  it('registerTour stores callbacks; getSnapshot returns empty state', () => {
    const onStart = jest.fn();
    registry.registerTour('test', { onStart });
    const snap = registry.getSnapshot('test');
    expect(snap.state.isActive).toBe(false);
    expect(snap.state.currentIndex).toBe(0);
    expect(snap.steps.size).toBe(0);
  });

  it('unregisterTour cleans up; getSnapshot returns fresh default after re-register', () => {
    registry.registerTour('test', {});
    registry.unregisterTour('test');
    registry.registerTour('test', {});
    const snap = registry.getSnapshot('test');
    expect(snap.state.isActive).toBe(false);
  });
});

describe('registerStep / unregisterStep', () => {
  it('registerStep adds step with null layout', () => {
    registry.registerTour('test', {});
    const ref = makeRef();
    registry.registerStep('test', { id: 'step-1', order: 1, metadata: {}, layout: null }, ref);
    const snap = registry.getSnapshot('test');
    expect(snap.steps.has('step-1')).toBe(true);
    expect(snap.steps.get('step-1')!.layout).toBeNull();
  });

  it('unregisterStep removes step', () => {
    registry.registerTour('test', {});
    const ref = makeRef();
    registry.registerStep('test', { id: 'step-1', order: 1, metadata: {}, layout: null }, ref);
    registry.unregisterStep('test', 'step-1');
    expect(registry.getSnapshot('test').steps.has('step-1')).toBe(false);
  });
});

describe('updateLayout', () => {
  it('stores layout on step', () => {
    registry.registerTour('test', {});
    const ref = makeRef();
    registry.registerStep('test', { id: 'step-1', order: 1, metadata: {}, layout: null }, ref);
    registry.updateLayout('test', 'step-1', { x: 10, y: 20, width: 100, height: 50 });
    const step = registry.getSnapshot('test').steps.get('step-1')!;
    expect(step.layout).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });
});

describe('start', () => {
  it('sets isActive=true, currentIndex=0, sorts steps by order', () => {
    const onStart = jest.fn();
    registry.registerTour('test', { onStart });
    registry.registerStep('test', { id: 'b', order: 2, metadata: {}, layout: null }, makeRef());
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    const { state } = registry.getSnapshot('test');
    expect(state.isActive).toBe(true);
    expect(state.currentIndex).toBe(0);
    expect(state.orderedStepIds).toEqual(['a', 'b']);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('next', () => {
  it('increments currentIndex and calls onStepChange', () => {
    const onStepChange = jest.fn();
    registry.registerTour('test', { onStepChange });
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.registerStep('test', { id: 'b', order: 2, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    registry.next('test');
    expect(registry.getSnapshot('test').state.currentIndex).toBe(1);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('calls onComplete and sets isActive=false on last step', () => {
    const onComplete = jest.fn();
    registry.registerTour('test', { onComplete });
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    registry.next('test');
    const { state } = registry.getSnapshot('test');
    expect(state.isActive).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('previous', () => {
  it('decrements currentIndex and calls onStepChange', () => {
    const onStepChange = jest.fn();
    registry.registerTour('test', { onStepChange });
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.registerStep('test', { id: 'b', order: 2, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    registry.next('test');
    registry.previous('test');
    expect(registry.getSnapshot('test').state.currentIndex).toBe(0);
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });

  it('clamps at index 0', () => {
    registry.registerTour('test', {});
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    registry.previous('test');
    expect(registry.getSnapshot('test').state.currentIndex).toBe(0);
  });
});

describe('stop', () => {
  it('sets isActive=false', () => {
    registry.registerTour('test', {});
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    registry.start('test');
    registry.stop('test');
    expect(registry.getSnapshot('test').state.isActive).toBe(false);
  });
});

describe('refresh', () => {
  it('calls measureInWindow on all step refs', () => {
    const measureInWindow = jest.fn();
    registry.registerTour('test', {});
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef(measureInWindow));
    registry.registerStep('test', { id: 'b', order: 2, metadata: {}, layout: null }, makeRef(measureInWindow));
    registry.refresh('test');
    expect(measureInWindow).toHaveBeenCalledTimes(2);
  });
});

describe('subscribe / notify / getSnapshot stability', () => {
  it('calls listener when state changes', () => {
    registry.registerTour('test', {});
    const listener = jest.fn();
    const unsub = registry.subscribe('test', listener);
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it('getSnapshot returns same reference between notifications', () => {
    registry.registerTour('test', {});
    const snap1 = registry.getSnapshot('test');
    const snap2 = registry.getSnapshot('test');
    expect(snap1).toBe(snap2);
  });

  it('getSnapshot returns new reference after notify', () => {
    registry.registerTour('test', {});
    const snap1 = registry.getSnapshot('test');
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    const snap2 = registry.getSnapshot('test');
    expect(snap1).not.toBe(snap2);
  });

  it('tours with different tourIds are independent', () => {
    registry.registerTour('test', {});
    registry.registerTour('other', {});
    const listener = jest.fn();
    registry.subscribe('other', listener);
    registry.registerStep('test', { id: 'a', order: 1, metadata: {}, layout: null }, makeRef());
    expect(listener).not.toHaveBeenCalled();
  });
});
