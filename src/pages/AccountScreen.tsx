import { useNavigate, useParams } from "react-router-dom"
import styles from './AccountScreen.module.css'
import { useUser } from "../shared/contexts/userContext"
import { useEffect, useState } from "react"
import type { Profile } from "../shared/types/api"
import WatchlistLine from "../components/WatchlistLine"
import { useSearchScope } from '../shared/contexts/searchContext';

//Icons
import TgIcon from '../assets/icons/telegram.svg'
import VkIcon from '../assets/icons/vk.svg'
import DiscordIcon from '../assets/icons/discord.svg'
import InstIcon from '../assets/icons/instagram.svg'
import TtIcon from '../assets/icons/tiktok.svg'
import ReleaseCard from "../components/ReleaseCard"
import RemoteImage from '../components/RemoteImage'

interface ProfileAPIResponse{
    code: number;
    profile: Profile;
}

export default function AccountScreen(){
    const {id} = useParams<{id: string}>();
    const {userToken, userId} = useUser()
    const { setSearchScope } = useSearchScope();
    const [userObject, setUserObject] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate()
    console.log(userToken)
    useEffect(() => {
        if (userToken === "") navigate('/account/login')
    },[userToken])

    useEffect(() => {
        setSearchScope({ type: 'profiles' });
        return () => setSearchScope({ type: 'releases' });
    }, [setSearchScope]);
    
    useEffect(() => {
        const profileId = id ? +id : userId;
        GetProfileInfo(profileId, userToken)
            .then((data: ProfileAPIResponse) => {
                setUserObject(data.profile)
                console.log(data.profile)
            })
            .catch(err => console.log(err))
            .finally(() => setIsLoading(false))
    }, [])

    const watchDynamic = userObject?.watch_dynamics.slice(-10) ?? [];
    const maxValue = Math.max(...watchDynamic.map(({ count }) => count), 1);

    return (
        <div className={styles['body']}>
            <div className={styles['profile-grid']}>
                <div className={styles['profile-card']}>
                    <div className={styles['user-short']}>
                        <RemoteImage src={userObject?.avatar} />
                        <div className={styles['user-info']}>
                            <div className={styles['user-name-row']}>
                                <p>{userObject?.login}</p>
                                <span className={styles['rating']}>{userObject?.rating_score}</span>
                            </div>
                            <p>{userObject?.status}</p>
                        </div>
                    </div>
                    <div className={styles['user-socials']}>
                        {userObject?.vk_page && <a className={styles['vk']} href={"https://vk.com/" + userObject?.vk_page}><img className={styles['social-icon']} src={VkIcon}/></a>}
                        {userObject?.tg_page && <a className={styles['tg']} href={"https://t.me/" + userObject?.tg_page}><img className={styles['social-icon']} src={TgIcon}/></a>}
                        {userObject?.discord_page && <a className={styles['discord']}><img className={styles['social-icon']} src={DiscordIcon}/></a>}
                        {userObject?.inst_page && <a className={styles['inst']} href={"https://instagram.com/" + userObject?.inst_page}><img className={styles['social-icon']} src={InstIcon}/></a>}
                        {userObject?.tt_page && <a className={styles['tt']} href={"https://tiktok.com/@" + userObject?.tt_page}><img className={styles['social-icon']} src={TtIcon}/></a>}
                    </div>     
                    <div className={styles['stat-number-div']}>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.comment_count}</p>
                            <a>комментариев</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.video_count}</p>
                            <a>видео</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.collection_count}</p>
                            <a>коллекций</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.friend_count}</p>
                            <a>друзей</a>
                        </div>
                    </div>
                </div>
                <div className={styles['statistics-card']}>
                    <div className={styles['stat-line']}>
                        <h2>Статистика</h2>
                        <a onClick={() => navigate("/favorites")}>Смотреть все</a>
                    </div>
                    <p className={styles['statistics-caption']}>Распределение по спискам</p>
                    <WatchlistLine watching_count={userObject?.watching_count || 0}
                        plan_count={userObject?.plan_count || 0}
                        completed_count={userObject?.completed_count || 0}
                        hold_on_count={userObject?.hold_on_count || 0}
                        dropped_count={userObject?.dropped_count || 0}/>
                    <div className={styles['statistics-summary']}>
                        <div>
                            <span>Просмотрено серий</span>
                            <strong>{userObject?.watched_episode_count || 0}</strong>
                        </div>
                        <div>
                            <span>Время просмотра</span>
                            <strong>{formatSeconds(userObject?.watched_time || 0)}</strong>
                        </div>
                    </div>
                </div>
                <div className={styles['dynamics-card']}>
                    <h2>Динамика просмотра серий</h2>
                    <div className={styles['chart']}>
                        {watchDynamic.map((item) => (
                            <div className={styles['column']}>
                                <span>{item.count}</span>
                                <div className={styles['bar']} style={{height:`${Math.max(10, (item.count / maxValue) * 180)}px`}}/>
                                <span className={styles['date']}>{formatTimestamp(item.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className={styles['lists-grid']}>
                <div>
                    <h2>Оценки релизов</h2>
                        {userObject?.votes.map(item => 
                        <ReleaseCard key={item.id} variant="rated" name={item.title_ru} 
                            poster={item.image} 
                            grade={item.my_vote} 
                            timestamp={item.voted_at}/>
                    )}
                </div>
                <div>
                    <h2>Просмотрено недавно</h2>
                        {userObject?.history.map(item => 
                        <ReleaseCard key={item.id} variant="history" name={item.title_ru}
                            poster={item.image}
                            grade={item.last_view_episode.position}
                            timestamp={item.last_view_timestamp}
                            />
                    )}
                </div>
            </div>
            {isLoading && <div className={styles['loading-overlay']} />}
        </div>
    )

}

async function GetProfileInfo(profileId:number, token:string){
    const response = await fetch(`https://api-s.anixsekai.com/profile/${profileId}?token=${token}`)
    if (response.ok) return response.json()
    throw new Error("failed while fetching profile data: "+response.status)
}

function formatSeconds(totalSeconds:number) {
  const days = Math.floor(totalSeconds / 1440);
  const hours = Math.floor((totalSeconds % 1440) / 60);

  return `~${days} дней ${hours} часов`;
}

function formatTimestamp(timestamp: number){
    const dateObj = new Date(timestamp * 1000)
    return `${dateObj.getDate()}.${dateObj.getMonth()}`
}
