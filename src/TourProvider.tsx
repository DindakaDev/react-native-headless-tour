import { useEffect, useRef, Fragment } from 'react';
import type { ReactElement } from 'react';
import * as registry from './registry';
import type { TourProviderProps, TourCallbacks } from './types';

export function TourProvider({
  tourId,
  steps,
  onStart,
  onStepChange,
  onComplete,
  children,
}: TourProviderProps): ReactElement {
  const callbacksRef = useRef<TourCallbacks>({ onStart, onStepChange, onComplete });
  callbacksRef.current = { onStart, onStepChange, onComplete };

  useEffect(() => {
    registry.registerTour(tourId, callbacksRef.current, steps);
    return () => {
      registry.unregisterTour(tourId);
    };
  }, [tourId, steps]); // callbacks via ref — no re-register on inline function changes

  return <Fragment>{children}</Fragment>;
}
