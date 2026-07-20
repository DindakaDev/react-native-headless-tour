import type { ReactElement, ReactNode } from 'react';

export interface StepLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourStep<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  metadata: TMeta;
  layout: StepLayout | null;
  requiresInteraction?: boolean;
  spotlightBorderRadius?: number;
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
  markInteracted: () => void;
  /** Jump to a step that already exists in the configured steps array. */
  goTo: (stepId: string) => void;
  /** Replace all steps after the current one with a new sequence (branching). */
  branch: (stepIds: string[]) => void;
  isActive: boolean;
  currentStep: number;
  activeStepData: TourStep | null;
  totalSteps: number;
  activeStepRequiresInteraction: boolean;
  activeStepInteracted: boolean;
  /** True when the active step's element is measured and within screen bounds. */
  activeStepLayoutIsReady: boolean;
  /** Screen-coordinate bounds of the scrollable area hosting TourStep elements.
   *  When set, the spotlight hole is clipped to this rect so the overlay never
   *  punches through fixed UI above/below the scroll container. */
  clipBounds: StepLayout | null;
  /** Set the clip bounds from the host scroll container (call with ScrollView's measureInWindow result). */
  setClipBounds: (bounds: StepLayout | null) => void;
}

export interface TourProviderProps extends TourCallbacks {
  tourId: string;
  steps: string[];
  children: ReactNode;
}

export interface TourStepProps<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  tourId: string;
  stepId: string;
  metadata: TMeta;
  requiresInteraction?: boolean;
  spotlightBorderRadius?: number;
  children: ReactElement;
}
