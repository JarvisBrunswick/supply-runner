import React from "react";
import Svg, { Line, Rect } from "react-native-svg";

export default function PlumbingIcon({ size = 64, color = "#F96302" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* diagonal arm pipe */}
      <Line x1="14" y1="50" x2="38" y2="18" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* shower head body */}
      <Rect x="35" y="8" width="18" height="14" rx="4" fill={color} />
      {/* water flow lines */}
      <Line x1="28" y1="44" x2="26" y2="54" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="36" y1="46" x2="34" y2="56" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="44" y1="44" x2="42" y2="54" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="32" y1="50" x2="30" y2="60" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="40" y1="50" x2="38" y2="60" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="48" y1="46" x2="46" y2="56" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}
