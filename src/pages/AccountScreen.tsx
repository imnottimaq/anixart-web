import { useNavigate, useParams } from "react-router-dom"
import styles from './AccountScreen.module.css'
import { useUser } from "../shared/contexts/userContext"
import { useEffect, useState } from "react"
import type { Profile } from "../shared/types/api"
import WatchlistLine from "../components/WatchlistLine"
import { useSearchScope } from '../shared/contexts/searchContext';
import { useTranslation } from '../shared/useTranslation';

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
    const {userToken} = useUser()
    const { setSearchScope } = useSearchScope();
    const { t } = useTranslation();
    const [userObject, setUserObject] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate()
    useEffect(() => {
        if (userToken === "") navigate('/account/login')
    }, [navigate, userToken])

    useEffect(() => {
        setSearchScope({ type: 'profiles' });
        return () => setSearchScope({ type: 'releases' });
    }, [setSearchScope]);
    
    useEffect(() => {
        let isCancelled = false;
        setIsLoading(true);
        setUserObject(null);

        if (!userToken) {
            setIsLoading(false);
            return () => { isCancelled = true; };
        }

        const profileId = id ? Number(id) : null;
        if (profileId !== null && (!Number.isFinite(profileId) || profileId <= 0)) {
            setIsLoading(false);
            return () => { isCancelled = true; };
        }

        const loadProfile = async () => {
            const currentProfileId = profileId;
            try {
                const data = currentProfileId !== null
                    ? await getProfile(currentProfileId, userToken)
                    : await getCurrentProfile(userToken);
                const profile = data.profile;
                if (!profile) throw new Error('Сервер вернул профиль без данных');
                if (!isCancelled) setUserObject(profile);
            } catch (error) {
                console.error('Не удалось загрузить профиль:', error);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        void loadProfile();

        return () => { isCancelled = true; };
    }, [id, userToken])

    const watchDynamic = userObject?.watch_dynamic?.slice(-10) ?? [];
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
                            <a>{t('account.comments')}</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.video_count}</p>
                            <a>{t('account.videos')}</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.collection_count}</p>
                            <a>{t('account.collections')}</a>
                        </div>
                        <div className={styles['stat-number']}>
                            <p>{userObject?.friend_count}</p>
                            <a>{t('account.friends')}</a>
                        </div>
                    </div>
                </div>
                <div className={styles['statistics-card']}>
                    <div className={styles['stat-line']}>
                        <h2>{t('account.stats')}</h2>
                        <a onClick={() => navigate("/favorites")}>{t('account.viewAll')}</a>
                    </div>
                    <p className={styles['statistics-caption']}>{t('account.distribution')}</p>
                    <WatchlistLine watching_count={userObject?.watching_count || 0}
                        plan_count={userObject?.plan_count || 0}
                        completed_count={userObject?.completed_count || 0}
                        hold_on_count={userObject?.hold_on_count || 0}
                        dropped_count={userObject?.dropped_count || 0}/>
                    <div className={styles['statistics-summary']}>
                        <div>
                            <span>{t('account.watchedEpisodes')}</span>
                            <strong>{userObject?.watched_episode_count || 0}</strong>
                        </div>
                        <div>
                            <span>{t('account.watchedTime')}</span>
                            <strong>{formatSeconds(userObject?.watched_time || 0)}</strong>
                        </div>
                    </div>
                </div>
                <div className={styles['dynamics-card']}>
                    <h2>{t('account.dynamics')}</h2>
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
                    <h2>{t('account.releaseRating')}</h2>
                        {userObject?.votes.map(item => 
                        <ReleaseCard key={item.id} variant="rated" name={item.title_ru} 
                            poster={item.image} 
                            grade={item.my_vote} 
                            timestamp={item.voted_at}/>
                    )}
                </div>
                <div>
                    <h2>{t('account.watchedRecently')}</h2>
                        {userObject?.history.map(item => 
                        <ReleaseCard key={item.id} variant="history" name={item.title_ru}
                            poster={item.image}
                            grade={item.last_view_episode?.position ?? 0}
                            timestamp={item.last_view_timestamp}
                            />
                    )}
                </div>
            </div>
            {isLoading && <div className={styles['loading-overlay']} />}
        </div>
    )

}

async function getProfile(profileId:number, token:string): Promise<ProfileAPIResponse> {
    const response = await fetch(`https://api-s.anixsekai.com/profile/${profileId}?token=${token}`)
    if (response.ok) return response.json()
    throw new Error("failed while fetching profile data: "+response.status)
}

async function getCurrentProfile(token: string): Promise<ProfileAPIResponse> {
    const response = await fetch(`https://api-s.anixsekai.com/profile/info?token=${token}`);
    if (response.ok) return response.json();
    throw new Error(`failed while fetching current profile: ${response.status}`);
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
