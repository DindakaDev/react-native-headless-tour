import React, { useRef, useCallback, useEffect } from 'react';
import type { ReactElement, Ref, MutableRefObject, RefCallback } from 'react';
import { InteractionManager, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import * as registry from './registry';
import { useTour } from './useTour';
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
  metadata,
  requiresInteraction,
  spotlightBorderRadius,
  children,
}: TourStepProps<TMeta>): ReactElement {
  const ref = useRef<View>(null);
  const metadataRef = useRef<Record<string, unknown>>(metadata as Record<string, unknown>);
  metadataRef.current = metadata as Record<string, unknown>;
  const requiresInteractionRef = useRef(requiresInteraction);
  requiresInteractionRef.current = requiresInteraction;
  const spotlightBorderRadiusRef = useRef(spotlightBorderRadius);
  spotlightBorderRadiusRef.current = spotlightBorderRadius;

  const measure = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      // Extra rAF so measurement happens after the frame is committed
      // in its final position (navigation animations may finish between
      // InteractionManager and the actual paint).
      requestAnimationFrame(() => {
        ref.current?.measureInWindow((x, y, width, height) => {
          registry.updateLayout(tourId, stepId, { x, y, width, height });
        });
      });
    });
  }, [tourId, stepId]);

  useEffect(() => {
    registry.registerStep(
      tourId,
      { id: stepId, metadata: metadataRef.current, layout: null, requiresInteraction: requiresInteractionRef.current, spotlightBorderRadius: spotlightBorderRadiusRef.current },
      ref,
    );
    return () => {
      registry.unregisterStep(tourId, stepId);
    };
  }, [tourId, stepId]); // metadata via ref — no re-register on inline object changes

  const { isActive, activeStepData, next, markInteracted } = useTour(tourId);
  const isCurrentStep = isActive && activeStepData?.id === stepId;

  const existingOnLayout: ((e: LayoutChangeEvent) => void) | undefined =
    children.props.onLayout;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      existingOnLayout?.(event);
      measure();
    },
    [existingOnLayout, measure],
  );

  const existingOnPress: ((...args: unknown[]) => void) | undefined =
    children.props.onPress;

  const handlePress = useCallback(
    (...args: unknown[]) => {
      existingOnPress?.(...args);
      if (isCurrentStep) {
        markInteracted();
        next();
      }
    },
    [existingOnPress, isCurrentStep, markInteracted, next],
  );

  const existingRef: Ref<View> | undefined = (children as unknown as { ref?: Ref<View> }).ref;

  return React.cloneElement(children, {
    ref: mergeRefs<View>(ref, existingRef),
    onLayout: handleLayout,
    onPress: handlePress,
  });
}
