import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../shared/contexts/userContext';
import { type Anime } from '../shared/types/api';

export default function RandomAnime() {
    const navigate = useNavigate();
    const { userToken } = useUser();
    const [error, setError] = useState<string | null>(null);

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
                    setError('Сервер слишком долго отвечает.');
                    return;
                }
                setError(requestError instanceof Error ? requestError.message : 'Не удалось получить случайное аниме.');
            })
            .finally(() => window.clearTimeout(timeoutId));

        return () => {
            isCurrentRequest = false;
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [navigate, userToken]);

    return (
        <div style={{ display: 'grid', minHeight: '50vh', placeItems: 'center', textAlign: 'center' }}>
            {error ? <p>{error}</p> : <p>Ищем случайное аниме…</p>}
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
