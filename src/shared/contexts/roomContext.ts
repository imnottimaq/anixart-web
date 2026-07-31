import { createContext, useContext } from 'react';

type RoomContextValue = {
    activeRoomId: string | null;
    setActiveRoomId: (roomId: string | null) => void;
};

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomPresence() {
    const context = useContext(RoomContext);
    if (!context) throw new Error('useRoomPresence failed');
    return context;
}
