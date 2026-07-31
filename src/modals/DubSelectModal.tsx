import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './DubSelectModal.module.css'
import { extractVideoLinks } from '../utils/LinkParser';
import type { VideoSources } from '../shared/types/video';
import type { PlayerSessionEpisode } from '../shared/playerSession';
import CloseIcon from '../assets/icons/xmark.svg'
import EyeIcon from '../assets/icons/eye.svg'
import { clearWatchProgress, getWatchProgress } from '../shared/watchProgress';
import { Modal } from './ModalTemplate';
import { useSettings } from '../shared/contexts/settingsContext';
import { useTranslation } from '../shared/useTranslation';


interface DubSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseId: number;
  token: string;
  autoSelect?: { dubId: number; sourceId: number; episode: number } | null;
  onEpisodeSelect: (sources: VideoSources, episode: PlayerSessionEpisode, episodes: PlayerSessionEpisode[], sourceId: number, dubId: number) => void;
}

interface Dub {
    id: number;
    name: string;
    episodes_count: number;
    view_count: number;
}

interface Source {
    id: number;
    name: string;
    episodes_count: number;
}

interface Episode {
    name: string;
    url: string;
    is_watched: boolean;
    position: number;
}

function formatProgressTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, '0');

    return `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
}

export default function DubSelectModal({ isOpen, onClose, releaseId, token, autoSelect, onEpisodeSelect }: DubSelectModalProps){
    const { settings, setSettings } = useSettings();
    const { t } = useTranslation();
    const [dubsData, setDubsData] = useState<Dub[]>([]);
    const [sourcesData, setSourcesData] = useState<Source[]>([]);
    const [episodesData, setEpisodesData] = useState<Episode[]>([]);
    const [selectedDub, setSelectedDub] = useState(0);
    const [selectedSource, setSelectedSource] = useState(0);
    const [episodeToUnwatch, setEpisodeToUnwatch] = useState<Episode | null>(null);
    const autoSelectedRef = useRef<string | null>(null);
    const episodeProgress = getWatchProgress()[String(releaseId)] ?? {};

    const loadEpisodes = useCallback((relId: number, dubId: number, srcId: number, token:string) => {
        GetEpisodes(relId, dubId, srcId, token)
            .then(data => {
                setEpisodesData(data.episodes || []);
            })
            .catch(err => console.error(err));
    },[])

    const loadSources = useCallback((relId: number, dubId: number) => {
        GetSources(relId, dubId)
            .then(data => {
                const sources: Source[] = data.sources || [];
                setSourcesData(sources);
                setEpisodesData([]);

                if (sources.length > 0) {
                    const roomSource = autoSelect && sources.find(source => source.id === autoSelect.sourceId);
                    const rememberedSource = settings.content.rememberSource
                        ? sources.find(source => source.id === settings.content.rememberedSourceId)
                        : undefined;
                    const sourceId = roomSource?.id ?? rememberedSource?.id ?? sources[0].id;
                    setSelectedSource(sourceId);
                    loadEpisodes(relId, dubId, sourceId, token);
                }
            })
            .catch(err => console.error(err));
    }, [autoSelect, loadEpisodes, settings.content.rememberSource, settings.content.rememberedSourceId, token])
    
    useEffect(() => {
        if (!isOpen) return;
        GetDubs(releaseId)
            .then(data => {
                const dubs: Dub[] = data.types || [];
                setDubsData(dubs);
                
                if (dubs.length > 0) {
                    const roomDub = autoSelect && dubs.find(dub => dub.id === autoSelect.dubId);
                    const rememberedDub = settings.content.rememberDub
                        ? dubs.find(dub => dub.id === settings.content.rememberedDubId)
                        : undefined;
                    const dubId = roomDub?.id ?? rememberedDub?.id ?? dubs[0].id;
                    setSelectedDub(dubId);
                    loadSources(releaseId, dubId);
                }
            })
            .catch(err => console.error(err))
    }, [autoSelect, isOpen, loadSources, releaseId, settings.content.rememberDub, settings.content.rememberedDubId])

    const selectEpisode = useCallback(async (episode: Episode, shouldMarkWatched: boolean) => {
        if (shouldMarkWatched && token) await SetWatched(releaseId, selectedSource, episode.position, token);
        const sources = await extractVideoLinks(episode.url);
        if (sources) onEpisodeSelect(sources, {
            name: episode.name,
            position: episode.position,
            url: episode.url,
        }, episodesData.map(({ name, position, url }) => ({ name, position, url })), selectedSource, selectedDub);
    }, [episodesData, onEpisodeSelect, releaseId, selectedDub, selectedSource, token]);

    useEffect(() => {
        if (!isOpen || !autoSelect || selectedDub !== autoSelect.dubId || selectedSource !== autoSelect.sourceId) return;
        const episode = episodesData.find(item => item.position === autoSelect.episode);
        const key = `${releaseId}:${autoSelect.dubId}:${autoSelect.sourceId}:${autoSelect.episode}`;
        if (!episode || autoSelectedRef.current === key) return;
        autoSelectedRef.current = key;
        void selectEpisode(episode, false).catch(error => console.error('Не удалось открыть серию комнаты:', error));
    }, [autoSelect, episodesData, isOpen, releaseId, selectEpisode, selectedDub, selectedSource]);

    if (!isOpen) return null;

    return (
        <>
        <Modal onClose={onClose}
            isOpen={isOpen}
            showCloseButton={false}
            contentStyle={{
                '--modal-width': 'min(50%, 1200px)',
                '--modal-height': 'min(50vh, 800px)',
            } as React.CSSProperties}
        > 
            {close => (<>
                <div className={styles['top-row']}>
                    <h3>{t('dubSelect.title')}</h3>
                    <div className={styles['top-row-right']}>
                        <select value={selectedDub} style={{marginRight:'10px'}}
                        onChange={e => {
                            const dubId = +e.target.value;
                            setSelectedDub(dubId);
                            if (settings.content.rememberDub) {
                                setSettings(previous => ({
                                    ...previous,
                                    content: { ...previous.content, rememberedDubId: dubId },
                                }));
                            }
                            loadSources(releaseId, dubId)
                        }}>
                            {dubsData.map((dub) => {
                                return <option key={`dub-${dub.id}`} value={dub.id}>{dub.name} {dub.episodes_count} сер. | {dub.view_count} прос.</option>
                            })}
                        </select>
                        {sourcesData.length > 0 && (
                            <select onChange={e => {
                            const sourceId = +e.target.value;
                            setSelectedSource(sourceId);
                            if (settings.content.rememberSource) {
                                setSettings(previous => ({
                                    ...previous,
                                    content: { ...previous.content, rememberedSourceId: sourceId },
                                }));
                            }
                            loadEpisodes(releaseId, selectedDub, sourceId, token)}}
                            disabled={sourcesData.length < 2}
                            style={{marginRight:'10px'}}
                            value={selectedSource}>
                                {sourcesData.map((source) => {
                                    return <option key={`source-${source.id}`} value={source.id}>{source.name}</option>
                                })}
                            </select>
                        )}
                        <img src={CloseIcon} alt={t('misc.close')} onClick={close} />
                    </div>
                </div>
                <div className={styles.episodes}>
                    {episodesData && episodesData.map((episode) => (
                        <button key={`episode-${episode.position}`} 
                                className={styles['episode']}
                                onClick={() => void selectEpisode(episode, true)}>
                                <h3>{episode.name}</h3>
                                <div className={styles['episode-meta']}>
                                    {episodeProgress[String(episode.position)] === -1 ? (
                                        <span className={styles['episode-progress']}>{t('dubSelect.watchedFull')}</span>
                                    ) : typeof episodeProgress[String(episode.position)] === 'number' && episodeProgress[String(episode.position)] > 0 ? (
                                        <span className={styles['episode-progress']}>
                                            {t('dubSelect.watchedUntil')} {formatProgressTime(episodeProgress[String(episode.position)])}
                                        </span>
                                    ) : null}
                                    {episode.is_watched && <button className={styles.seen}
                                        onClick={event => {
                                            event.stopPropagation()
                                            setEpisodeToUnwatch(episode);
                                           }}>
                                        <img src={EyeIcon} alt={t('dubSelect.watched')} /></button>}
                                </div>
                        </button>
                    ))}
                </div>
                </>)}
        </Modal>

        <Modal isOpen={episodeToUnwatch !== null}
            onClose={() => setEpisodeToUnwatch(null)}
            title={t('dubSelect.unwatchTitle')}
            text={`${t('dubSelect.unwatchText')} «${episodeToUnwatch?.name ?? ''}»?`}
            actions={[
                {
                    label: t('misc.cancel'),
                    variant: 'secondary',
                    onClick: () => setEpisodeToUnwatch(null)
                },
                {
                    label: t('misc.remove'),
                    variant: 'primary',
                    onClick: async () => {
                        if (!episodeToUnwatch) return;
                        try {
                            await SetUnwatched(releaseId, selectedSource, episodeToUnwatch.position, token);
                            clearWatchProgress(releaseId, String(episodeToUnwatch.position));
                            setEpisodesData(previousEpisodes => previousEpisodes.map(episode =>
                                episode.position === episodeToUnwatch.position
                                    ? { ...episode, is_watched: false }
                                    : episode
                            ));
                            setEpisodeToUnwatch(null);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            ]}/>
        </>
    )
}


async function GetDubs(id: number) {
    const response = await fetch(`https://api-s.anixsekai.com/episode/${id}`)
    if (response.ok) return response.json()
    throw new Error("Failed to fetch avaliable dubs: " + response.status)
}

