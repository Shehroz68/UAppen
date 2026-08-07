// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'mappin.circle.fill': 'place',
  calendar: 'event',
  'calendar.badge.plus': 'event-available',
  clock: 'access-time',
  'person.2': 'people',
  checkmark: 'check',
  'xmark.circle.fill': 'cancel',
  'arrow.triangle.turn.up.right.circle.fill': 'directions',
  'map.fill': 'map',
  'star.fill': 'star',
  star: 'star-border',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
