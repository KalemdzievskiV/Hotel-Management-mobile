import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useState } from 'react';
import { ColorValue, Pressable, View } from 'react-native';
import { ActionSheet } from '@/components';
import { Icon, type AndroidSymbol, type IosSymbol } from '@/components/Icon';
import { NewTaskSheet } from '@/features/housekeeping/components';
import { useAuth } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useHotel } from '@/lib/hotel';
import { radius, useTheme } from '@/theme';

// iOS can't show one sheet while another is still sliding away
const SHEET_CLOSE_MS = 250;

function tabIcon(ios: IosSymbol, android: AndroidSymbol) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon ios={ios} android={android} color={color} size={size} />;
  };
}

// Each role gets its own tabs:
//   management   Today · Bookings · ＋ · Rooms · More
//   housekeeper  Housekeeping · Rooms · Account
//   guest        Explore · Trips · Account
export default function TabsLayout() {
  const { canManage, isHousekeeper, isStaff } = useAuth();
  const { hotel } = useHotel();
  const { colors } = useTheme();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [newTask, setNewTask] = useState(false);

  return (
    <>
      <Tabs
        screenListeners={{ tabPress: () => haptics.selection() }}
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Protected guard={!isHousekeeper}>
          <Tabs.Screen
            name="index"
            options={
              canManage
                ? { title: 'Today', tabBarIcon: tabIcon('sun.max', 'today') }
                : // Explore has its own big greeting instead of a header
                  { title: 'Explore', headerShown: false, tabBarIcon: tabIcon('magnifyingglass', 'travel_explore') }
            }
          />
        </Tabs.Protected>
        <Tabs.Protected guard={canManage}>
          <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: tabIcon('calendar', 'calendar_month') }} />
          <Tabs.Screen
            name="new"
            options={{
              title: 'New',
              tabBarAccessibilityLabel: 'New: walk-in, booking, payment or task',
              tabBarButton: ({ onPress, style }) => (
                <Pressable onPress={onPress} style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: -6,
                    }}
                  >
                    <Icon ios="plus" android="add" size={26} color={colors.onPrimary} />
                  </View>
                </Pressable>
              ),
            }}
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                haptics.tap();
                setActionsOpen(true);
              },
            }}
          />
        </Tabs.Protected>
        {/* Managers reach housekeeping from Today and More */}
        <Tabs.Protected guard={isHousekeeper}>
          <Tabs.Screen
            name="housekeeping"
            options={{ title: 'Housekeeping', tabBarIcon: tabIcon('sparkles', 'cleaning_services') }}
          />
        </Tabs.Protected>
        <Tabs.Protected guard={isStaff}>
          <Tabs.Screen name="rooms" options={{ title: 'Rooms', tabBarIcon: tabIcon('bed.double', 'bed') }} />
        </Tabs.Protected>
        <Tabs.Protected guard={!isStaff}>
          <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: tabIcon('suitcase', 'luggage') }} />
        </Tabs.Protected>
        <Tabs.Screen
          name="account"
          options={
            canManage
              ? { title: 'More', tabBarIcon: tabIcon('ellipsis.circle', 'more_horiz') }
              : { title: 'Account', tabBarIcon: tabIcon('person.crop.circle', 'account_circle') }
          }
        />
      </Tabs>

      {canManage && (
        <>
          <ActionSheet
            visible={actionsOpen}
            onClose={() => setActionsOpen(false)}
            title="New"
            actions={[
              { label: 'Walk-in check-in', icon: { ios: 'figure.walk', android: 'directions_walk' }, onPress: () => router.push('/walk-in') },
              { label: 'New reservation', icon: { ios: 'calendar.badge.plus', android: 'event' }, onPress: () => router.push('/reservations/new') },
              { label: 'Record payment', icon: { ios: 'creditcard', android: 'payments' }, onPress: () => router.push('/record-payment') },
              { label: 'Housekeeping task', icon: { ios: 'sparkles', android: 'cleaning_services' }, onPress: () => setTimeout(() => setNewTask(true), SHEET_CLOSE_MS) },
            ]}
          />
          {hotel && <NewTaskSheet hotelId={hotel.id} visible={newTask} onClose={() => setNewTask(false)} />}
        </>
      )}
    </>
  );
}