async function GetSources(releaseId: number, dubId: number){
    const response = await fetch(`https://api-s.anixsekai.com/episode/${releaseId}/${dubId}`)
    if (response.ok) return response.json()
    throw new Error("Failed to fetch avaliable sources: " + response.status)
}

async function GetEpisodes(releaseId: number, dubId:number, sourceId:number, token:string) {
    const response = await fetch(`https://api-s.anixsekai.com/episode/${releaseId}/${dubId}/${sourceId}?token=${token}`)
    if (response.ok) return response.json()
    throw new Error("Failed to fetch avaliable episodes: " + response.status)
}

async function SetWatched(releaseId:number, sourceId: number, position: number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/episode/watch/${releaseId}/${sourceId}/${position}?token=${token}`)
    void AddToHistory(releaseId,sourceId,position,token)
    if (response.ok) return response.json()
    throw new Error("Failed to mark episode as watched: " + response.status)
}

async function SetUnwatched(releaseId:number, sourceId: number, position: number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/episode/unwatch/${releaseId}/${sourceId}/${position}?token=${token}`)
    if (response.ok) return response.json()
    throw new Error("Failed to mark episode as unwatched: " + response.status)
}

async function AddToHistory(releaseId:number, sourceId:number, position:number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/history/add/${releaseId}/${sourceId}/${position}?token=${token}`)  
    if (response.ok) return response.json()
        throw new Error("Failed to add episode to history: " + response.status)
}
