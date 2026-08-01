import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import RemoteImage from '../components/RemoteImage';
import { useApi } from '../shared/apiClient';
import type { ReleaseNotificationsPreferencesAPIResponse } from '../shared/types/api';
import styles from './ReleaseNotificationSettingsScreen.module.css';

export default function ReleaseNotificationSettingsScreen() {
    const api = useApi();
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseNotificationsPreferencesAPIResponse['content']>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void api.get<ReleaseNotificationsPreferencesAPIResponse>('/profile/preference/notification/release/all/0')
            .then(response => { if (!cancelled) setReleases(response.content ?? []); })
            .catch(requestError => {
                if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить релизы');
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });

        return () => { cancelled = true; };
    }, [api]);

    return <section className={styles.page}>
        <header className={styles.header}>
            <button className={styles.back} type="button" onClick={() => navigate(-1)} aria-label="Назад"><img src={ArrowLeftIcon} alt="" /></button>
            <h1>Уведомления по релизам</h1>
        </header>

        {isLoading && <p className={styles.message}>Загружаем релизы…</p>}
        {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        {!isLoading && !error && releases.length === 0 && <p className={styles.message}>Для отдельных релизов уведомления пока не настроены.</p>}

        <div className={styles.list}>
            {releases.map(release => <article className={styles.release} key={release.id}>
                <Link to={`/anime/${release.id}`} className={styles.poster}><RemoteImage src={release.image} alt="" /></Link>
                <div className={styles.copy}>
                    <Link to={`/anime/${release.id}`}>{release.title_ru}</Link>
                    <p>{release.episodes_released} эп. · {release.grade.toFixed(1)} ★</p>
                    <small>Выбрано озвучек: {release.profile_release_type_notification_preference_count}</small>
                </div>
            </article>)}
        </div>
    </section>;
}
