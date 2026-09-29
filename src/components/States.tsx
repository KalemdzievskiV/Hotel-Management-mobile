import { ActivityIndicator, View } from 'react-native';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Button } from './Button';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

/** A centered spinner, for the moment before the app knows who's signed in */
export function LoadingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/** A friendly note for a screen or list with nothing to show, with an optional way forward */
export function EmptyState({
  icon = { ios: 'tray', android: 'inbox' },
  title,
  message,
  action,
  fill = true,
}: {
  icon?: { ios: IosSymbol; android: AndroidSymbol };
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
  /** False inside a list, where it shouldn't stretch to the whole screen */
  fill?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[fill ? styles.center : styles.inline]}>
      <View style={styles.iconCircle}>
        <Icon ios={icon.ios} android={icon.android} size={28} color={colors.textMuted} />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="callout" color="muted" align="center" style={{ maxWidth: 300 }}>
          {message}
        </Text>
      )}
      {action && <Button title={action.title} onPress={action.onPress} variant="secondary" size="sm" style={styles.action} />}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={{ ios: 'exclamationmark.triangle', android: 'error' }}
      title="Couldn't load this"
      message={message}
      action={onRetry ? { title: 'Try again', onPress: onRetry } : undefined}
    />
  );
}

const useStyles = makeStyles((t) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.sm,
    backgroundColor: t.colors.bg,
  },
  inline: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.sm },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: t.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  action: { alignSelf: 'center', marginTop: space.sm },
}));

/** Why a form couldn't be sent, shown above its button */
export function FormError({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: space.sm,
        alignItems: 'center',
        backgroundColor: colors.tones.danger.bg,
        borderRadius: radius.md,
        padding: space.md,
      }}
    >
      <Icon ios="exclamationmark.circle" android="error" size={18} color={colors.tones.danger.fg} />
      <Text variant="callout" color="danger" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}
