// jest.setup.js — runs as setupFilesAfterEnv
// Provide stubs for native modules that react-native expects when
// jest.requireActual('react-native') is spread in test mocks.

jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  getConstants: () => ({ settings: {} }),
  setValues: jest.fn(),
  deleteValues: jest.fn(),
}));
