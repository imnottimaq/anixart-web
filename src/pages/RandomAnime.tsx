import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Anime } from '../shared/types/api';
import { useTranslation } from '../shared/useTranslation';
import { useApi } from '../shared/apiClient';

export default function RandomAnime() {
    const navigate = useNavigate();
    const api = useApi();
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

        api.get<{ code: number; release: Anime }>('/release/random?extended_mode=true', { signal: controller.signal })
            .then(({ release }) => {
                if (!release?.id) throw new Error('Сервер вернул релиз без ID.');
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
    }, [api, navigate, t]);

    return (
        <div style={{ display: 'grid', minHeight: '50vh', placeItems: 'center', textAlign: 'center' }}>
            {error ? <p>{error}</p> : <p>{t('random.searching')}</p>}
        </div>
    );
}
