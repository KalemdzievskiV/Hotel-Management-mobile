import { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

/** A labelled text input with an optional icon, helper text and error */
export const TextField = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    error?: string | null;
    helper?: string;
    icon?: { ios: IosSymbol; android: AndroidSymbol };
  }
>(function TextField({ label, error, helper, icon, secureTextEntry, style, onFocus, onBlur, ...props }, ref) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="callout" weight="500" color="muted">
          {label}
        </Text>
      )}
      <View style={[styles.field, focused && styles.focused, !!error && styles.invalid]}>
        {icon && <Icon ios={icon.ios} android={icon.android} size={18} color={colors.textSubtle} />}
        <TextInput
          ref={ref}
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon
              ios={hidden ? 'eye' : 'eye.slash'}
              android={hidden ? 'visibility' : 'visibility_off'}
              size={20}
              color={colors.textSubtle}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : (
        helper && (
          <Text variant="caption" color="subtle">
            {helper}
          </Text>
        )
      )}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  wrapper: { gap: space.xs + 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: space.md + 2,
    backgroundColor: t.colors.surface,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    borderRadius: radius.md,
  },
  focused: { borderColor: t.colors.primary },
  invalid: { borderColor: t.colors.tones.danger.fg },
  input: { flex: 1, fontSize: 16, color: t.colors.text, paddingVertical: space.md },
}));
