# react-native-headless-tour

> Multi-instance headless tour & onboarding library for React Native & Expo. Brings step coordinates and state — you bring the UI.

[![npm version](https://img.shields.io/npm/v/react-native-headless-tour)](https://www.npmjs.com/package/react-native-headless-tour)
[![license](https://img.shields.io/npm/l/react-native-headless-tour)](./LICENSE)

---

## Why headless?

Most tour libraries force their own tooltips, arrows, and modals onto your app. This library does none of that. It measures your elements, tracks which step is active, and hands you the screen coordinates — you render whatever you want on top.

- Build tooltips with `Animated`, `Reanimated`, NativeWind, or plain `StyleSheet`
- Full control over design, animation, and positioning
- No style overrides to fight

---

## Features

- **Multi-instance** — run independent tours simultaneously (e.g. `"onboarding"` and `"checkout"` on different screens)
- **Headless** — zero UI rendered by the library
- **Automatic measurement** — step coordinates update on layout changes, orientation, and scroll
- **Manual refresh** — call `refresh()` to re-measure all steps on demand
- **Fully typed** — generic `metadata` so your step data is strongly typed end-to-end
- **Expo compatible** — works in Expo Go and Development Builds

---

## Requirements

- React ≥ 18.0.0
- React Native ≥ 0.71.0

---

## Installation

```sh
npm install react-native-headless-tour
```

No native modules — no extra `pod install` or build steps required.

---

## Quick start

```tsx
import {
  TourProvider,
  TourStep,
  useTour,
} from 'react-native-headless-tour';

// 1. Wrap your screen (or any ancestor) with TourProvider
export function HomeScreen() {
  return (
    <TourProvider
      tourId="onboarding"
      steps={['welcome', 'profile']}
      onStart={() => console.log('tour started')}
      onStepChange={(step) => console.log('step', step)}
      onComplete={() => console.log('tour done')}
    >
      <MyContent />
      <OnboardingTooltip />
    </TourProvider>
  );
}

// 2. Register elements as tour steps — stepId must match an entry in TourProvider's `steps` array
function MyContent() {
  return (
    <View>
      <TourStep
        tourId="onboarding"
        stepId="welcome"
        metadata={{ title: 'Welcome!', description: 'This is your home screen.' }}
      >
        <TouchableOpacity onPress={handlePress}>
          <Text>Get started</Text>
        </TouchableOpacity>
      </TourStep>

      <TourStep
        tourId="onboarding"
        stepId="profile"
        metadata={{ title: 'Your profile', description: 'Tap here to edit your info.' }}
      >
        <View>
          <Text>Profile</Text>
        </View>
      </TourStep>
    </View>
  );
}

// 3. Render your own tooltip anywhere in the tree
function OnboardingTooltip() {
  const { isActive, activeStepData, next, stop, currentStep, totalSteps } =
    useTour('onboarding');

  if (!isActive || !activeStepData?.layout) return null;

  const { x, y, width, height } = activeStepData.layout;

  return (
    <View
      style={{
        position: 'absolute',
        top: y + height + 8,
        left: x,
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 8,
        maxWidth: 280,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
        {activeStepData.metadata.title}
      </Text>
      <Text style={{ color: '#ccc', marginTop: 4 }}>
        {activeStepData.metadata.description}
      </Text>
      <Text style={{ color: '#888', marginTop: 8 }}>
        {currentStep + 1} / {totalSteps}
      </Text>
      <TouchableOpacity onPress={next}>
        <Text style={{ color: '#4f8ef7', marginTop: 12 }}>Next →</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={stop}>
        <Text style={{ color: '#888', marginTop: 8 }}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

// 4. Start the tour
const { start } = useTour('onboarding');
<Button title="Start tour" onPress={start} />
```

---

## Multiple independent tours

Each `tourId` is its own isolated instance. Providers, steps, and hooks with different IDs never interfere.

```tsx
// Screen A
<TourProvider tourId="onboarding">...</TourProvider>

// Screen B (different screen, different tour)
<TourProvider tourId="checkout">...</TourProvider>

// Hook reads only its own tour
const onboarding = useTour('onboarding');
const checkout = useTour('checkout');
```

---

## Typed metadata

Pass a generic type to get end-to-end type safety on your step data:

```tsx
interface StepMeta {
  title: string;
  description: string;
  cta?: string;
}

<TourStep<StepMeta>
  tourId="onboarding"
  stepId="welcome"
  metadata={{ title: 'Welcome', description: 'Start here.' }}
>
  <View />
</TourStep>

// activeStepData.metadata is typed as StepMeta
const { activeStepData } = useTour('onboarding');
activeStepData?.metadata.title; // string
```

---

## Tooltip outside the Provider tree (Portals)

`TourStep` uses `tourId` as a direct prop — it does not need to be inside the `TourProvider` subtree. This means you can render your tooltip in a Portal or a root-level overlay and it will still work:

```tsx
// Root layout
<View style={{ flex: 1 }}>
  <Stack />
  {/* Tooltip rendered at root level, outside any TourProvider */}
  <GlobalTooltip />
</View>
```

---

## API

### `<TourProvider>`

Registers a tour instance. Cleans up automatically on unmount.

| Prop | Type | Required | Description |
|---|---|---|---|
| `tourId` | `string` | ✅ | Unique identifier for this tour |
| `steps` | `string[]` | ✅ | Ordered list of stepIds — the sole source of truth for tour order. Independent of which `TourStep`s are currently mounted, so steps on a screen the user hasn't navigated to yet are still counted. |
| `onStart` | `() => void` | | Called when `start()` is invoked |
| `onStepChange` | `(step: number) => void` | | Called on each step advance (0-based index) |
| `onComplete` | `() => void` | | Called after the last step |
| `children` | `ReactNode` | ✅ | |

---

### `<TourStep>`

Wraps a native element, measures its position, and registers it in the tour. Renders the child unchanged — no wrapping View.

| Prop | Type | Required | Description |
|---|---|---|---|
| `tourId` | `string` | ✅ | Which tour this step belongs to |
| `stepId` | `string` | ✅ | Must match one entry in the owning `TourProvider`'s `steps` array |
| `metadata` | `TMeta` | ✅ | Free-form data (title, description, etc.) |
| `children` | `ReactElement` | ✅ | Exactly one native host element |

> `children` must be a single native element that accepts a ref (`View`, `TouchableOpacity`, `Pressable`, etc.). Custom components must use `React.forwardRef`.

---

### `useTour(tourId: string): TourControls`

Subscribes to a tour instance. Re-renders only when the relevant tour's state changes.

```typescript
interface TourControls {
  // State
  isActive: boolean;
  currentStep: number;        // 0-based index
  totalSteps: number;
  activeStepData: TourStep | null;

  // Controls
  start: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  refresh: () => void;        // re-measures all registered steps
}
```

---

### `TourStep` data shape

```typescript
interface TourStep<TMeta extends Record<string, unknown>> {
  id: string;
  order: number;
  metadata: TMeta;
  layout: StepLayout | null;  // null until first layout measurement
}

interface StepLayout {
  x: number;      // distance from left edge of screen
  y: number;      // distance from top edge of screen
  width: number;
  height: number;
}
```

Coordinates are relative to the window (screen), suitable for `position: 'absolute'` overlays.

---

## How measurement works

| Trigger | Action |
|---|---|
| `TourStep` mounts | Measures after `InteractionManager.runAfterInteractions` |
| `onLayout` fires | Re-measures (covers scroll, resize, orientation change) |
| `refresh()` called | Re-measures all registered steps |

`layout` will be `null` until the first layout event fires. Always guard before positioning your tooltip:

```tsx
if (!activeStepData?.layout) return null;
```

---

## Step ordering

The `steps` array passed to `<TourProvider>` is the sole source of truth for step order. Steps are toured through in the order they appear in this array, regardless of when `TourStep` components mount or unmount. This means you can have steps on screens the user hasn't visited yet, and they'll still be counted in the total and ordered correctly.

---

## License

MIT © Ismael Castillo
