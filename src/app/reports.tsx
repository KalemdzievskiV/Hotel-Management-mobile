import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import {
  BarChart,
  Card,
  ErrorState,
  HotelLine,
  KpiCard,
  SectionHeader,
  SegmentedControl,
  SkeletonList,
  Text,
  useScreenStyles,
  WithHotel,
} from '@/components';
import { useTrend } from '@/features/dashboard/hooks';
import { parseDay } from '@/features/booking/search';
import { formatMoney, formatWholeMoney } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import type { DailyTrend, Hotel } from '@/lib/types';
import { space, useTheme } from '@/theme';

type Range = '7' | '14' | '30';

/** Reports-lite: money taken and occupancy over the last days. Full reports stay on the web. */
export default function ReportsScreen() {
  return <WithHotel>{(hotel) => <Reports hotel={hotel} />}</WithHotel>;
}

function dayOf(d: DailyTrend): Date {
  return parseDay(d.date.slice(0, 10));
}

function Reports({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const [range, setRange] = useState<Range>('7');
  const days = Number(range);
  const trend = useTrend(hotel.id, days);
  const pull = usePullToRefresh(trend.refetch);

  const data = trend.data ?? [];
  const revenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const occupancy = data.length ? data.reduce((sum, d) => sum + d.occupancyPercent, 0) / data.length : 0;
  // Short labels: weekdays for a week, day numbers for longer ranges
  const label = (d: DailyTrend) =>
    days <= 7 ? dayOf(d).toLocaleDateString(undefined, { weekday: 'short' }) : String(dayOf(d).getDate());
  const long = (d: DailyTrend) => dayOf(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView
      style={screen.screen}
      contentContainerStyle={screen.content}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <HotelLine />
      <SegmentedControl
        options={[
          { value: '7', label: '7 days' },
          { value: '14', label: '14 days' },
          { value: '30', label: '30 days' },
        ]}
        value={range}
        onChange={setRange}
      />

      {trend.isPending ? (
        <SkeletonList header={false} count={2} />
      ) : trend.error && !trend.data ? (
        <ErrorState message={errorText(trend.error)} onRetry={() => void trend.refetch()} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <KpiCard
              label="Taken"
              value={formatWholeMoney(revenue)}
              detail={`Last ${days} days`}
              tone="success"
              icon={{ ios: 'banknote', android: 'payments' }}
            />
            <KpiCard
              label="Avg occupancy"
              value={`${Math.round(occupancy)}%`}
              detail={`${data[data.length - 1]?.totalRooms ?? 0} rooms`}
              icon={{ ios: 'bed.double.fill', android: 'bed' }}
            />
          </View>

          <SectionHeader title="Money taken per day" />
          <Card>
            <BarChart
              key={`money-${range}`}
              bars={data.map((d) => ({ label: label(d), value: d.revenue, description: `${long(d)}: ${formatMoney(d.revenue)}` }))}
              format={formatWholeMoney}
            />
          </Card>

          <SectionHeader title="Rooms occupied per night" />
          <Card>
            <BarChart
              key={`rooms-${range}`}
              bars={data.map((d) => ({
                label: label(d),
                value: d.occupancyPercent,
                description: `${long(d)}: ${Math.round(d.occupancyPercent)}% (${d.occupiedRooms} of ${d.totalRooms})`,
              }))}
              format={(v) => `${Math.round(v)}%`}
              max={100}
            />
          </Card>

          <Text variant="caption" color="subtle" align="center">
            Payments less refunds, by the day they were taken. Tap a bar for its day. Full reports are on the website.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
