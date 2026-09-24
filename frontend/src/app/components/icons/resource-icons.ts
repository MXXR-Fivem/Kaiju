export interface IconLayer {
  d: string;
  fill?: string;
  stroke?: string;
}

const LIGHT_BLUE = '#93c5fd';
const DEEP_BLUE = '#1d4ed8';
const HOSPITAL_RED = '#dc2626';
const WHITE = '#f8fafc';
const STEEL = '#a1a1aa';
const GUNMETAL = '#27272a';
const WOOD = '#d97706';
const DARK_WOOD = '#78350f';

export const RESOURCE_ICON_FALLBACK: IconLayer[] = [
  { d: 'M4 5H20L21 6V19L20 20H4L3 19V6Z', fill: DARK_WOOD, stroke: WOOD },
  { d: 'M3 9H21', stroke: WOOD },
  { d: 'M3 16H21', stroke: WOOD },
  { d: 'M6.5 16L17.5 9', stroke: WOOD },
];

export const RESOURCE_ICONS: Record<string, IconLayer[]> = {
  WATER: [
    { d: 'M12 2.5L18.5 12V15.5L15 20.5H9L5.5 15.5V12Z', fill: '#1e3a8a' },
    { d: 'M6.2 13.5H17.8V15.3L14.6 19.7H9.4L6.2 15.3Z', fill: '#3b82f6' },
    { d: 'M12 2.5L18.5 12V15.5L15 20.5H9L5.5 15.5V12Z', stroke: LIGHT_BLUE },
    { d: 'M9.5 9L8 11.5', stroke: '#dbeafe' },
  ],
  FOOD: [
    { d: 'M10 11L12 8.5H19.5L21.5 11V18.5L20.5 19.5H11L10 18.5Z', fill: '#b45309', stroke: '#fbbf24' },
    { d: 'M14 10L13 12.5', stroke: '#fde68a' },
    { d: 'M17 10L16 12.5', stroke: '#fde68a' },
    { d: 'M20 10.5L19 12.5', stroke: '#fde68a' },
    { d: 'M3 13L5 11H7.5L8.5 11.8L9.5 11H11.5L13 13V16.5L11 20.5H9.5L8.5 19.8L7.5 20.5H6L4 16.5Z', fill: HOSPITAL_RED, stroke: '#fca5a5' },
    { d: 'M5.5 13.5L5 15', stroke: '#fee2e2' },
    { d: 'M8.5 11.5L8 8.5', stroke: '#a16207' },
    { d: 'M8.5 9.5L11 7L12.5 7.5L10 10Z', fill: '#22c55e' },
  ],
  MED_KIT: [
    { d: 'M4 6.5H20L21 7.5V19L20 20H4L3 19V7.5Z', fill: DEEP_BLUE, stroke: LIGHT_BLUE },
    { d: 'M9 6.5V4H15V6.5', stroke: LIGHT_BLUE },
    { d: 'M8 9H16V17.5H8Z', fill: WHITE },
    { d: 'M10.75 9.75H13.25V12H15.5V14.5H13.25V16.75H10.75V14.5H8.5V12H10.75Z', fill: HOSPITAL_RED },
  ],
  GENERATOR: [
    { d: 'M3 20.5H21', stroke: '#71717a' },
    { d: 'M6 18V20.5', stroke: STEEL },
    { d: 'M18 18V20.5', stroke: STEEL },
    { d: 'M17 6V3.5H19.5', stroke: STEEL },
    { d: 'M4 6H20L21 7V17L20 18H4L3 17V7Z', fill: '#ca8a04', stroke: '#fde047' },
    { d: 'M14.5 7.5L8.5 13H12L9.5 16.5L15.5 11H12Z', fill: '#111827' },
  ],
  FUEL: [
    { d: 'M5 8L9 4H19L20 5V20L19 21H6L5 20Z', fill: GUNMETAL, stroke: STEEL },
    { d: 'M11.5 4V2H18V4', stroke: STEEL },
    { d: 'M7 6L5 4', stroke: '#ef4444' },
    { d: 'M3.5 5.5L6.5 2.5', stroke: '#ef4444' },
    { d: 'M8.5 9.5L16.5 17.5', stroke: '#ef4444' },
    { d: 'M16.5 9.5L8.5 17.5', stroke: '#ef4444' },
  ],
  SHELTER: [
    { d: 'M12 4.5V2.5', stroke: '#d6d3d1' },
    { d: 'M3 19.5L12 4.5L21 19.5Z', fill: DARK_WOOD, stroke: WOOD },
    { d: 'M12 4.5V14', stroke: '#b45309' },
    { d: 'M9.5 19.5L12 14L14.5 19.5Z', fill: '#1c1917', stroke: '#b45309' },
    { d: 'M2 19.5H22', stroke: '#a16207' },
  ],
  MEDIC: [
    { d: 'M3.5 21V15L6.5 11.5H17.5L20.5 15V21Z', fill: WHITE, stroke: '#94a3b8' },
    { d: 'M10 11.5L12 14.5L14 11.5', stroke: '#94a3b8' },
    { d: 'M12 14.5V21', stroke: '#cbd5e1' },
    { d: 'M15 11.5V14.5L16.5 16H17.5', stroke: '#475569' },
    { d: 'M6.75 14.25H8V15.5H9.25V16.75H8V18H6.75V16.75H5.5V15.5H6.75Z', fill: HOSPITAL_RED },
    { d: 'M12 2.5L14.5 4V7L12 8.5L9.5 7V4Z', fill: '#fcd9b6', stroke: '#b7835a' },
  ],
  ATV: [
    { d: 'M4 15.5H2.5V6.5L3.5 5.5H13L15.5 10.5H20.5L21.5 11.5V15.5H20', stroke: '#4ade80' },
    { d: 'M10 15.5H14', stroke: '#4ade80' },
    { d: 'M2.5 10.5H15.5', stroke: '#4ade80' },
    { d: 'M9 5.5V10.5', stroke: '#4ade80' },
    { d: 'M6 15H8L9.5 16.5V18.5L8 20H6L4.5 18.5V16.5Z', stroke: '#4ade80' },
    { d: 'M16 15H18L19.5 16.5V18.5L18 20H16L14.5 18.5V16.5Z', stroke: '#4ade80' },
  ],
  CLEARING_GEAR: [
    { d: 'M14.5 13H18', stroke: '#f59e0b' },
    { d: 'M18 7.5H19.5L21 9V19.5L19.5 21H18Z', fill: STEEL },
    { d: 'M4 15.5V5.5H10L11.5 9.5H14.5V15.5Z', fill: '#f59e0b', stroke: '#fcd34d' },
    { d: 'M4 9.5H11.5', stroke: DARK_WOOD },
    { d: 'M4 15.5H14L15.5 17V18L14 19.5H4L2.5 18V17Z', fill: GUNMETAL, stroke: STEEL },
  ],
  WATER_PURIFIER: [
    { d: 'M3 2.5H21V3.5L14.5 10V12H9.5V10L3 3.5Z', fill: '#334155', stroke: '#94a3b8' },
    { d: 'M6 6.5H18', stroke: '#22d3ee' },
    { d: 'M12 12.5V14', stroke: '#67e8f9' },
    { d: 'M12 15.5L14.5 19V19.5L13.5 21H10.5L9.5 19.5V19Z', fill: '#22d3ee' },
  ],
  FALLBACK: RESOURCE_ICON_FALLBACK,
};

export const RESOURCE_ICON_FRAME: string[] = [
  'M2 6V2H6',
  'M18 2H22V6',
  'M22 18V22H18',
  'M6 22H2V18',
];

export function resourceIconKey(code: string | null | undefined): string {
  const key = (code ?? '').trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(RESOURCE_ICONS, key) ? key : 'FALLBACK';
}
