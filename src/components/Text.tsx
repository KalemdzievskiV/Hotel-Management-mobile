import { Text as RNText, TextProps } from 'react-native';
import { type as typeScale, useTheme, type ToneName } from '@/theme';

type Variant = keyof typeof typeScale;
type Color = 'text' | 'muted' | 'subtle' | 'primary' | 'onPrimary' | ToneName;

/** Text in one of the type scale's styles, e.g. <Text variant="headline" color="muted"> */
export function Text({
  variant = 'body',
  color = 'text',
  weight,
  align,
  style,
  ...props
}: TextProps & {
  variant?: Variant;
  color?: Color;
  weight?: '400' | '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
}) {
  const { colors } = useTheme();
  const value =
    color === 'text'
      ? colors.text
      : color === 'muted'
        ? colors.textMuted
        : color === 'subtle'
          ? colors.textSubtle
          : color === 'primary'
            ? colors.primary
            : color === 'onPrimary'
              ? colors.onPrimary
              : colors.tones[color].fg;
  return (
    <RNText
      {...props}
      style={[
        typeScale[variant],
        { color: value },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
