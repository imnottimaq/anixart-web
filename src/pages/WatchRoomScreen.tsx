import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUser } from '../shared/contexts/userContext';
import { createWatchRoom, getPublicWatchRooms, type RoomVisibility, type WatchRoomState, WatchRoomSocket } from '../shared/watchRoom';
import styles from './WatchRoomScreen.module.css';

export default function WatchRoomScreen() {
    const { roomId } = useParams<{ roomId: string }>();
    return roomId ? <ConnectedRoom roomId={roomId} /> : <WatchRoomLobby />;
}

function participantFromUser(userId: number) {
    return { profileId: userId, login: `User ${userId}` };
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
            const room = await createWatchRoom({ title, visibility, host: participantFromUser(userId) });
            navigate(`/watch/${room.roomId}`);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось создать комнату'); }
    };

    return <section className={styles.page}>
        <div className={styles.hero}><h1>Совместный просмотр</h1><p>Создай комнату, выбери серию и смотри синхронно с друзьями.</p></div>
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
    const { userId } = useUser();
    const socketRef = useRef(new WatchRoomSocket());
    const [room, setRoom] = useState<WatchRoomState | null>(null);
    const [message, setMessage] = useState('Подключаемся к комнате…');
    const [releaseId, setReleaseId] = useState('');
    const isController = useMemo(() => Boolean(room?.participants.find(item => item.profileId === userId)?.canControl), [room, userId]);

    useEffect(() => {
        if (userId <= 0) { setMessage('Войдите в аккаунт, чтобы подключиться к комнате'); return; }
        socketRef.current.connect(roomId, participantFromUser(userId), state => { setRoom(state); setMessage(''); }, setMessage);
        const interval = window.setInterval(() => socketRef.current.send({ type: 'sync_request' }), 15_000);
        return () => { window.clearInterval(interval); socketRef.current.disconnect(); };
    }, [roomId, userId]);

    const grant = (profileId: number, canControl: boolean) => socketRef.current.send({ type: canControl ? 'grant_control' : 'revoke_control', profileId });
    return <section className={styles.page}>
        <Link className={styles.back} to="/watch">← Все комнаты</Link>
        <div className={styles.roomHeader}><div><h1>{room?.title ?? 'Комната'}</h1><p>{room?.visibility === 'private' ? 'Приватная комната' : 'Открытая комната'}</p></div><button type="button" onClick={() => navigator.clipboard.writeText(window.location.href)}>Скопировать ссылку</button></div>
        <div className={styles.grid}>
            <div className={styles.card}><h2>Сейчас смотрим</h2>{room?.media ? <><strong>{room.media.releaseName}</strong><p>{room.media.episodeName}</p><Link className={styles['open-release']} to={`/anime/${room.media.releaseId}?room=${encodeURIComponent(roomId)}`}>Открыть релиз</Link></> : isController ? <><p className={styles.muted}>Выбери релиз, затем озвучку и серию — плеер сам передаст выбор комнате.</p><div className={styles['release-picker']}><input value={releaseId} inputMode="numeric" placeholder="ID релиза" onChange={event => setReleaseId(event.target.value)} /><Link className={styles['open-release']} to={releaseId.trim() ? `/anime/${releaseId.trim()}?room=${encodeURIComponent(roomId)}` : '#'} onClick={event => { if (!releaseId.trim()) event.preventDefault(); }}>Выбрать релиз</Link></div></> : <p className={styles.muted}>Ожидаем, пока хост выберет серию.</p>}</div>
            <div className={styles.card}><h2>Участники ({room?.participants.length ?? 0})</h2><div className={styles.participants}>{room?.participants.map(participant => <div key={participant.profileId}><span>{participant.login}{participant.profileId === room.hostId ? ' · хост' : ''}</span>{room?.visibility === 'public' && userId === room.hostId && participant.profileId !== userId && <button type="button" onClick={() => grant(participant.profileId, !participant.canControl)}>{participant.canControl ? 'Забрать управление' : 'Разрешить управление'}</button>}</div>)}</div></div>
        </div>
        {message && <p className={styles.error}>{message}</p>}
    </section>;
}
