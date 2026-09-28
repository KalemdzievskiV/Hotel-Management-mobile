import { request } from '@/lib/http';
import type { Room, RoomStatus } from '@/lib/types';

export const roomsApi = {
  forHotel: (hotelId: number) => request<Room[]>('GET', `/Rooms/hotel/${hotelId}`),
  setStatus: (id: number, status: RoomStatus) => request<Room>('PATCH', `/Rooms/${id}/status`, { status }),
  // Sets the room to Available and records the cleaning time
  markCleaned: (id: number) => request<unknown>('POST', `/Rooms/${id}/clean`),
};
