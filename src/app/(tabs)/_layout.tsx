import { Tabs } from 'expo-router/tabs';
import { ColorValue } from 'react-native';
import { Icon, type AndroidSymbol, type IosSymbol } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

function tabIcon(ios: IosSymbol, android: AndroidSymbol) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon ios={ios} android={android} color={color} size={size} />;
  };
}

// Each role gets its own tabs:
//   management   Reservations · Housekeeping · Rooms · Account
//   housekeeper  Housekeeping · Rooms · Account
//   guest        Explore · Trips · Account
export default function TabsLayout() {
  const { canManage, isHousekeeper, isStaff } = useAuth();
  const { colors } = useTheme();

  return (
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
              ? { title: 'Reservations', tabBarLabel: 'Bookings', tabBarIcon: tabIcon('calendar', 'calendar_month') }
              : // Explore has its own big greeting instead of a header
                { title: 'Explore', headerShown: false, tabBarIcon: tabIcon('magnifyingglass', 'travel_explore') }
          }
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isStaff}>
        <Tabs.Screen
          name="housekeeping"
          options={{ title: 'Housekeeping', tabBarIcon: tabIcon('sparkles', 'cleaning_services') }}
        />
        <Tabs.Screen name="rooms" options={{ title: 'Rooms', tabBarIcon: tabIcon('bed.double', 'bed') }} />
      </Tabs.Protected>
      <Tabs.Protected guard={!isStaff}>
        <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: tabIcon('suitcase', 'luggage') }} />
      </Tabs.Protected>
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: tabIcon('person.crop.circle', 'account_circle') }}
      />
    </Tabs>
  );
}
