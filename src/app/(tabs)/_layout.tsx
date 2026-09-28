import { Tabs } from 'expo-router/tabs';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors, Icon } from '@/components/ui';

function tabIcon(ios: ComponentProps<typeof Icon>['ios'], android: ComponentProps<typeof Icon>['android']) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon ios={ios} android={android} color={color} />;
  };
}

// Each role gets its own tabs:
//   management   Reservations · Housekeeping · Rooms · Account
//   housekeeper  Housekeeping · Rooms · Account
//   guest        My bookings · Hotels · Account
export default function TabsLayout() {
  const { canManage, isHousekeeper, isStaff } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Protected guard={!isHousekeeper}>
        <Tabs.Screen
          name="index"
          options={{
            title: canManage ? 'Reservations' : 'My bookings',
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
