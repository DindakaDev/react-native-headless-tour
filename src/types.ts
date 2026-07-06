import type { ReactElement, ReactNode } from 'react';

export interface StepLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourStep<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  order: number;
  metadata: TMeta;
  layout: StepLayout | null;
}

export interface TourCallbacks {
  onStart?: () => void;
  onStepChange?: (currentStep: number) => void;
  onComplete?: () => void;
}

export interface TourControls {
  start: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  refresh: () => void;
  isActive: boolean;
  currentStep: number;
  activeStepData: TourStep | null;
  totalSteps: number;
}

export interface TourProviderProps extends TourCallbacks {
  tourId: string;
  children: ReactNode;
}

export interface TourStepProps<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  tourId: string;
  stepId: string;
  order: number;
  metadata: TMeta;
  children: ReactElement;
}
