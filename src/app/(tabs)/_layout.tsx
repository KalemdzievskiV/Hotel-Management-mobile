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
//   guest        My bookings · Hotels · Account
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
          options={{
            title: canManage ? 'Reservations' : 'My bookings',
            tabBarLabel: canManage ? 'Bookings' : 'Trips',
            tabBarIcon: tabIcon('calendar', 'calendar_month'),
          }}
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
        <Tabs.Screen name="hotels" options={{ title: 'Hotels', tabBarIcon: tabIcon('building.2', 'apartment') }} />
      </Tabs.Protected>
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: tabIcon('person.crop.circle', 'account_circle') }}
      />
    </Tabs>
  );
}
