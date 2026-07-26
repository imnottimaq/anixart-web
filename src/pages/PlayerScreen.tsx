import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import styles from './PlayerScreen.module.css';
import { useSettings } from '../shared/contexts/settingsContext';
import { clearPlayerSession, getPlayerSession, type PlayerSession } from '../shared/playerSession';
import { getWatchProgress, saveWatchProgress } from '../shared/watchProgress';

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

export default function PlayerScreen() {
    const playerSession = getPlayerSession();

    if (!playerSession) return <Navigate to="/" replace />;

    return <PlayerContent playerSession={playerSession} />;
}

function PlayerContent({ playerSession }: { playerSession: PlayerSession }) {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const videoRef = useRef<HTMLVideoElement>(null);
    const { sources, animeId, animeName, episodeNumber, episodeName } = playerSession;
    const qualities = useMemo(
        () => Object.keys(sources).sort((a, b) => (Number(b) || 0) - (Number(a) || 0)),
        [sources]
    );
    const quality = settings.player.defaultQuality ?? 'default';
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVolumeDivExpanded, setIsVolumeDivExpanded] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedTime, setBufferedTime] = useState(0);
    const [volume, setVolume] = useState(1);

    const stream = sources[quality]?.[0] ?? sources[qualities[0]]?.[0];
    const timelineProgress = Number.isFinite(duration) && duration > 0
        ? Math.min((currentTime / duration) * 100, 100)
        : 0;
    const bufferedProgress = Number.isFinite(duration) && duration > 0
        ? Math.max(timelineProgress, Math.min((bufferedTime / duration) * 100, 100))
        : 0;
    const episodeKey = String(episodeNumber ?? 'unknown');

    const saveEpisodeTime = useCallback(() => {
        const video = videoRef.current;
        if (!settings.content.rememberEpisodeTime || !video || !Number.isFinite(video.currentTime)) return;

        saveWatchProgress(animeId, episodeKey, video.ended ? -1 : Math.floor(video.currentTime));
    }, [animeId, episodeKey, settings.content.rememberEpisodeTime]);

    const closePlayer = () => {
        saveEpisodeTime();
        clearPlayerSession();
        navigate(`/anime/${animeId}`);
    };

    useEffect(() => {
        const updateFullscreen = () => setIsMaximized(document.fullscreenElement !== null);
        document.addEventListener('fullscreenchange', updateFullscreen);
        return () => document.removeEventListener('fullscreenchange', updateFullscreen);
    }, []);

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

        const isHls = stream.type === HLS_MIME_TYPE || stream.src.includes('.m3u8') || stream.src.includes(':hls:');
        let hls: Hls | undefined;

        if (isHls && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(stream.src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (_event, data) => console.error('Ошибка HLS.js:', data));
        } else {
            video.src = stream.src;
        }

        return () => {
            hls?.destroy();
            video.removeAttribute('src');
            video.load();
        };
    }, [stream]);

    if (!stream) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Видеоплеер">
            <div className={styles.player}>
                <div className={styles['player-controls']}>
                    <div className={styles['playback-buttons']}>
                        <div className={styles['top-bar']}>
                            <button className={styles['back-button']} onClick={closePlayer}><img src={BackIcon} /></button>
                            <div className={styles['title-block']}>
                                <h3>{animeName}</h3>
                                {episodeNumber !== undefined && <p>{episodeName}</p>}
                            </div>
                        </div>
                        <div className={styles['flow-buttons']}>
                            <button className={styles['next-prev-buttons']}><img src={PrevIcon} /></button>
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
                            <button className={styles['next-prev-buttons']}><img src={NextIcon} /></button>
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
                                }}
                            >
                                <img src={SkipIcon} />
                            </button>
                        )}
                        <button className={styles['action-btn']}><img src={SettingsIcon} /></button>
                        <button
                            className={styles['action-btn']}
                            onClick={() => {
                                const video = videoRef.current;
                                if (!video) return;
                                if (document.fullscreenElement !== null) void document.exitFullscreen();
                                else void video.requestFullscreen();
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
                        />
                    </div>
                </div>
                <video
                    ref={videoRef}
                    autoPlay={settings.player.autoplay}
                    preload="auto"
                    crossOrigin="anonymous"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    playsInline
                    className={styles.video}
                    onEnded={() => {
                        setIsPlaying(false);
                        saveEpisodeTime();
                    }}
                    onLoadedMetadata={event => {
                        const video = event.currentTarget;
                        setDuration(video.duration);

                        const savedTime = getWatchProgress()[String(animeId)]?.[episodeKey];
                        if (settings.content.rememberEpisodeTime && typeof savedTime === 'number' && savedTime > 0 && Number.isFinite(video.duration)) {
                            const resumeTime = Math.min(savedTime, Math.max(video.duration - 1, 0));
                            video.currentTime = resumeTime;
                            setCurrentTime(resumeTime);
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
            </div>
        </div>
    );
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
