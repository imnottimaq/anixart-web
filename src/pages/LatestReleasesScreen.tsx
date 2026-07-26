import { useEffect, useRef, useState } from 'react';
import AnimeCard from '../components/AnimeCard';
import AnimeCardHorizontal from '../components/AnimeCardHorizontal';
import { type Anime, type Filter } from '../shared/types/api';
import { emptyTab, type Page, type TabData } from '../shared/types/internal';
import { useUser } from '../shared/contexts/userContext';
import { useSettings } from '../shared/contexts/settingsContext';
import styles from './LatestReleasesScreen.module.css';

const PAGE_ITEMS: { page: Page; buttonText: string }[] = [
    { page: 'my', buttonText: 'Моя вкладка' },
    { page: 'latest', buttonText: 'Последнее' },
    { page: 'ongoing', buttonText: 'Онгоинги' },
    { page: 'announced', buttonText: 'Анонсы' },
    { page: 'ended', buttonText: 'Завершённые' },
    { page: 'films', buttonText: 'Фильмы' },
];

const DEFAULT_FILTERS: Record<Exclude<Page, 'my'>, Filter> = {
    latest: {},
    ongoing: { status_id: 2 },
    announced: { status_id: 3 },
    ended: { status_id: 1 },
    films: { category_id: 2 },
};

function createTabs(): Record<Page, TabData> {
    return {
        my: emptyTab(),
        latest: emptyTab(),
        ongoing: emptyTab(),
        announced: emptyTab(),
        ended: emptyTab(),
        films: emptyTab(),
    };
}

function getMyFilters(): Filter {
    try {
        const saved = localStorage.getItem('my_filters');
        return saved ? JSON.parse(saved) as Filter : {};
    } catch {
        return {};
    }
}

export default function LatestReleasesScreen() {
    const { userToken } = useUser();
    const { settings } = useSettings();
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const loadingRequestsRef = useRef(new Set<string>());
    const [activePage, setActivePage] = useState<Page>('latest');
    const [myFilters] = useState<Filter>(getMyFilters);
    const [tabs, setTabs] = useState<Record<Page, TabData>>(createTabs);

    const activeTab = tabs[activePage];
    const activeFilter = activePage === 'my' ? myFilters : DEFAULT_FILTERS[activePage];
    const currentPageIsLoaded = activeTab.loadedPages.includes(activeTab.page);
    const isMyTabUnconfigured = activePage === 'my' && Object.keys(myFilters).length === 0;

    useEffect(() => {
        if (isMyTabUnconfigured || !activeTab.hasMore || currentPageIsLoaded) return;

        const requestedPage = activeTab.page;
        const requestKey = `${activePage}:${requestedPage}`;
        if (loadingRequestsRef.current.has(requestKey)) return;

        loadingRequestsRef.current.add(requestKey);

        setTabs(previousTabs => ({
            ...previousTabs,
            [activePage]: {
                ...previousTabs[activePage],
                isLoading: true,
            },
        }));

        GetReleasesByPage(requestedPage, userToken, activeFilter)
            .then(data => {
                const newReleases = data.content as Anime[];
                setTabs(previousTabs => {
                    const previousTab = previousTabs[activePage];
                    const existingIds = new Set(previousTab.releases.map(anime => anime.id));
                    const uniqueReleases = newReleases.filter(anime => !existingIds.has(anime.id));

                    return {
                        ...previousTabs,
                        [activePage]: {
                            ...previousTab,
                            releases: [...previousTab.releases, ...uniqueReleases],
                            loadedPages: [...previousTab.loadedPages, requestedPage],
                            isLoading: false,
                            hasMore: newReleases.length > 0,
                        },
                    };
                });
            })
            .catch(error => {
                console.error('Не удалось загрузить релизы:', error);
                setTabs(previousTabs => ({
                    ...previousTabs,
                    [activePage]: {
                        ...previousTabs[activePage],
                        isLoading: false,
                    },
                }));
            })
            .finally(() => {
                loadingRequestsRef.current.delete(requestKey);
            });
    }, [activeFilter, activePage, activeTab.hasMore, activeTab.page, currentPageIsLoaded, isMyTabUnconfigured, userToken]);

    useEffect(() => {
        if (isMyTabUnconfigured || !currentPageIsLoaded || activeTab.isLoading || !activeTab.hasMore) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0]?.isIntersecting) return;

            setTabs(previousTabs => {
                const tab = previousTabs[activePage];
                if (tab.isLoading || !tab.hasMore || !tab.loadedPages.includes(tab.page)) return previousTabs;

                return {
                    ...previousTabs,
                    [activePage]: {
                        ...tab,
                        page: tab.page + 1,
                    },
                };
            });
        }, { rootMargin: '200px' });

        const trigger = triggerRef.current;
        if (trigger) observer.observe(trigger);

        return () => observer.disconnect();
    }, [activePage, activeTab.hasMore, activeTab.isLoading, activeTab.page, currentPageIsLoaded, isMyTabUnconfigured]);

    return (
        <div className={styles.body}>
            <div className={styles['side-panel']}>
                {PAGE_ITEMS.map(({ page, buttonText }) => (
                    <button
                        key={page}
                        className={activePage === page ? styles.active : ''}
                        onClick={() => setActivePage(page)}
                    >
                        {buttonText}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                {isMyTabUnconfigured ? (
                    <div className={styles['empty-my-tab']}>
                        <button type="button" className={styles['configure-button']}>Настроить</button>
                    </div>
                ) : (
                    <div className={styles['releases-grid']}>
                        {activeTab.releases.map(anime => (
                            settings.appearance.defaultCardType === 'vertical'
                                ? <AnimeCard key={anime.id} anime={anime} />
                                : <AnimeCardHorizontal key={anime.id} anime={anime} />
                        ))}
                        <div ref={triggerRef} style={{ height: '20px', background: 'transparent' }} />
                    </div>
                )}
            </div>

            {activeTab.isLoading && <div className={styles['loading-overlay']} />}
        </div>
    );
}

async function GetReleasesByPage(page: number, token: string, filter: Filter) {
    const response = await fetch(`https://api-s.anixsekai.com/filter/${page}?extended_mode=true&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter),
    });

    if (response.ok) return response.json();
    throw new Error(`Error while trying to fetch releases: ${response.status}`);
}
