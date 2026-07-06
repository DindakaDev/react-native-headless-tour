import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { TourProvider } from '../TourProvider';
import * as registry from '../registry';

jest.spyOn(registry, 'registerTour');
jest.spyOn(registry, 'unregisterTour');

afterEach(() => {
  jest.clearAllMocks();
  registry.unregisterTour('test-provider');
});

it('calls registerTour on mount with correct tourId and callbacks', () => {
  const onStart = jest.fn();
  const onComplete = jest.fn();
  render(
    <TourProvider tourId="test-provider" onStart={onStart} onComplete={onComplete}>
      <Text>child</Text>
    </TourProvider>,
  );
  expect(registry.registerTour).toHaveBeenCalledWith('test-provider', {
    onStart,
    onStepChange: undefined,
    onComplete,
  });
});

it('calls unregisterTour on unmount', () => {
  const { unmount } = render(
    <TourProvider tourId="test-provider">
      <Text>child</Text>
    </TourProvider>,
  );
  unmount();
  expect(registry.unregisterTour).toHaveBeenCalledWith('test-provider');
});

it('renders children without a wrapping View', () => {
  const { getByText } = render(
    <TourProvider tourId="test-provider">
      <Text>hello</Text>
    </TourProvider>,
  );
  expect(getByText('hello')).toBeTruthy();
});
