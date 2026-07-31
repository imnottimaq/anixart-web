import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUser } from '../shared/contexts/userContext';
import { createWatchRoom, getPublicWatchRooms, type RoomVisibility, type WatchRoomState, WatchRoomSocket } from '../shared/watchRoom';
import type { Anime } from '../shared/types/api';
import { getRoomParticipant } from '../shared/roomParticipant';
import RemoteImage from '../components/RemoteImage';
import { useRoomPresence } from '../shared/contexts/roomContext';

type ParticipantProfile = { login: string; avatar: string | null };
import styles from './WatchRoomScreen.module.css';

export default function WatchRoomScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    return roomId ? <ConnectedRoom roomId={roomId} /> : <WatchRoomLobby />;
}

function WatchRoomLobby() {
    const navigate = useNavigate();
    const { userId } = useUser();
    const [title, setTitle] = useState('Совместный просмотр');
    const [visibility, setVisibility] = useState<RoomVisibility>('private');
    const [rooms, setRooms] = useState<Array<{ roomId: string; title: string; participants: number; media: WatchRoomState['media'] }>>([]);
    const [message, setMessage] = useState('');

    const loadRooms = async () => {
        try { setRooms((await getPublicWatchRooms()).rooms); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось загрузить комнаты'); }
    };

    useEffect(() => { void loadRooms(); }, []);

    const create = async () => {
        if (userId <= 0) return setMessage('Войдите в аккаунт, чтобы создать комнату');
        try {
            const room = await createWatchRoom({ title, visibility, host: getRoomParticipant(userId) });
            navigate(`/watch/${room.roomId}`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось создать комнату'); }
    };

    return <section className={styles.page}>
        <div className={styles.hero}><h1>Совместный просмотр <span className={styles.beta}>Бета</span></h1><p>Создай комнату, выбери серию и смотри синхронно с друзьями.</p></div>
        <div className={styles.grid}>
            <form className={styles.card} onSubmit={event => { event.preventDefault(); void create(); }}>
                <h2>Новая комната</h2>
                <label>Название<input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} /></label>
                <label>Доступ<select value={visibility} onChange={event => setVisibility(event.target.value as RoomVisibility)}><option value="private">Приватная — по ссылке</option><option value="public">Открытая — в каталоге</option></select></label>
                <button type="submit">Создать комнату</button>
            </form>
            <div className={styles.card}><div className={styles.cardHeading}><h2>Открытые комнаты</h2><button type="button" onClick={() => void loadRooms()}>Обновить</button></div>
                {rooms.length === 0 ? <p className={styles.muted}>Сейчас здесь пусто.</p> : <div className={styles.rooms}>{rooms.map(room => <Link key={room.roomId} to={`/watch/${room.roomId}`}><strong>{room.title}</strong><span>{room.media?.releaseName ?? 'Серия ещё не выбрана'} · {room.participants} чел.</span></Link>)}</div>}
            </div>
        </div>
        {message && <p className={styles.error}>{message}</p>}
    </section>;
}

function ConnectedRoom({ roomId }: { roomId: string }) {
    const navigate = useNavigate();
    const { userId, userToken } = useUser();
    const { setActiveRoomId } = useRoomPresence();
    const socketRef = useRef(new WatchRoomSocket());
    const [room, setRoom] = useState<WatchRoomState | null>(null);
    const [message, setMessage] = useState('Подключаемся к комнате…');
    const [releaseQuery, setReleaseQuery] = useState('');
    const [releaseResults, setReleaseResults] = useState<Anime[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [participantProfiles, setParticipantProfiles] = useState<Record<number, ParticipantProfile>>({});
    const isController = useMemo(() => Boolean(room?.participants.find(item => item.profileId === userId)?.canControl), [room, userId]);

    useEffect(() => { setActiveRoomId(roomId); }, [roomId, setActiveRoomId]);

    useEffect(() => {
        if (userId <= 0) { setMessage('Войдите в аккаунт, чтобы подключиться к комнате'); return; }
        socketRef.current.connect(roomId, getRoomParticipant(userId), state => { setRoom(state); setMessage(''); }, setMessage);
        const interval = window.setInterval(() => socketRef.current.send({ type: 'sync_request' }), 15_000);
        return () => { window.clearInterval(interval); socketRef.current.disconnect(); };
    }, [roomId, userId]);

    useEffect(() => {
        if (!room?.media) return;
        navigate(roomMediaUrl(roomId, room.media), { replace: true });
    }, [navigate, room?.media, roomId]);

    useEffect(() => {
        if (!room?.participants.length) return;
        let cancelled = false;
        const missingIds = room.participants
            .map(participant => participant.profileId)
            .filter(profileId => !participantProfiles[profileId]);
        if (!missingIds.length) return;

        void Promise.all(missingIds.map(async profileId => {
            // Public profiles do not require a token. This also lets the room
            // resolve names when the saved login token has not loaded yet.
            const response = await fetch(`https://api-s.anixsekai.com/profile/${profileId}`);
            if (!response.ok) return null;
            const data = await response.json() as { profile?: { login?: string; avatar?: string | null } };
            return data.profile?.login ? [profileId, { login: data.profile.login, avatar: data.profile.avatar ?? null }] as const : null;
        })).then(results => {
            if (cancelled) return;
            const loaded = Object.fromEntries(results.filter((item): item is readonly [number, ParticipantProfile] => item !== null));
            if (Object.keys(loaded).length) setParticipantProfiles(previous => ({ ...previous, ...loaded }));
        }).catch(error => console.error('Не удалось загрузить профили участников:', error));

        return () => { cancelled = true; };
    }, [participantProfiles, room?.participants]);

    useEffect(() => {
        const query = releaseQuery.trim();
        if (!isController || room?.media || query.length < 2) {
            setReleaseResults([]);
            return;
        }

        const timeout = window.setTimeout(() => {
            setIsSearching(true);
            searchReleases(query, userToken)
                .then(setReleaseResults)
                .catch(error => setMessage(error instanceof Error ? error.message : 'Не удалось выполнить поиск'))
                .finally(() => setIsSearching(false));
        }, 350);
        return () => window.clearTimeout(timeout);
    }, [isController, releaseQuery, room?.media, userToken]);

    const grant = (profileId: number, canControl: boolean) => socketRef.current.send({ type: canControl ? 'grant_control' : 'revoke_control', profileId });
    return <section className={styles.page}>
        <Link className={styles.back} to="/watch">← Все комнаты</Link>
        <div className={styles.roomHeader}><div><h1>{room?.title ?? 'Комната'}</h1><p>{room?.visibility === 'private' ? 'Приватная комната' : 'Открытая комната'}</p></div><button type="button" onClick={() => navigator.clipboard.writeText(window.location.href)}>Скопировать ссылку</button></div>
        <div className={styles.grid}>
            <div className={styles.card}><h2>Сейчас смотрим</h2>{room?.media ? <><strong>{room.media.releaseName}</strong><p>{room.media.episodeName}</p><Link className={styles['open-release']} to={`/anime/${room.media.releaseId}?room=${encodeURIComponent(roomId)}`}>Открыть релиз</Link></> : isController ? <><p className={styles.muted}>Найди релиз, затем выбери озвучку и серию. После этого выбор автоматически попадёт всем в комнату.</p><label className={styles['search-label']}>Поиск аниме<input autoFocus value={releaseQuery} placeholder="Название аниме" onChange={event => setReleaseQuery(event.target.value)} /></label>{isSearching && <p className={styles.muted}>Ищем…</p>}{releaseQuery.trim().length >= 2 && !isSearching && <div className={styles['release-results']}>{releaseResults.length ? releaseResults.map(release => <Link key={release.id} to={`/anime/${release.id}?room=${encodeURIComponent(roomId)}`} state={{ partialAnime: release }}><strong>{release.title_ru}</strong><span>{release.year || 'Год неизвестен'} · {release.episodes_released || 0} эп.</span></Link>) : <p className={styles.muted}>Ничего не найдено.</p>}</div>}</> : <p className={styles.muted}>Ожидаем, пока хост выберет серию.</p>}</div>
            <div className={styles.card}><h2>Участники ({room?.participants.length ?? 0})</h2><div className={styles.participants}>{room?.participants.map(participant => {
                const profile = participantProfiles[participant.profileId];
                const login = profile?.login ?? participant.login;
                const avatar = profile?.avatar ?? participant.avatar;
                return <div key={participant.profileId}><span className={styles.participant}><span className={styles.avatar}>{avatar ? <RemoteImage src={avatar} alt="" /> : login[0]?.toUpperCase()}</span><span>{login}{participant.profileId === room.hostId ? ' · хост' : ''}</span></span>{room?.visibility === 'public' && userId === room.hostId && participant.profileId !== userId && <button type="button" onClick={() => grant(participant.profileId, !participant.canControl)}>{participant.canControl ? 'Забрать управление' : 'Разрешить управление'}</button>}</div>;
            })}</div></div>
        </div>
        {message && <p className={styles.error}>{message}</p>}
    </section>;
}

async function searchReleases(query: string, token: string): Promise<Anime[]> {
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const response = await fetch(`https://api-s.anixsekai.com/search/releases/0${tokenQuery}`, {
        method: 'POST',
        headers: { 'Api-Version': 'v2', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, searchBy: 0 }),
    });
    if (!response.ok) throw new Error(`Ошибка поиска: ${response.status}`);
    const data = await response.json() as { code: number; releases?: Anime[]; content?: Anime[] };
    if (data.code !== 0) throw new Error(`Ошибка поиска: ${data.code}`);
    return data.releases ?? data.content ?? [];
}

function roomMediaUrl(roomId: string, media: NonNullable<WatchRoomState['media']>) {
    const params = new URLSearchParams({
        room: roomId,
        dub: String(media.dubId),
        source: String(media.sourceId),
        episode: String(media.episode),
    });
    return `/anime/${media.releaseId}?${params.toString()}`;
}
