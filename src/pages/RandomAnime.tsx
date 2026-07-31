import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../shared/contexts/userContext';
import { type Anime } from '../shared/types/api';
import { useTranslation } from '../shared/useTranslation';

export default function RandomAnime() {
    const navigate = useNavigate();
    const { userToken } = useUser();
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const controller = new AbortController();
        let isCurrentRequest = true;
        let hasTimedOut = false;
        const timeoutId = window.setTimeout(() => {
            hasTimedOut = true;
            controller.abort();
        }, 15_000);

        getRandomRelease(userToken, controller.signal)
            .then((release) => {
                navigate(`/anime/${release.id}`, {
                    replace: true,
                    state: { partialAnime: release },
                });
            })
            .catch((requestError: unknown) => {
                if (!isCurrentRequest) return;
                if (hasTimedOut) {
                    setError(t('random.timeout'));
                    return;
                }
                setError(requestError instanceof Error ? requestError.message : t('random.loadError'));
            })
            .finally(() => window.clearTimeout(timeoutId));

        return () => {
            isCurrentRequest = false;
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [navigate, t, userToken]);

    return (
        <div style={{ display: 'grid', minHeight: '50vh', placeItems: 'center', textAlign: 'center' }}>
            {error ? <p>{error}</p> : <p>{t('random.searching')}</p>}
        </div>
    );
}

async function getRandomRelease(token: string, signal: AbortSignal): Promise<Anime> {
    const response = await fetch(
        `https://api-s.anixsekai.com/release/random?extended_mode=true&token=${token}`,
        { signal },
    );
    if (!response.ok) throw new Error(`Не удалось получить случайное аниме: ${response.status}`);

    const data: { release?: Anime } = await response.json();
    if (!data.release?.id) throw new Error('Сервер вернул релиз без ID.');

    return data.release;
}
