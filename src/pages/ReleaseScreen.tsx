import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './ReleaseScreen.module.css'
import { type Anime } from "../shared/types/api";
import ReleatedRelease from "../components/RelatedRelease";
import { useUser } from "../shared/contexts/userContext";
import { useSettings } from "../shared/contexts/settingsContext";
import Comment, {type CommentType} from "../components/Comment";
import DubSelectModal from "../modals/DubSelectModal";

//Icons
import peopleIcon from "../assets/icons/users.svg"
import calendarIcon from "../assets/icons/calendar.svg"
import tagsIcon from "../assets/icons/tags.svg"
import albumIcon from "../assets/icons/album-collection.svg"
import favoriteIcon from '../assets/icons/bookmark.svg'
import { setPlayerSession } from '../shared/playerSession';


export default function ReleaseScreen(){
    const {id} = useParams<{id: string}>();
    const {userToken} = useUser()
    const {settings} = useSettings()
    const navigate = useNavigate();
    const location = useLocation();
    const partialData = location.state?.partialAnime || null;
    const [animeData, setAnimeData] = useState<Anime>(partialData);
    const [screenshots, setScreenshots] = useState<string[]>([]);
    const [isDubScreenOpen, setIsDubScreenOpen] = useState(false);
    const [overallListCount, setOverallListCount] = useState(0);
    const requestKey = `${id ?? ''}:${userToken}`;
    const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
    const isReleaseLoading = loadedRequestKey !== requestKey;

    useEffect(() => {
        GetRelease(id, userToken)
            .then(data => {
                const release = data.release as Anime;
                setAnimeData(release);
                setOverallListCount(release.watching_count + release.plan_count + release.completed_count + release.hold_on_count + release.dropped_count);
                setScreenshots(release.screenshot_images.map(item => `https://images.weserv.nl/?url=${item}`));
            })
            .catch(error => console.error('Не удалось загрузить релиз:', error))
            .finally(() => setLoadedRequestKey(requestKey));
    }, [id, requestKey, userToken]);

    if (isReleaseLoading) {
        return <div className={styles['loading-overlay']} aria-label="Загрузка" />;
    }

    if (!animeData) {
        return <div className={styles['body']}>Не удалось загрузить релиз.</div>;
    }

    return(
        <div className={styles['body']}>
            <div className={styles['side-panel']}>
                <img src={"https://images.weserv.nl/?url="+animeData.image} className={styles.poster}/>
                <div className={`${styles['action-panel']}`}>
                    <select id="watchlist-select" className={`${styles['list-select']} ${styles['action-btn']} ${styles[`status-${animeData?.profile_list_status ?? 0}`]}`} onChange={e => {
                            const newStatus = +e.target.value
                            if (!userToken){
                                alert("Для смены статуса аниме необходимо войти в аккаунт.")
                                return
                            }
                            setAnimeData((prev: Anime) => ({
                                ...prev,
                                profile_list_status: newStatus
                            }));
                            SendWatchlistChange(animeData.id, newStatus, userToken)
                                .catch(err => console.error(err));
                        }} 
                        value={animeData?.profile_list_status ?? 0}>
                        <option value={0}>Не смотрю</option>
                        <option value={1}>Смотрю</option>
                        <option value={2}>В планах</option>
                        <option value={3}>Просмотрено</option>
                        <option value={4}>Отложено</option>
                        <option value={5}>Брошено</option>
                    </select>
                    <button className={`${styles['favorite-btn']} ${styles['action-btn']} ${animeData.is_favorite ? styles['favorited'] : ''}`}
                            onClick={async () => {
                                if (!userToken) {
                                    alert("Войдите в аккаунт для добавления в избранное.");
                                    return;
                                }
                                try {
                                    await HandleFavorite(animeData.id, userToken);
                                    
                                    setAnimeData((prev: Anime) => {
                                        const wasFavorite = prev.is_favorite;
                                        return {
                                            ...prev,
                                            is_favorite: !wasFavorite,
                                            favorites_count: wasFavorite ? prev.favorites_count - 1 : prev.favorites_count + 1
                                        };
                                    });
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                    ><img src={favoriteIcon} className={`${styles['icon-smaller']} ${animeData.is_favorite ? styles['favorited'] : ''}`}></img>{animeData?.favorites_count || 0}</button>
                </div>
                <button onClick={() => setIsDubScreenOpen(true)} className={styles['watch-btn']}>Воспроизвести</button>
                <div className={`${styles['grade-container']}`}>
                    <div className={styles['grade']}>
                        <p>Оценки</p>
                        <h1>{(animeData.grade ?? 0).toFixed(2)}</h1>
                        <p>{animeData.vote_count ?? 0} голосов</p>
                    </div>
                    <div className={styles['grade-bars']}>
                    {[5,4,3,2,1].map(grade => {
                        const voteCount = animeData[`vote_${grade}_count` as keyof Anime] || 0
                        return (
                            <div key={grade} style={{display:"flex", flexDirection:"row", alignItems: "center", gap: "5px"}}>
                                <p style={{margin: 0, minWidth: "12px"}}>{grade}</p>
                                <progress value={+voteCount} max={animeData.vote_count || 1}></progress>
                            </div>
                        )
                    })}
                    </div>
                </div>
                <div className={styles['watchlist-info']}>
                    <div className={styles['watchlist-line']}>
                        <progress value='100' max='100' className={styles['progress1']}></progress>
                        <progress value={(animeData.watching_count + animeData.plan_count + animeData.completed_count + animeData.hold_on_count) / overallListCount * 100} max='100' className={styles['progress2']}></progress>
                        <progress value={(animeData.watching_count + animeData.plan_count + animeData.completed_count) / overallListCount * 100} max='100' className={styles['progress3']}></progress>
                        <progress value={(animeData.watching_count + animeData.plan_count) / overallListCount * 100} max='100' className={styles['progress4']}></progress>
                        <progress value={(animeData.watching_count) / overallListCount * 100} max='100' className={styles['progress5']}></progress>
                    </div>
                    <div className={styles['watchlist-hint']}>
                        {[
                            ['watching', 'Смотрю', animeData.watching_count],
                            ['plan', 'В планах', animeData.plan_count],
                            ['completed', 'Просмотрено', animeData.completed_count],
                            ['hold', 'Отложено', animeData.hold_on_count],
                            ['dropped', 'Брошено', animeData.dropped_count],
                        ].map(([status, label, count]) => (
                            <div className={styles['watchlist-hint-item']} key={status}>
                                <span className={`${styles['watchlist-hint-circle']} ${styles[`circle-${status}`]}`}></span>
                                <span>{label} {count ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
            </div>
            <div className={styles['release-info']}>
                <div>
                    <div className={styles['release-base-info']}>
                        <h2>{animeData.title_ru}</h2>
                        <div style={{display: "flex", flexDirection: "row", gap: "10px", alignItems: "center"}}>
                            <p>{animeData.title_original}</p>
                            <a className={styles['age-rating']}>{
                                    ({
                                        1: "0+",
                                        2: "6+",
                                        3: "12+",
                                        4: "16+",
                                        5: "18+"
                                    } as Record<number, string>)[animeData.age_rating] || ""
                                }</a>
                        </div>
                        {animeData.note && <div style={{display:"flex", flexDirection:"row"}}>
                            <a className={styles['note']}>{animeData.note.replace(/<br\s*\/?>/gi, '\n')}</a>
                            </div>}
                        <p>{animeData.description}</p>
                    </div>
                    <div style={{display:"flex", flexDirection:"row", marginTop: "20px"}}>
                        <div style={{minWidth: 0}}>
                            {screenshots.length > 0 && (
                                <div className={styles['swiper-container']}>
                                    <Swiper
                                        modules={[Navigation, Pagination]}
                                        spaceBetween={10}
                                        slidesPerView={2}
                                        breakpoints={{
                                            0: { slidesPerView: 1 },
                                            640: { slidesPerView: 2 },
                                        }}
                                        navigation
                                        pagination={{ clickable: true }}
                                        loop={screenshots.length > 2}
                                        style={{
                                            '--swiper-navigation-color': 'var(--accent-color, #ff5c5c)',
                                            '--swiper-pagination-color': 'var(--accent-color, #ff5c5c)',
                                        } as React.CSSProperties}
                                    >
                                        {screenshots.map((url, index) => (
                                            <SwiperSlide key={index}>
                                                <img 
                                                    src={url} 
                                                    alt={`Скриншот ${index + 1}`} 
                                                    className={styles['screenshot-img']}
                                                />
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                            <div>
                                {animeData.related_releases.length !== 0 && <h3 style={{marginTop: '0px'}}>Связанные релизы</h3>}
                                {animeData.related_releases && animeData.related_releases.map((anime:Anime) =>(
                                        <ReleatedRelease key={anime.id} anime={anime}/>
                                    ))}
                            </div>
                        </div>
                            <div style={{margin: "0px 15px", minWidth:"30%"}}>
                                <div className="flex-row-center">{({
                                    "Япония": <div className={styles["japan-flag"]}></div>,
                                    "Китай": <div className={styles["china-flag"]}></div>
                                } as Record<string, React.ReactNode>)[animeData.country]
                                }
                                <p>{animeData.country}, {(["зима","весна","лето","осень"])[animeData.season]} {animeData.year} г.</p>
                                </div>
                                <div className="flex-row-center">
                                    <img src={albumIcon} className={styles['icon']} />
                                    <p>{animeData.episodes_released} из {animeData.episodes_total || "?"} эп.{animeData.duration ? `, по ~${animeData.duration} мин.` : ""}</p>
                                </div>
                                <div className="flex-row-center">
                                    <img src={calendarIcon} className={styles['icon']} />
                                    <p>{animeData.category.name}, {animeData.status.name.toLocaleLowerCase()}</p>
                                </div>
                                <div className="flex-row-center"> 
                                    <img src={peopleIcon} className={styles['icon']} />
                                    <p>Студия {animeData.studio}{animeData.author ? `, автор ${animeData.author}`:""}{animeData.director ? `, режиссёр ${animeData.director}`:""}</p>
                                </div>
                                <div className="flex-row-center">
                                    <img src={tagsIcon} className={styles['icon']} />
                                    <p>{animeData.genres}</p>
                                </div>
                            </div>
                    </div>
                    {animeData.comments.length !== 0 && <div>
                        <h3>Коментарии</h3>
                        {animeData.comments.map((comment: CommentType) => (<Comment key={comment.id} comment={comment} releaseId={animeData.id}/>))}
                        {
                        // <button>Смотреть все</button> //TODO: реализовать
                        }
                    </div>}
                </div>
            </div>
            {isDubScreenOpen && <DubSelectModal 
                isOpen={isDubScreenOpen}
                onClose={() => setIsDubScreenOpen(false)}
                releaseId={animeData?.id}
                onEpisodeSelect={(sources, episode) => {
                    setIsDubScreenOpen(false)
                    setPlayerSession({
                        sources,
                        animeId: animeData.id,
                        animeName: settings.appearance.language === 'english' ? animeData.title_original : animeData.title_ru,
                        episodeNumber: episode.position,
                        episodeName: episode.name,
                    });
                    navigate('./watch');
                }}
                token={userToken}
            />}
        </div>
    )
}

async function GetRelease(id: string | undefined, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/release/${id}?extended_mode=true&token=${token}`)
    if (response.ok) return response.json()
    throw new Error("Error while trying to fetch release data:" + response.status);
}

async function SendWatchlistChange(id: number, status: number, token: string){
    const response = await fetch(`https://api-s.anixsekai.com/profile/list/add/${status}/${id}?token=${token}`)
    if (response.ok) {
        console.log("Status successfully changed")
        return
    }
    throw new Error(response.status.toString())
}

async function HandleFavorite(releaseId: number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/favorite/add/${releaseId}?token=${token}`); 
    if (!response.ok) throw new Error("Error while trying to favorite release: " + response.status);

    const data = await response.json();

    if (data.code === 3) {
        const deleteResponse = await fetch(`https://api-s.anixsekai.com/favorite/delete/${releaseId}?token=${token}`);
        if (!deleteResponse.ok) throw new Error("Error while trying to unfavorite release: " + deleteResponse.status);
        return await deleteResponse.json();
    } 
    
    if (data.code === 0) return data;
    return data;
}
