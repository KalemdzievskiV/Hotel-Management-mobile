import { View } from 'react-native';
import { Icon, Text } from '@/components';
import { space, useTheme } from '@/theme';
import { PASSWORD_RULES } from './api';

/** The password rules, each ticked off as it's met */
export function PasswordRules({ password }: { password: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }} accessibilityLabel="Password rules">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
            <Icon
              ios={met ? 'checkmark.circle.fill' : 'circle'}
              android={met ? 'check_circle' : 'radio_button_unchecked'}
              size={15}
              color={met ? colors.tones.success.fg : colors.textSubtle}
            />
            <Text variant="caption" color={met ? 'success' : 'subtle'} accessibilityLabel={`${rule.label}, ${met ? 'done' : 'not yet'}`}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
