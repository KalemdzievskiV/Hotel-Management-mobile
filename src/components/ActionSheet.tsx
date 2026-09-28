import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, styles } from './ui';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * A list of choices sliding up from the bottom. Used instead of Alert where there can be more
 * than three options, which is all an Android alert can show.
 */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16 + insets.bottom,
          gap: 4,
        }}
      >
        <Text style={[styles.title, { fontSize: 18 }]}>{title}</Text>
        {message && <Text style={[styles.muted, { marginBottom: 4 }]}>{message}</Text>}
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => [
              { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={{ fontSize: 16, color: action.destructive ? colors.danger : colors.primary }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={{ fontSize: 16, color: colors.muted }}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
