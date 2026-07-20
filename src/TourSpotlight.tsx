import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTour } from './useTour';

interface TourSpotlightProps {
  tourId: string;
  overlayColor?: string;
  padding?: number;
  borderRadius?: number;
}

function buildPath(
  sw: number,
  sh: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  // Outer rect (clockwise)
  const outer = `M 0 0 H ${sw} V ${sh} H 0 Z`;

  // Inner rounded rect (counterclockwise) — evenodd rule creates the hole
  const inner = r > 0
    ? `M ${x + r} ${y}
       L ${x + w - r} ${y}
       Q ${x + w} ${y} ${x + w} ${y + r}
       L ${x + w} ${y + h - r}
       Q ${x + w} ${y + h} ${x + w - r} ${y + h}
       L ${x + r} ${y + h}
       Q ${x} ${y + h} ${x} ${y + h - r}
       L ${x} ${y + r}
       Q ${x} ${y} ${x + r} ${y}
       Z`
    : `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;

  return `${outer} ${inner}`;
}

export function TourSpotlight({
  tourId,
  overlayColor = 'rgba(0,0,0,0.7)',
  padding = 0,
  borderRadius = 0,
}: TourSpotlightProps): React.ReactElement | null {
  const { isActive, activeStepData } = useTour(tourId);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!isActive) return null;

  const layout = activeStepData?.layout;
  if (!layout) return null;

  const x = layout.x - padding;
  const y = layout.y - padding;
  const w = layout.width + padding * 2;
  const h = layout.height + padding * 2;
  const stepRadius = activeStepData?.spotlightBorderRadius ?? borderRadius;
  const r = Math.min(stepRadius, w / 2, h / 2);

  const path = buildPath(screenWidth, screenHeight, x, y, w, h, r);

  return (
    // box-none: container passes touches, children handle their own areas
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, width: screenWidth, height: screenHeight }}>
      {/* Visual overlay — pointer-none so touches fall through to touch blockers below */}
      <Svg
        width={screenWidth}
        height={screenHeight}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Path d={path} fill={overlayColor} fillRule="evenodd" />
      </Svg>

      {/* Touch blockers for dark zones only — hole left open for element interaction */}
      {/* Top */}
      <View pointerEvents="auto" onStartShouldSetResponder={() => true} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, y) }} />
      {/* Bottom */}
      <View pointerEvents="auto" onStartShouldSetResponder={() => true} style={{ position: 'absolute', top: y + h, left: 0, right: 0, bottom: 0 }} />
      {/* Left */}
      <View pointerEvents="auto" onStartShouldSetResponder={() => true} style={{ position: 'absolute', top: y, left: 0, width: Math.max(0, x), height: h }} />
      {/* Right */}
      <View pointerEvents="auto" onStartShouldSetResponder={() => true} style={{ position: 'absolute', top: y, left: x + w, right: 0, height: h }} />
    </View>
  );
}
