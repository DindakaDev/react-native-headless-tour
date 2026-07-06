import React, { useRef, useCallback, useEffect } from 'react';
import type { ReactElement, Ref, MutableRefObject, RefCallback } from 'react';
import { InteractionManager, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import * as registry from './registry';
import type { TourStepProps } from './types';

function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): RefCallback<T> {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(value);
      } else {
        (ref as MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export function TourStep<TMeta extends Record<string, unknown> = Record<string, unknown>>({
  tourId,
  stepId,
  order,
  metadata,
  children,
}: TourStepProps<TMeta>): ReactElement {
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        registry.updateLayout(tourId, stepId, { x, y, width, height });
      });
    });
  }, [tourId, stepId]);

  useEffect(() => {
    registry.registerStep(
      tourId,
      { id: stepId, order, metadata: metadata as Record<string, unknown>, layout: null },
      ref,
    );
    return () => {
      registry.unregisterStep(tourId, stepId);
    };
  }, [tourId, stepId, order, metadata]);

  const existingOnLayout: ((e: LayoutChangeEvent) => void) | undefined =
    children.props.onLayout;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      existingOnLayout?.(event);
      measure();
    },
    [existingOnLayout, measure],
  );

  const existingRef: Ref<View> | undefined = (children as unknown as { ref?: Ref<View> }).ref;

  return React.cloneElement(children, {
    ref: mergeRefs<View>(ref, existingRef),
    onLayout: handleLayout,
  });
}
