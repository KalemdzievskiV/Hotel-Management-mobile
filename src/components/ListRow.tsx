import { Pressable, View } from 'react-native';
import { makeStyles, space, useTheme } from '@/theme';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

/** A tappable row inside a card, like a settings entry: icon, title, optional detail, chevron */
export function ListRow({
  icon,
  title,
  detail,
  onPress,
  first,
}: {
  icon: { ios: IosSymbol; android: AndroidSymbol };
  title: string;
  detail?: string;
  onPress: () => void;
  /** No divider above the first row */
  first?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Icon ios={icon.ios} android={icon.android} size={20} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="500">
          {title}
        </Text>
        {detail && (
          <Text variant="caption" color="subtle" numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.textSubtle} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.border },
}));
