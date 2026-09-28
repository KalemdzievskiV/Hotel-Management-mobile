import { FlatList, RefreshControl, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { ErrorMessage, Loading, styles } from '@/components/ui';

export default function HotelsScreen() {
  const { data, error, loading, refreshing, refresh } = useApi(api.hotels);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={data ?? []}
      keyExtractor={(hotel) => String(hotel.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No hotels yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>
            {item.name} {'★'.repeat(item.stars)}
          </Text>
          <Text style={styles.muted}>
            {item.address}, {item.city}, {item.country}
          </Text>
          {item.checkInTime && item.checkOutTime && (
            <Text style={styles.muted}>
              Check-in {item.checkInTime.slice(0, 5)} · Check-out {item.checkOutTime.slice(0, 5)}
            </Text>
          )}
          {item.phoneNumber && <Text style={styles.muted}>{item.phoneNumber}</Text>}
        </View>
      )}
    />
  );
}
