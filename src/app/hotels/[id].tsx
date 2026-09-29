import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  SectionHeader,
  Skeleton,
  SkeletonList,
  Text,
  useScreenStyles,
} from '@/components';
import type { AndroidSymbol, IosSymbol } from '@/components/Icon';
import { RoomOffer, SearchSheet, SearchSummary, Stars } from '@/features/booking/components';
import { useAvailableRooms } from '@/features/booking/hooks';
import { searchFromParams, searchProblem, searchToParams, type StaySearch } from '@/features/booking/search';
import { splitList, useHotelDetail } from '@/features/hotels/hooks';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import type { Hotel } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

export default function HotelScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  // The search lives in the route, so going back to Explore and in again keeps it
  const search = useMemo(() => searchFromParams(params), [params]);
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const hotel = useHotelDetail(id);
  const rooms = useAvailableRooms(id, search);
  const [editing, setEditing] = useState(false);
  const pull = usePullToRefresh(() => Promise.all([hotel.refetch(), rooms.refetch()]));

  if (hotel.isPending) return <SkeletonList count={3} header={false} />;
  if (!hotel.data) return <ErrorState message={errorText(hotel.error)} onRetry={() => void hotel.refetch()} />;
  const h = hotel.data;

  const setSearch = (next: StaySearch) => router.setParams(searchToParams(next));
  const problem = searchProblem(search);

  return (
    <>
      <Stack.Screen options={{ title: h.name }} />
      <ScrollView
        style={screen.screen}
        contentContainerStyle={screen.content}
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <HotelInfo hotel={h} />

        <SectionHeader title="Rooms" />
        <SearchSummary search={search} onPress={() => setEditing(true)} />

        {problem ? (
          <Text variant="callout" color="subtle">
            {problem}.
          </Text>
        ) : rooms.isPending ? (
          <Card style={{ gap: space.sm }}>
            <Skeleton width="50%" height={18} />
            <Skeleton width="70%" />
          </Card>
        ) : rooms.error && !rooms.data ? (
          <ErrorState message={errorText(rooms.error)} onRetry={() => void rooms.refetch()} />
        ) : rooms.data!.length === 0 ? (
          <EmptyState
            fill={false}
            icon={{ ios: 'bed.double', android: 'bed' }}
            title="No rooms free"
            message="Nothing is free here for these dates and guests. Try other dates."
            action={{ title: 'Change dates', onPress: () => setEditing(true) }}
          />
        ) : (
          rooms.data!.map((room) => (
            <RoomOffer
              key={room.id}
              room={room}
              search={search}
              onPress={() =>
                router.push({
                  pathname: '/book',
                  params: { hotelId: String(h.id), roomId: String(room.id), ...searchToParams(search) },
                })
              }
            />
          ))
        )}
      </ScrollView>
      <SearchSheet
        visible={editing}
        search={search}
        onClose={() => setEditing(false)}
        onApply={(next) => {
          setSearch(next);
          setEditing(false);
        }}
      />
    </>
  );
}

function HotelInfo({ hotel: h }: { hotel: Hotel }) {
  const { colors } = useTheme();
  const amenities = splitList(h.amenities);
  const address = [h.address, h.postalCode, h.city, h.country].filter(Boolean).join(', ');
  const openMap = () =>
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);

  return (
    <>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm }}>
          <Text variant="title" style={{ flex: 1 }}>
            {h.name}
          </Text>
          <Stars count={h.stars} />
        </View>
        {!!h.description && (
          <Text variant="body" color="muted">
            {h.description}
          </Text>
        )}
        <View style={{ gap: space.sm }}>
          <Fact icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }} text={address} onPress={openMap} />
          {h.checkInTime && h.checkOutTime && (
            <Fact
              icon={{ ios: 'clock', android: 'schedule' }}
              text={`Check-in from ${h.checkInTime.slice(0, 5)} · Check-out by ${h.checkOutTime.slice(0, 5)}`}
            />
          )}
          {!!h.phoneNumber && (
            <Fact
              icon={{ ios: 'phone', android: 'call' }}
              text={h.phoneNumber}
              onPress={() => void Linking.openURL(`tel:${h.phoneNumber!.replace(/[^\d+]/g, '')}`)}
            />
          )}
        </View>
      </Card>

      {amenities.length > 0 && (
        <>
          <SectionHeader title="Amenities" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {amenities.map((amenity) => (
              <View
                key={amenity}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  paddingHorizontal: space.md,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Icon ios="checkmark" android="check" size={13} color={colors.tones.success.fg} />
                <Text variant="callout">{amenity}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}

function Fact({
  icon,
  text,
  onPress,
}: {
  icon: { ios: IosSymbol; android: AndroidSymbol };
  text: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Icon ios={icon.ios} android={icon.android} size={17} color={colors.textMuted} />
      <Text
        variant="body"
        style={{ flex: 1, color: onPress ? colors.primary : colors.text }}
        onPress={onPress}
        accessibilityRole={onPress ? 'link' : undefined}
      >
        {text}
      </Text>
    </View>
  );
}
