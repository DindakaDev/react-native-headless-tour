import { useEffect, Fragment } from 'react';
import type { ReactElement } from 'react';
import * as registry from './registry';
import type { TourProviderProps } from './types';

export function TourProvider({
  tourId,
  steps,
  onStart,
  onStepChange,
  onComplete,
  children,
}: TourProviderProps): ReactElement {
  useEffect(() => {
    registry.registerTour(tourId, { onStart, onStepChange, onComplete }, steps);
    return () => {
      registry.unregisterTour(tourId);
    };
  }, [tourId, steps, onStart, onStepChange, onComplete]);

  return <Fragment>{children}</Fragment>;
}
