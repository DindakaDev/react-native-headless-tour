import React, { createRef } from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { TourStep } from '../TourStep';
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

jest.spyOn(registry, 'registerStep');
jest.spyOn(registry, 'unregisterStep');
jest.spyOn(registry, 'updateLayout');

const mockMeasureInWindow = jest.fn((cb: (x: number, y: number, w: number, h: number) => void) =>
  cb(10, 20, 100, 50),
);

afterEach(() => {
  jest.clearAllMocks();
  registry.unregisterTour('tour-a');
});

it('calls registerStep on mount', () => {
  render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{ title: 'Hello' }}>
      <View testID="child" />
    </TourStep>,
  );
  expect(registry.registerStep).toHaveBeenCalledWith(
    'tour-a',
    { id: 's1', metadata: { title: 'Hello' }, layout: null },
    expect.objectContaining({ current: expect.anything() }),
  );
});

it('calls unregisterStep on unmount', () => {
  const { unmount } = render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{}}>
      <View testID="child" />
    </TourStep>,
  );
  unmount();
  expect(registry.unregisterStep).toHaveBeenCalledWith('tour-a', 's1');
});

it('calls updateLayout after onLayout fires', () => {
  const spy = jest.spyOn(View.prototype, 'measureInWindow').mockImplementation(mockMeasureInWindow);
  const { getByTestId } = render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{}}>
      <View testID="child" />
    </TourStep>,
  );
  const child = getByTestId('child');
  fireEvent(child, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } } });
  expect(registry.updateLayout).toHaveBeenCalledWith('tour-a', 's1', {
    x: 10,
    y: 20,
    width: 100,
    height: 50,
  });
  spy.mockRestore();
});

it('preserves existing onLayout callback on child', () => {
  const existingOnLayout = jest.fn();
  const { getByTestId } = render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{}}>
      <View testID="child" onLayout={existingOnLayout} />
    </TourStep>,
  );
  fireEvent(getByTestId('child'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
  });
  expect(existingOnLayout).toHaveBeenCalledTimes(1);
});

it('preserves existing ref on child', () => {
  const existingRef = createRef<View>();
  render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{}}>
      <View testID="child" ref={existingRef} />
    </TourStep>,
  );
  expect(existingRef.current).not.toBeNull();
});

it('renders the child directly without extra wrapper', () => {
  const { getByText } = render(
    <TourStep tourId="tour-a" stepId="s1" metadata={{}}>
      <View>
        <Text>label</Text>
      </View>
    </TourStep>,
  );
  expect(getByText('label')).toBeTruthy();
});
