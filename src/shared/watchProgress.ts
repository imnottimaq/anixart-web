export const WATCH_PROGRESS_STORAGE_KEY = 'watch_progress';

export type WatchProgress = Record<string, Record<string, number>>;

export function getWatchProgress(): WatchProgress {
    try {
        const rawProgress = localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY);
        return rawProgress ? JSON.parse(rawProgress) : {};
    } catch {
        return {};
    }
}

export function saveWatchProgress(animeId: number, episodeKey: string, seconds: number) {
    const progress = getWatchProgress();
    const animeProgress = progress[String(animeId)] ?? {};

    progress[String(animeId)] = {
        ...animeProgress,
        [episodeKey]: seconds,
    };

    localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function clearWatchProgress(animeId: number, episodeKey: string) {
    const progress = getWatchProgress();
    const animeKey = String(animeId);
    const animeProgress = progress[animeKey];

    if (!animeProgress || !(episodeKey in animeProgress)) return;

    delete animeProgress[episodeKey];

    if (Object.keys(animeProgress).length === 0) {
        delete progress[animeKey];
    }

    localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
