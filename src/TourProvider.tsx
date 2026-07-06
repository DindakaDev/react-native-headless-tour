import { useEffect, Fragment } from 'react';
import type { ReactElement } from 'react';
import * as registry from './registry';
import type { TourProviderProps } from './types';

export function TourProvider({
  tourId,
  onStart,
  onStepChange,
  onComplete,
  children,
}: TourProviderProps): ReactElement {
  useEffect(() => {
    registry.registerTour(tourId, { onStart, onStepChange, onComplete });
    return () => {
      registry.unregisterTour(tourId);
    };
  }, [tourId, onStart, onStepChange, onComplete]);

  return <Fragment>{children}</Fragment>;
}
