import { useCallback, useEffect, useState } from 'react';
import styles from './DubSelectModal.module.css'
import { extractVideoLinks } from '../utils/LinkParser';
import type { VideoSources } from '../shared/types/video';
import CloseIcon from '../assets/icons/xmark.svg'
import EyeIcon from '../assets/icons/eye.svg'
import { clearWatchProgress, getWatchProgress } from '../shared/watchProgress';
import { Modal } from './ModalTemplate';


interface DubSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseId: number;
  token: string;
  onEpisodeSelect: (sources: VideoSources, episode: Pick<Episode, 'name' | 'position'>) => void;
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

export default function DubSelectModal({ isOpen, onClose, releaseId, token, onEpisodeSelect }: DubSelectModalProps){
    const [dubsData, setDubsData] = useState<Dub[]>([]);
    const [sourcesData, setSourcesData] = useState<Source[]>([]);
    const [episodesData, setEpisodesData] = useState<Episode[]>([]);
    const [selectedDub, setSelectedDub] = useState(0);
    const [selectedSource, setSelectedSource] = useState(0);
    const [episodeToUnwatch, setEpisodeToUnwatch] = useState<Episode | null>(null);
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
                const sources = data.sources || [];
                setSourcesData(sources);
                setEpisodesData([]);

                if (sources.length > 0) {
                    const firstSourceId = sources[0].id;
                    setSelectedSource(firstSourceId);
                    loadEpisodes(relId, dubId, firstSourceId,token);
                }
            })
            .catch(err => console.error(err));
    },[])
    
    useEffect(() => {
        GetDubs(releaseId)
            .then(data => {
                const dubs = data.types || [];
                setDubsData(dubs);
                
                if (dubs.length > 0) {
                    const firstDubId = dubs[0].id;
                    setSelectedDub(firstDubId);
                    loadSources(releaseId, firstDubId);
                }
            })
            .catch(err => console.error(err))
    }, [releaseId])

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
                    <h3>Выбор озвучки</h3>
                    <div className={styles['top-row-right']}>
                        <select style={{marginRight:'10px'}}
                        onChange={e => {
                            setSelectedDub(+e.target.value)
                            loadSources(releaseId, +e.target.value)
                        }}>
                            {dubsData.map((dub) => {
                                return <option key={`dub-${dub.id}`} value={dub.id}>{dub.name} {dub.episodes_count} сер. | {dub.view_count} прос.</option>
                            })}
                        </select>
                        {sourcesData.length > 0 && (
                            <select onChange={e => {
                            setSelectedSource(+e.target.value)
                            loadEpisodes(releaseId, selectedDub, +e.target.value, token)}}
                            disabled={sourcesData.length < 2}
                            style={{marginRight:'10px'}}
                            value={selectedSource}>
                                {sourcesData.map((source) => {
                                    return <option key={`source-${source.id}`} value={source.id}>{source.name}</option>
                                })}
                            </select>
                        )}
                        <img src={CloseIcon} alt="Закрыть" onClick={close} />
                    </div>
                </div>
                <div className={styles.episodes}>
                    {episodesData && episodesData.map((episode) => (
                        <button key={`episode-${episode.position}`} 
                                className={styles['episode']}
                                onClick={async () => {
                                    await SetWatched(releaseId, selectedSource, episode.position, token)
                                    const sources = await extractVideoLinks(episode.url);
                                    if (sources) onEpisodeSelect(sources, {
                                        name: episode.name,
                                        position: episode.position,
                                    });
                            }}>
                                <h3>{episode.name}</h3>
                                <div className={styles['episode-meta']}>
                                    {episodeProgress[String(episode.position)] === -1 ? (
                                        <span className={styles['episode-progress']}>Просмотрено целиком</span>
                                    ) : typeof episodeProgress[String(episode.position)] === 'number' && episodeProgress[String(episode.position)] > 0 ? (
                                        <span className={styles['episode-progress']}>
                                            Просмотрено до {formatProgressTime(episodeProgress[String(episode.position)])}
                                        </span>
                                    ) : null}
                                    {episode.is_watched && <button className={styles.seen}
                                        onClick={event => {
                                            event.stopPropagation()
                                            setEpisodeToUnwatch(episode);
                                           }}>
                                        <img src={EyeIcon} alt="Уже просмотрено" /></button>}
                                </div>
                        </button>
                    ))}
                </div>
                </>)}
        </Modal>

        <Modal isOpen={episodeToUnwatch !== null}
            onClose={() => setEpisodeToUnwatch(null)}
            title='Внимание'
            text={`Убрать отметку «Просмотрено» у серии «${episodeToUnwatch?.name ?? ''}»?`}
            actions={[
                {
                    label: 'Отмена',
                    variant: 'secondary',
                    onClick: () => setEpisodeToUnwatch(null)
                },
                {
                    label: 'Убрать',
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
