import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Hls, {
    XhrLoader,
    type FragmentLoaderConstructor,
    type LoaderCallbacks,
    type LoaderConfiguration,
    type LoaderContext,
} from 'hls.js';
import styles from './PlayerScreen.module.css';
import { useSettings } from '../shared/contexts/settingsContext';
import { useUser } from '../shared/contexts/userContext';
import { clearPlayerSession, getPlayerSession, setPlayerSession, type PlayerSession } from '../shared/playerSession';
import { getWatchProgress, saveWatchProgress } from '../shared/watchProgress';
import { extractVideoLinks } from '../utils/LinkParser';
import { canUseAnime4KVideo, checkAnime4KVideoSupport } from '../shared/anime4kSupport';
import { useTranslation } from '../shared/useTranslation';
import { type WatchRoomState, WatchRoomSocket } from '../shared/watchRoom';
import { getRoomParticipant } from '../shared/roomParticipant';
import { useRoomPresence } from '../shared/contexts/roomContext';

import PlayIcon from '../assets/icons/play.svg';
import PauseIcon from '../assets/icons/pause.svg';
import PrevIcon from '../assets/icons/video-prev.svg';
import NextIcon from '../assets/icons/video-next.svg';
import BackIcon from '../assets/icons/arrow-left.svg';
import SkipIcon from '../assets/icons/chevron-right.svg';
import MinimizeIcon from '../assets/icons/expand.svg';
import MaximizeIcon from '../assets/icons/compress.svg';
import SettingsIcon from '../assets/icons/gear.svg';
import VolumeMaxIcon from '../assets/icons/volume-max.svg';
import VolumeMuteIcon from '../assets/icons/volume-xmark.svg';

const HLS_MIME_TYPE = 'application/x-mpegURL';
const STREAM_PROXY_BASE = 'https://kodik-proxy.imnottimaq.workers.dev/corsproxy?url=';
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const ASPECT_RATIOS = {
    original: null,
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '21:9': 21 / 9,
} as const;

type AspectRatio = keyof typeof ASPECT_RATIOS;

/**
 * Fragments are normally loaded straight from the CDN. If an individual
 * request fails specifically as a CORS/network error (XHR status 0), retry
 * only that fragment through the Worker once.
 */
class CorsFallbackFragmentLoader extends XhrLoader {
    override load(context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>) {
        let triedProxy = false;

        const loadWithProxy = () => {
            const proxiedContext = {
                ...context,
                url: `${STREAM_PROXY_BASE}${encodeURIComponent(context.url)}`,
            };

            super.load(proxiedContext, config, {
                ...callbacks,
                onSuccess: (response, stats, _context, networkDetails) => {
                    response.url = context.url;
                    callbacks.onSuccess(response, stats, context, networkDetails);
                },
                onError: (error, _context, networkDetails, stats) => callbacks.onError(error, context, networkDetails, stats),
                onTimeout: (stats, _context, networkDetails) => callbacks.onTimeout(stats, context, networkDetails),
            });
        };

        super.load(context, config, {
            ...callbacks,
            onError: (error, errorContext, networkDetails, stats) => {
                if (!triedProxy && error.code === 0) {
                    triedProxy = true;
                    loadWithProxy();
                    return;
                }
                callbacks.onError(error, errorContext, networkDetails, stats);
            },
        });
    }
}

export default function PlayerScreen() {
    const [playerSession, setCurrentPlayerSession] = useState(getPlayerSession);
    const [searchParams] = useSearchParams();

    if (!playerSession) return <Navigate to="/" replace />;

    const updateSession = (nextSession: PlayerSession) => {
        setPlayerSession(nextSession);
        setCurrentPlayerSession(nextSession);
    };

    return <PlayerContent playerSession={playerSession} onSessionChange={updateSession} roomId={searchParams.get('room')} />;
}

