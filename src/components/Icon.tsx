import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { ColorValue } from 'react-native';
import { useTheme } from '@/theme';

export type IosSymbol = Extract<SymbolViewProps['name'], string>;
export type AndroidSymbol = NonNullable<Exclude<SymbolViewProps['name'], string>['android']>;

/** SF Symbol on iOS, Material Symbol on Android and web */
export function Icon({
  ios,
  android,
  size = 24,
  color,
}: {
  ios: IosSymbol;
  android: AndroidSymbol;
  size?: number;
  color?: ColorValue;
}) {
  const { colors } = useTheme();
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color ?? colors.text} />;
}
