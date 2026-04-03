import React from "react";
import Svg, { Rect, Line } from "react-native-svg";

export default function ScrewsIcon({ size = 64, color = "#F96302" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 68 68" fill="none">
      {/* handle */}
      <Rect x="30" y="40" width="8" height="24" rx="4" fill={color} />
      {/* hammer head horizontal */}
      <Rect x="10" y="20" width="48" height="18" rx="5" fill={color} />
      {/* face detail */}
      <Rect x="14" y="24" width="12" height="10" rx="2" fill="white" opacity="0.2" />
      {/* claw top */}
      <Line x1="52" y1="22" x2="60" y2="14" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {/* claw bottom */}
      <Line x1="52" y1="34" x2="60" y2="42" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {/* nail head */}
      <Rect x="31" y="11" width="6" height="4" rx="1.5" fill={color} />
      {/* nail shaft */}
      <Line x1="34" y1="15" x2="34" y2="21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}