function PlayerContent({ playerSession, onSessionChange, roomId }: { playerSession: PlayerSession; onSessionChange: (session: PlayerSession) => void; roomId: string | null }) {
    const navigate = useNavigate();
    const { settings, setSettings } = useSettings();
    const { t } = useTranslation();
    const { userToken, userId } = useUser();
    const { setActiveRoomId } = useRoomPresence();
    const playerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const upscaleCanvasRef = useRef<HTMLCanvasElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const { sources, animeId, animeName, episodeNumber, episodeName } = playerSession;
    const qualities = useMemo(
        () => Object.keys(sources).sort((a, b) => (Number(b) || 0) - (Number(a) || 0)),
        [sources]
    );
    const configuredQuality = settings.player.defaultQuality ?? 'auto';
    // This is deliberately local to the current player session. A broken CDN
    // stream should not silently overwrite the quality selected in settings.
    const [fallbackQuality, setFallbackQuality] = useState<string | null>(null);
    const requestedQuality = fallbackQuality ?? configuredQuality;
    const selectedQuality = requestedQuality !== 'auto' && sources[requestedQuality]?.[0]
        ? requestedQuality
        : qualities[0];
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVolumeDivExpanded, setIsVolumeDivExpanded] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedTime, setBufferedTime] = useState(0);
    const [volume, setVolume] = useState(settings.player.volume / 100);
    const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original');
    const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const [upscalerReadyKey, setUpscalerReadyKey] = useState<string | null>(null);
    const [isEpisodeChanging, setIsEpisodeChanging] = useState(false);
    const [shouldPlayNextEpisode, setShouldPlayNextEpisode] = useState(false);
    const [resumePromptTime, setResumePromptTime] = useState<number | null>(null);
    const [streamError, setStreamError] = useState<string | null>(null);
    const promptedEpisodesRef = useRef(new Set<string>());
    const fallbackPositionRef = useRef<{ time: number; shouldPlay: boolean } | null>(null);
    const roomSocketRef = useRef(new WatchRoomSocket());
    const applyingRoomStateRef = useRef(false);
    const [watchRoom, setWatchRoom] = useState<WatchRoomState | null>(null);
    const [areControlsVisible, setAreControlsVisible] = useState(true);
    const [webGpuStatus, setWebGpuStatus] = useState<'checking' | 'supported' | 'unsupported'>(() => (
        canUseAnime4KVideo() ? 'checking' : 'unsupported'
    ));

    const stream = sources[selectedQuality]?.[0];

    useEffect(() => { if (roomId) setActiveRoomId(roomId); }, [roomId, setActiveRoomId]);
    const timelineProgress = Number.isFinite(duration) && duration > 0
        ? Math.min((currentTime / duration) * 100, 100)
        : 0;
    const bufferedProgress = Number.isFinite(duration) && duration > 0
        ? Math.max(timelineProgress, Math.min((bufferedTime / duration) * 100, 100))
        : 0;
    const episodeKey = String(episodeNumber ?? 'unknown');
    const progressKey = `${animeId}:${episodeKey}`;
    const currentEpisodeIndex = playerSession.episodes?.findIndex(episode => episode.position === episodeNumber) ?? -1;
    const previousEpisode = currentEpisodeIndex > 0 ? playerSession.episodes?.[currentEpisodeIndex - 1] : undefined;
    const nextEpisode = currentEpisodeIndex >= 0 ? playerSession.episodes?.[currentEpisodeIndex + 1] : undefined;
    const ratioValue = ASPECT_RATIOS[aspectRatio];
    const upscalerKey = `${stream?.src ?? ''}:${settings.player.qualityUpgradeMode}`;
    const isUpscalerReady = settings.player.qualityUpgrade && upscalerReadyKey === upscalerKey;
    const videoFrameStyle = ratioValue
        ? {
            width: Math.min(viewport.width, viewport.height * ratioValue),
            height: Math.min(viewport.height, viewport.width / ratioValue),
        }
        : undefined;

    const saveEpisodeTime = useCallback(() => {
        const video = videoRef.current;
        if (!settings.content.rememberEpisodeTime || !video || !Number.isFinite(video.currentTime)) return;

        saveWatchProgress(animeId, episodeKey, video.ended ? -1 : Math.floor(video.currentTime));
    }, [animeId, episodeKey, settings.content.rememberEpisodeTime]);

    const sendRoomPlayback = useCallback((type: 'play' | 'pause' | 'seek' | 'set_rate', position: number, rate?: number) => {
        if (!roomId || applyingRoomStateRef.current) return;
        const canControl = watchRoom?.participants.some(participant => participant.profileId === userId && participant.canControl);
        if (!canControl) return;
        if (type === 'set_rate') roomSocketRef.current.send({ type, position, rate: rate ?? 1 });
        else roomSocketRef.current.send({ type, position });
    }, [roomId, userId, watchRoom]);

    useEffect(() => {
        if (!roomId || userId <= 0) return;
        const participant = getRoomParticipant(userId);
        roomSocketRef.current.connect(roomId, participant, state => {
            setWatchRoom(state);
            const video = videoRef.current;
            if (!video || !state.media || state.media.releaseId !== animeId || state.media.episode !== episodeNumber) {
                if (state.media) navigate(roomMediaUrl(roomId, state.media), { replace: true });
                return;
            }

            // The Worker sends an already-normalised position. Calculating it a
            // second time on the client made a stale timestamp jump forward
            // after pause → play.
            const targetTime = state.playback.position;
            applyingRoomStateRef.current = true;
            if (Math.abs(video.currentTime - targetTime) > .75) video.currentTime = targetTime;
            video.playbackRate = state.playback.rate;
            if (state.playback.paused && !video.paused) video.pause();
            if (!state.playback.paused && video.paused) void video.play().catch(error => console.error('Не удалось синхронизировать плеер:', error));
            window.setTimeout(() => { applyingRoomStateRef.current = false; }, 120);
        }, error => console.error('Ошибка комнаты:', error));
        const interval = window.setInterval(() => roomSocketRef.current.send({ type: 'sync_request' }), 15_000);
        return () => { window.clearInterval(interval); roomSocketRef.current.disconnect(); };
    }, [animeId, episodeNumber, navigate, roomId, userId]);

    useEffect(() => {
        if (!roomId || !watchRoom || watchRoom.media || watchRoom.hostId !== userId || !playerSession.dubId || !playerSession.sourceId || episodeNumber === undefined) return;
        roomSocketRef.current.send({
            type: 'set_media',
            media: {
                releaseId: animeId,
                releaseName: animeName,
                dubId: playerSession.dubId,
                sourceId: playerSession.sourceId,
                episode: episodeNumber,
                episodeName: episodeName ?? `Серия ${episodeNumber}`,
            },
        });
    }, [animeId, animeName, episodeName, episodeNumber, playerSession.dubId, playerSession.sourceId, roomId, userId, watchRoom]);

    const switchToLowerQuality = useCallback(() => {
        const currentIndex = qualities.indexOf(selectedQuality);
        const nextQuality = qualities.slice(currentIndex + 1).find(candidate => sources[candidate]?.[0]);
        if (!nextQuality) return false;

        const video = videoRef.current;
        fallbackPositionRef.current = {
            time: video && Number.isFinite(video.currentTime) ? video.currentTime : 0,
            shouldPlay: Boolean(video && !video.paused),
        };
        setFallbackQuality(nextQuality);
        return true;
    }, [qualities, selectedQuality, sources]);

    const closePlayer = () => {
        saveEpisodeTime();
        clearPlayerSession();
        navigate(`/anime/${animeId}`);
    };

    const showControls = useCallback(() => {
        setAreControlsVisible(true);
        if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
        if (!isPlaying || isPlayerSettingsOpen || resumePromptTime !== null) return;

        controlsTimeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2_500);
    }, [isPlaying, isPlayerSettingsOpen, resumePromptTime]);

    useEffect(() => {
        const updateFullscreen = () => setIsMaximized(document.fullscreenElement !== null);
        document.addEventListener('fullscreenchange', updateFullscreen);
        return () => document.removeEventListener('fullscreenchange', updateFullscreen);
    }, []);

    useEffect(() => {
        let isCancelled = false;
        if (!canUseAnime4KVideo()) return;

        void checkAnime4KVideoSupport()
            .then(isSupported => {
                if (!isCancelled) setWebGpuStatus(isSupported ? 'supported' : 'unsupported');
            })
            .catch(() => {
                if (!isCancelled) setWebGpuStatus('unsupported');
            });

        return () => { isCancelled = true; };
    }, []);

    useEffect(() => {
        showControls();
        return () => {
            if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
        };
    }, [showControls]);

    useEffect(() => {
        const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const nextVolume = settings.player.volume / 100;
        video.volume = nextVolume;
        setVolume(nextVolume);
    }, [settings.player.volume]);

    useEffect(() => {
        if (!settings.content.rememberEpisodeTime) return;

        const intervalId = window.setInterval(saveEpisodeTime, 15_000);
        return () => {
            window.clearInterval(intervalId);
            saveEpisodeTime();
        };
    }, [saveEpisodeTime, settings.content.rememberEpisodeTime]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        setCurrentTime(0);
        setDuration(0);
        setBufferedTime(0);
        setResumePromptTime(null);
        setStreamError(null);

        const isHls = stream.type === HLS_MIME_TYPE || stream.src.includes('.m3u8') || stream.src.includes(':hls:');
        let hls: Hls | undefined;
        let didEscalateError = false;
        let lastBrokenFragment = '';
        let brokenFragmentAttempts = 0;

        const abandonBrokenStream = () => {
            if (didEscalateError) return;
            didEscalateError = true;

            if (!switchToLowerQuality()) {
                setStreamError(t('player.streamUnavailable'));
                hls?.destroy();
            }
        };

        if (isHls && Hls.isSupported()) {
            hls = new Hls({
                // XhrLoader is declared with the base context even though it
                // works for Hls.js's specialised fragment loader context too.
                fLoader: CorsFallbackFragmentLoader as unknown as FragmentLoaderConstructor,
            });
            hls.loadSource(stream.src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_event, data) => {
                const isBrokenFragment = data.details === 'fragParsingError' || data.details === 'fragLoadError';
                if (isBrokenFragment) {
                    const fragmentId = String(data.frag?.sn ?? data.frag?.url ?? data.details);
                    brokenFragmentAttempts = fragmentId === lastBrokenFragment ? brokenFragmentAttempts + 1 : 1;
                    lastBrokenFragment = fragmentId;

                    // Hls.js performs its own retry first. Repeating a bad or
                    // CORS-blocked segment after that can never advance playback.
                    if (brokenFragmentAttempts >= 2) abandonBrokenStream();
                    return;
                }

                if (!data.fatal) return;

                console.error('Фатальная ошибка HLS.js:', data);
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    abandonBrokenStream();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    if (didEscalateError) return;
                    didEscalateError = true;
                    hls?.recoverMediaError();
                } else {
                    abandonBrokenStream();
                }
            });
        } else {
            video.src = stream.src;
        }

        return () => {
            hls?.destroy();
            video.removeAttribute('src');
            video.load();
        };
    }, [stream, switchToLowerQuality, t]);

    useEffect(() => {
        if (!settings.player.qualityUpgrade || !canUseAnime4KVideo()) return;

        const video = videoRef.current;
        const canvas = upscaleCanvasRef.current;
        if (!video || !canvas) return;

        let isCancelled = false;

        const setupUpscaler = async () => {
            try {
                if (!video.videoWidth || !video.videoHeight) return;
                // Mode B/C allocate many intermediate textures. Native size keeps
                // memory usage reasonable; CSS scales the enhanced canvas to the player.
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const { render, ModeA, ModeB, ModeC } = await import('anime4k-webgpu');
                if (isCancelled) return;

                const Preset = settings.player.qualityUpgradeMode === 'weak'
                    ? ModeA
                    : settings.player.qualityUpgradeMode === 'strong'
                        ? ModeC
                        : ModeB;

                await render({
                    video,
                    canvas,
                    pipelineBuilder: (device, inputTexture) => [new Preset({
                        device,
                        inputTexture,
                        nativeDimensions: { width: video.videoWidth, height: video.videoHeight },
                        targetDimensions: { width: canvas.width, height: canvas.height },
                    })],
                });

                if (!isCancelled) setUpscalerReadyKey(upscalerKey);
            } catch (error) {
                console.error('Не удалось включить Anime4K:', error);
            }
        };

        const onLoadedData = () => { void setupUpscaler(); };
        video.addEventListener('loadeddata', onLoadedData, { once: true });
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) void setupUpscaler();

        return () => {
            isCancelled = true;
            video.removeEventListener('loadeddata', onLoadedData);
            canvas.width = 0;
            canvas.height = 0;
        };
    }, [settings.player.qualityUpgrade, settings.player.qualityUpgradeMode, stream, upscalerKey]);

    const changeEpisode = async (targetEpisode: NonNullable<typeof previousEpisode>, shouldStartPlayback = true) => {
        if (isEpisodeChanging) return;

        setIsEpisodeChanging(true);
        try {
            const sources = await extractVideoLinks(targetEpisode.url);
            if (!sources) throw new Error('Не удалось получить ссылки на видео');
            if (playerSession.sourceId && userToken) {
                void markEpisodeWatched(animeId, playerSession.sourceId, targetEpisode.position, userToken);
            }
            setShouldPlayNextEpisode(shouldStartPlayback);
            setFallbackQuality(null);
            onSessionChange({
                ...playerSession,
                sources,
                episodeNumber: targetEpisode.position,
                episodeName: targetEpisode.name,
            });
        } catch (error) {
            console.error('Не удалось сменить серию:', error);
        } finally {
            setIsEpisodeChanging(false);
        }
    };

    const startFrom = (time: number) => {
        const video = videoRef.current;
        if (!video) return;

        video.currentTime = time;
        setCurrentTime(time);
        setResumePromptTime(null);
        void video.play().catch(error => console.error('Не удалось запустить видео:', error));
    };

    if (!stream) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('player.ariaLabel')}>
            <div className={styles.player} ref={playerRef} onPointerMove={showControls} onPointerDown={showControls}>
                <div className={`${styles['player-controls']} ${!areControlsVisible ? styles['player-controls-hidden'] : ''}`}>
                    <div className={styles['playback-buttons']}>
                        <div className={styles['top-bar']}>
                            <button className={styles['back-button']} onClick={closePlayer}><img src={BackIcon} /></button>
                            <div className={styles['title-block']}>
                                <h3>{animeName}</h3>
                                {episodeNumber !== undefined && <p>{episodeName}</p>}
                            </div>
                        </div>
                        <div className={styles['flow-buttons']}>
                            <button type="button" className={styles['next-prev-buttons']} disabled={!previousEpisode || isEpisodeChanging} onClick={() => previousEpisode && void changeEpisode(previousEpisode)}><img src={PrevIcon} /></button>
                            <button
                                type="button"
                                className={styles['play-button']}
                                onClick={() => {
                                    if (videoRef.current?.paused) void videoRef.current.play();
                                    else videoRef.current?.pause();
                                }}
                            >
                                <img src={isPlaying ? PauseIcon : PlayIcon} />
                            </button>
                            <button type="button" className={styles['next-prev-buttons']} disabled={!nextEpisode || isEpisodeChanging} onClick={() => nextEpisode && void changeEpisode(nextEpisode)}><img src={NextIcon} /></button>
                        </div>
                    </div>

                    <div className={styles['action-buttons']}>
                        <span className={styles['time-code']}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <div
                            className={`${styles['volume-div']} ${isVolumeDivExpanded ? styles['volume-expanded'] : ''}`}
                            onMouseEnter={() => setIsVolumeDivExpanded(true)}
                            onMouseLeave={() => setIsVolumeDivExpanded(false)}
                        >
                            <button
                                className={`${styles['action-btn']} ${styles['mute-button']}`}
                                onClick={() => {
                                    const video = videoRef.current;
                                    if (!video) return;
                                    video.muted = !video.muted;
                                }}
                            >
                                <img src={isMuted ? VolumeMuteIcon : VolumeMaxIcon} />
                            </button>
                            {isVolumeDivExpanded && (
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    value={volume}
                                    step="0.01"
                                    onChange={event => {
                                        const nextVolume = Number(event.target.value);
                                        setVolume(nextVolume);
                                        if (videoRef.current) videoRef.current.volume = nextVolume;
                                        setSettings(previous => ({
                                            ...previous,
                                            player: { ...previous.player, volume: Math.round(nextVolume * 100) },
                                        }));
                                    }}
                                />
                            )}
                        </div>

                        {settings.player.showSkipOpeningButton && (
                            <button
                                className={styles['action-btn']}
                                onClick={() => {
                                    const video = videoRef.current;
                                    if (!video) return;

                                    const nextTime = Number.isFinite(video.duration)
                                        ? Math.min(video.currentTime + settings.player.skipOpeningValue, video.duration)
                                        : video.currentTime + settings.player.skipOpeningValue;

                                    video.currentTime = nextTime;
                                    setCurrentTime(nextTime);
                                    sendRoomPlayback('seek', nextTime);
                                }}
                            >
                                <img src={SkipIcon} />
                            </button>
                        )}
                        <div className={styles['player-settings-wrap']}>
                            <button
                                type="button"
                                className={`${styles['action-btn']} ${isPlayerSettingsOpen ? styles['action-btn-active'] : ''}`}
                                onClick={() => setIsPlayerSettingsOpen(isOpen => !isOpen)}
                                aria-label={t('player.settings')}
                                aria-expanded={isPlayerSettingsOpen}
                            ><img src={SettingsIcon} /></button>
                            {isPlayerSettingsOpen && <div className={styles['player-settings-menu']}>
                                <section>
                                    <span className={styles['settings-label']}>{t('player.quality')}</span>
                                    <div className={styles['settings-options']}>
                                        {(['auto', ...qualities] as string[]).map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                className={requestedQuality === option ? styles.selected : ''}
                                                onClick={() => {
                                                    setFallbackQuality(null);
                                                    setSettings(previous => ({
                                                        ...previous,
                                                        player: { ...previous.player, defaultQuality: option as typeof previous.player.defaultQuality },
                                                    }));
                                                }}
                                            >{option === 'auto' ? t('player.autoQuality') : `${option}p`}</button>
                                        ))}
                                    </div>
                                </section>
                                <section className={styles['settings-toggle-row']}>
                                    <span>
                                        <strong>{t('player.qualityUpgrade')}</strong>
                                        <small>{webGpuStatus === 'checking'
                                            ? t('settings.qualityUpscale.webgpuChecking')
                                            : webGpuStatus === 'unsupported'
                                                ? t('settings.qualityUpscale.webgpuNotSupported')
                                                : 'Anime4K'}</small>
                                    </span>
                                    <label className={styles['player-toggle']}>
                                        <input
                                            type="checkbox"
                                            checked={settings.player.qualityUpgrade}
                                            disabled={webGpuStatus !== 'supported'}
                                            onChange={event => setSettings(previous => ({
                                                ...previous,
                                                player: { ...previous.player, qualityUpgrade: event.target.checked },
                                            }))}
                                        />
                                        <i />
                                    </label>
                                </section>
                                <section>
                                    <span className={styles['settings-label']}>{t('player.speed')}</span>
                                    <div className={styles['settings-options']}>
                                        {PLAYBACK_RATES.map(rate => (
                                            <button key={rate} type="button" className={playbackRate === rate ? styles.selected : ''} onClick={() => {
                                                setPlaybackRate(rate);
                                                if (videoRef.current) {
                                                    videoRef.current.playbackRate = rate;
                                                    sendRoomPlayback('set_rate', videoRef.current.currentTime, rate);
                                                }
                                            }}>{rate}×</button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <span className={styles['settings-label']}>{t('player.aspectRatio')}</span>
                                    <div className={styles['settings-options']}>
                                        {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map(ratio => (
                                            <button key={ratio} type="button" className={aspectRatio === ratio ? styles.selected : ''} onClick={() => setAspectRatio(ratio)}>{ratio === 'original' ? t('player.originalAspectRatio') : ratio}</button>
                                        ))}
                                    </div>
                                </section>
                            </div>}
                        </div>
                        <button
                            className={styles['action-btn']}
                            onClick={() => {
                                if (document.fullscreenElement !== null) void document.exitFullscreen();
                                else void playerRef.current?.requestFullscreen();
                            }}
                        >
                            <img src={isMaximized ? MinimizeIcon : MaximizeIcon} />
                        </button>
                    </div>
                    <div className={styles.timeline}>
                        <input
                            type="range"
                            min="0"
                            max={Number.isFinite(duration) ? duration : 0}
                            value={Math.min(currentTime, duration || 0)}
                            style={{
                                '--progress': `${timelineProgress}%`,
                                '--buffered-progress': `${bufferedProgress}%`,
                            } as CSSProperties}
                            step="0.1"
                            disabled={!Number.isFinite(duration) || duration <= 0}
                            onInput={event => {
                                const nextTime = Number(event.currentTarget.value);
                                if (videoRef.current) videoRef.current.currentTime = nextTime;
                                setCurrentTime(nextTime);
                            }}
                            onChange={event => sendRoomPlayback('seek', Number(event.currentTarget.value))}
                        />
                    </div>
                </div>
                <div className={styles['video-stage']}>
                <div className={styles['video-frame']} style={videoFrameStyle}>
                <video
                    ref={videoRef}
                    preload="auto"
                    crossOrigin="anonymous"
                    onPlay={event => {
                        setIsPlaying(true);
                        sendRoomPlayback('play', event.currentTarget.currentTime);
                    }}
                    onPause={event => {
                        setIsPlaying(false);
                        sendRoomPlayback('pause', event.currentTarget.currentTime);
                    }}
                    playsInline
                    className={styles.video}
                    onEnded={() => {
                        setIsPlaying(false);
                        saveEpisodeTime();
                        if (settings.player.autoplay && nextEpisode) {
                            void changeEpisode(nextEpisode);
                        }
                    }}
                    onLoadedMetadata={event => {
                        const video = event.currentTarget;
                        setDuration(video.duration);
                        video.playbackRate = playbackRate;

                        const fallbackPosition = fallbackPositionRef.current;
                        if (fallbackPosition) {
                            const nextTime = Number.isFinite(video.duration)
                                ? Math.min(fallbackPosition.time, Math.max(video.duration - 1, 0))
                                : fallbackPosition.time;
                            video.currentTime = nextTime;
                            setCurrentTime(nextTime);
                            fallbackPositionRef.current = null;
                            setStreamError(null);
                            if (fallbackPosition.shouldPlay) void video.play().catch(error => console.error('Не удалось возобновить видео:', error));
                            return;
                        }

                        const savedTime = getWatchProgress()[String(animeId)]?.[episodeKey];
                        const canResume = settings.content.rememberEpisodeTime
                            && typeof savedTime === 'number'
                            && savedTime > 0
                            && Number.isFinite(video.duration)
                            && !promptedEpisodesRef.current.has(progressKey);

                        if (canResume) {
                            const resumeTime = Math.min(savedTime, Math.max(video.duration - 1, 0));
                            promptedEpisodesRef.current.add(progressKey);
                            setResumePromptTime(resumeTime);
                            setShouldPlayNextEpisode(false);
                        } else if (shouldPlayNextEpisode) {
                            void video.play().catch(error => console.error('Не удалось запустить следующую серию:', error));
                            setShouldPlayNextEpisode(false);
                        }
                    }}
                    onDurationChange={event => setDuration(event.currentTarget.duration)}
                    onProgress={event => setBufferedTime(getBufferedEnd(event.currentTarget))}
                    onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
                    onVolumeChange={event => {
                        setVolume(event.currentTarget.volume);
                        setIsMuted(event.currentTarget.muted);
                    }}
                />
                <canvas ref={upscaleCanvasRef} className={`${styles['upscale-canvas']} ${isUpscalerReady ? styles['upscale-canvas-visible'] : ''}`} />
                </div>
                </div>
                {streamError && <div className={styles['stream-error']} role="status">{streamError}</div>}
                {resumePromptTime !== null && <div className={styles['resume-prompt']} role="dialog" aria-modal="true" aria-label={t('misc.continue')}>
                    <div className={styles['resume-prompt-card']}>
                        <h2>{t('misc.continue')}?</h2>
                        <p>{t('dubSelect.watchedUntil')} {formatTime(resumePromptTime)}.</p>
                        <div className={styles['resume-prompt-actions']}>
                            <button type="button" className={styles['resume-secondary-button']} onClick={() => startFrom(0)}>{t('player.startOver')}</button>
                            <button type="button" className={styles['resume-primary-button']} onClick={() => startFrom(resumePromptTime)}>{t('misc.continue')}</button>
                        </div>
                    </div>
                </div>}
            </div>
        </div>
    );
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

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = String(totalSeconds % 60).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');

    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${paddedMinutes}:${remainingSeconds}`
        : `${paddedMinutes}:${remainingSeconds}`;
}

function getBufferedEnd(video: HTMLVideoElement) {
    let bufferedEnd = 0;

    for (let index = 0; index < video.buffered.length; index += 1) {
        const rangeStart = video.buffered.start(index);
        const rangeEnd = video.buffered.end(index);

        if (rangeStart <= video.currentTime && rangeEnd >= video.currentTime) return rangeEnd;
        bufferedEnd = Math.max(bufferedEnd, rangeEnd);
    }

    return bufferedEnd;
}

async function markEpisodeWatched(releaseId: number, sourceId: number, episodePosition: number, token: string) {
    const baseUrl = `https://api-s.anixsekai.com`;
    await Promise.all([
        fetch(`${baseUrl}/episode/watch/${releaseId}/${sourceId}/${episodePosition}?token=${token}`),
        fetch(`${baseUrl}/history/add/${releaseId}/${sourceId}/${episodePosition}?token=${token}`),
    ]);
}
