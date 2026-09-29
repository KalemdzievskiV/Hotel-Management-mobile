import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  Badge,
  Button,
  Calendar,
  Card,
  Chip,
  Icon,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stepper,
  Text,
} from '@/components';
import { addDays, formatMoney, toDateParam } from '@/lib/format';
import { BookingType, RoomTypeLabels, type Hotel, type Room } from '@/lib/types';
import { makeStyles, radius, space, useTheme } from '@/theme';
import {
  describeSearch,
  MAX_GUESTS,
  nightsBetween,
  parseDay,
  searchProblem,
  SHORT_STAY_HOURS,
  stayPrice,
  type StaySearch,
} from './search';

/** The current search in one line; tapping it opens the search sheet */
export function SearchSummary({ search, onPress }: { search: StaySearch; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${describeSearch(search)}. Change dates or guests`}
      style={({ pressed }) => [styles.summary, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.summaryIcon}>
        <Icon
          ios={search.type === BookingType.ShortStay ? 'clock' : 'calendar'}
          android={search.type === BookingType.ShortStay ? 'schedule' : 'calendar_month'}
          size={18}
          color={colors.tones.primary.fg}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="subtle">
          {search.type === BookingType.ShortStay ? 'Short stay' : 'Overnight'}
        </Text>
        <Text variant="callout" weight="600" numberOfLines={2}>
          {describeSearch(search)}
        </Text>
      </View>
      <Icon ios="slider.horizontal.3" android="tune" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

// Start times offered for short stays
const START_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

/**
 * Edits a search: overnight or a few hours, the dates, and the number of guests. Changes are
 * kept as a draft until "Show rooms".
 */
export function SearchSheet({
  visible,
  search,
  onClose,
  onApply,
}: {
  visible: boolean;
  search: StaySearch;
  onClose: () => void;
  onApply: (search: StaySearch) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Your stay">
      {/* Mounted fresh each time the sheet opens, so the draft starts from the current search */}
      {visible && <SearchForm search={search} onApply={onApply} />}
    </Sheet>
  );
}

function SearchForm({ search, onApply }: { search: StaySearch; onApply: (search: StaySearch) => void }) {
  const { height } = useWindowDimensions();
  const [draft, setDraft] = useState(search);
  // A range being picked has a start but no end yet
  const [pickingEnd, setPickingEnd] = useState(false);
  const now = new Date();
  const today = toDateParam(now);
  const update = (change: Partial<StaySearch>) => setDraft((d) => ({ ...d, ...change }));
  const problem = pickingEnd ? 'Pick your check-out day' : searchProblem(draft, now);
  const nights = nightsBetween(draft.checkIn, draft.checkOut);

  const hours = START_HOURS.filter((h) => draft.checkIn !== today || h > now.getHours());

  return (
    <View style={{ gap: space.md }}>
      <ScrollView style={{ maxHeight: height * 0.62 }} contentContainerStyle={{ gap: space.lg }} bounces={false}>
        <SegmentedControl
          options={[
            { value: String(BookingType.Daily), label: 'Overnight' },
            { value: String(BookingType.ShortStay), label: 'A few hours' },
          ]}
          value={String(draft.type)}
          onChange={(value) => {
            setPickingEnd(false);
            const type = Number(value) as BookingType;
            // Keep a valid check-out when switching back to overnight
            update(
              type === BookingType.Daily && draft.checkOut <= draft.checkIn
                ? { type, checkOut: toDateParam(addDays(parseDay(draft.checkIn), 1)) }
                : { type }
            );
          }}
        />

        {draft.type === BookingType.Daily ? (
          <Calendar
            mode="range"
            start={draft.checkIn}
            end={pickingEnd ? null : draft.checkOut}
            min={today}
            onChange={(start, end) => {
              setPickingEnd(!end);
              update(end ? { checkIn: start, checkOut: end } : { checkIn: start });
            }}
          />
        ) : (
          <>
            <Calendar
              mode="single"
              start={draft.checkIn}
              min={today}
              onChange={(day) => {
                const startTime =
                  day === today && Number(draft.startTime.slice(0, 2)) <= now.getHours()
                    ? `${String(Math.min(23, now.getHours() + 1)).padStart(2, '0')}:00`
                    : draft.startTime;
                update({ checkIn: day, startTime });
              }}
            />
            <View style={{ gap: space.sm }}>
              <Text variant="callout" weight="500" color="muted">
                Arriving at
              </Text>
              {hours.length === 0 ? (
                <Text variant="callout" color="subtle">
                  No start times left today; pick another day.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                  {hours.map((hour) => {
                    const time = `${String(hour).padStart(2, '0')}:00`;
                    return (
                      <Chip
                        key={time}
                        label={time}
                        selected={draft.startTime === time}
                        onPress={() => update({ startTime: time })}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </View>
            <Stepper
              label="Hours"
              value={draft.hours}
              min={SHORT_STAY_HOURS.min}
              max={SHORT_STAY_HOURS.max}
              format={(h) => `${h} h`}
              onChange={(h) => update({ hours: h })}
            />
          </>
        )}

        <Stepper
          label="Guests"
          hint="Rooms that fit everyone"
          value={draft.guests}
          min={1}
          max={MAX_GUESTS}
          onChange={(guests) => update({ guests })}
        />
      </ScrollView>

      {problem ? (
        <Text variant="callout" color="subtle" align="center">
          {problem}
        </Text>
      ) : (
        draft.type === BookingType.Daily && (
          <Text variant="callout" color="muted" align="center">
            {nights} night{nights === 1 ? '' : 's'}
          </Text>
        )
      )}
      <Button title="Show rooms" disabled={!!problem} onPress={() => onApply(draft)} />
    </View>
  );
}

/** Stars as a small pill, e.g. ★ 4 */
export function Stars({ count }: { count: number }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.tones.warning.bg,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
      }}
      accessibilityLabel={`${count} star hotel`}
    >
      <Icon ios="star.fill" android="star" size={12} color={colors.tones.warning.fg} />
      <Text variant="caption" weight="700" color="warning">
        {count}
      </Text>
    </View>
  );
}

/**
 * A hotel in Explore, with what the current search finds there: "3 rooms from 90.00", or
 * that it's full.
 */
export function HotelCard({
  hotel,
  rooms,
  loading,
  search,
  onPress,
}: {
  hotel: Hotel;
  rooms?: Room[];
  loading: boolean;
  search: StaySearch;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const cheapest = rooms?.[0];
  const unit = search.type === BookingType.ShortStay ? 'total' : 'per night';
  const fromPrice =
    cheapest &&
    (search.type === BookingType.ShortStay
      ? stayPrice(cheapest, search)
      : (cheapest.pricePerNight ?? 0));

  return (
    <Card padded={false} onPress={onPress} style={{ overflow: 'hidden' }} accessibilityLabel={hotel.name}>
      <View style={styles.hero}>
        <Icon ios="building.2.fill" android="apartment" size={34} color={colors.tones.primary.fg} />
      </View>
      <View style={{ padding: space.lg, gap: space.xs }}>
        <View style={styles.titleRow}>
          <Text variant="headline" style={{ flexShrink: 1 }} numberOfLines={2}>
            {hotel.name}
          </Text>
          <Stars count={hotel.stars} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Icon ios="mappin.and.ellipse" android="location_on" size={14} color={colors.textSubtle} />
          <Text variant="callout" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {[hotel.city, hotel.country].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={[styles.titleRow, { marginTop: space.sm }]}>
          {loading ? (
            <Skeleton width={140} height={18} />
          ) : cheapest ? (
            <>
              <Badge label={`${rooms!.length} room${rooms!.length === 1 ? '' : 's'} free`} tone="success" dot />
              <Text variant="callout" color="muted">
                from{' '}
                <Text variant="headline" weight="700">
                  {formatMoney(fromPrice!)}
                </Text>{' '}
                {unit}
              </Text>
            </>
          ) : rooms ? (
            <Badge label="Full for these dates" tone="neutral" />
          ) : (
            <Text variant="callout" color="subtle">
              Tap to see rooms
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

/** One room that can be booked, with the price of the whole stay */
export function RoomOffer({ room, search, onPress }: { room: Room; search: StaySearch; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const total = stayPrice(room, search);
  const nights = nightsBetween(search.checkIn, search.checkOut);
  const rate =
    search.type === BookingType.ShortStay
      ? `${formatMoney(room.shortStayHourlyRate ?? 0)} / hour`
      : `${formatMoney(room.pricePerNight ?? 0)} / night`;
  const features = [
    room.bedType,
    room.areaSqM ? `${room.areaSqM} m²` : null,
    room.viewType ? (/view/i.test(room.viewType) ? room.viewType : `${room.viewType} view`) : null,
    room.hasBalcony ? 'Balcony' : null,
    room.hasBathtub ? 'Bathtub' : null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} accessibilityLabel={`${RoomTypeLabels[room.type]}, ${formatMoney(total)} in total`}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{RoomTypeLabels[room.type] ?? 'Room'}</Text>
          <Text variant="callout" color="muted">
            Room {room.roomNumber} · up to {room.capacity} guest{room.capacity === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(total)}
          </Text>
          <Text variant="caption" color="subtle">
            {search.type === BookingType.ShortStay ? `${search.hours} h` : `${nights} night${nights === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>
      {features.length > 0 && (
        <Text variant="callout" color="muted" numberOfLines={2} style={{ marginTop: space.xs }}>
          {features.join(' · ')}
        </Text>
      )}
      <View style={[styles.titleRow, { marginTop: space.sm }]}>
        <Text variant="caption" color="subtle">
          {rate}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="callout" weight="600" color="primary">
            Select
          </Text>
          <Icon ios="chevron.right" android="chevron_right" size={14} color={colors.primary} />
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: t.colors.tones.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 84,
    backgroundColor: t.colors.tones.primary.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
}));
