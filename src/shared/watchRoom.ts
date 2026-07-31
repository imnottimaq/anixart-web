export type RoomVisibility = 'private' | 'public';

export type RoomParticipant = {
    profileId: number;
    login: string;
    avatar?: string | null;
    canControl: boolean;
};

export type RoomMedia = {
    releaseId: number;
    releaseName: string;
    dubId: number;
    sourceId: number;
    episode: number;
    episodeName: string;
};

export type WatchRoomState = {
    roomId: string;
    visibility: RoomVisibility;
    hostId: number;
    title: string;
    media: RoomMedia | null;
    playback: { position: number; paused: boolean; rate: number; updatedAt: number };
    participants: RoomParticipant[];
};

export type RoomMessage =
    | { type: 'join'; participant: Omit<RoomParticipant, 'canControl'> }
    | { type: 'sync_request' }
    | { type: 'leave' }
    | { type: 'set_media'; media: RoomMedia }
    | { type: 'play' | 'pause' | 'seek'; position: number }
    | { type: 'set_rate'; position: number; rate: number }
    | { type: 'grant_control' | 'revoke_control'; profileId: number };

const ROOM_SERVER_URL = (import.meta.env.VITE_ROOM_SERVER_URL || 'http://localhost:8787').replace(/\/$/, '');

export function getRoomServerUrl() {
    return ROOM_SERVER_URL;
}

export function getRoomWebSocketUrl(roomId: string) {
    const url = new URL(`${ROOM_SERVER_URL}/rooms/${roomId}/ws`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
}

export async function createWatchRoom(input: { title: string; visibility: RoomVisibility; host: Omit<RoomParticipant, 'canControl'> }) {
    const response = await fetch(`${ROOM_SERVER_URL}/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Не удалось создать комнату: ${response.status}`);
    return response.json() as Promise<{ roomId: string; state: WatchRoomState }>;
}

export async function getPublicWatchRooms() {
    const response = await fetch(`${ROOM_SERVER_URL}/rooms`);
    if (!response.ok) throw new Error(`Не удалось загрузить комнаты: ${response.status}`);
    return response.json() as Promise<{ rooms: Array<Pick<WatchRoomState, 'roomId' | 'title' | 'hostId' | 'media'> & { participants: number }>; cursor: string | null }>;
}

export async function getWatchRoomProfile(profileId: number) {
    const response = await fetch(`${ROOM_SERVER_URL}/profiles/${profileId}`);
    if (!response.ok) return null;
    return response.json() as Promise<{ profile?: { login?: string; avatar?: string | null } }>;
}

export class WatchRoomSocket {
    private socket: WebSocket | null = null;

    connect(roomId: string, participant: Omit<RoomParticipant, 'canControl'>, onState: (state: WatchRoomState) => void, onError: (message: string) => void) {
        this.disconnect();
        const socket = new WebSocket(getRoomWebSocketUrl(roomId));
        this.socket = socket;
        socket.addEventListener('open', () => this.send({ type: 'join', participant }));
        socket.addEventListener('message', event => {
            try {
                const message = JSON.parse(String(event.data)) as { type: string; state?: WatchRoomState; message?: string };
                if (message.type === 'room_state' && message.state) onState(message.state);
                if (message.type === 'error' && message.message) onError(message.message);
            } catch {
                onError('Сервер отправил некорректное сообщение');
            }
        });
        socket.addEventListener('error', () => onError('Не удалось подключиться к комнате'));
    }

    send(message: RoomMessage) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    }

    disconnect() {
        this.socket?.close(1000, 'Closed by client');
        this.socket = null;
    }
}
