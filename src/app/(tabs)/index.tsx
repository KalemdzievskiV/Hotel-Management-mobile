import { WithHotel } from '@/components';
import { ExploreScreen } from '@/features/booking/ExploreScreen';
import { TodayScreen } from '@/features/dashboard/TodayScreen';
import { useAuth } from '@/lib/auth';

// The first tab: Today for management, Explore for guests (housekeepers don't get this tab)
export default function HomeScreen() {
  const { canManage } = useAuth();
  return canManage ? <WithHotel>{(hotel) => <TodayScreen hotel={hotel} />}</WithHotel> : <ExploreScreen />;
}
