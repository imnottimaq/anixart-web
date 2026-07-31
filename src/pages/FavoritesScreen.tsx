import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import AnimeCardHorizontal from '../components/AnimeCardHorizontal';
import SortSelect, { type ReleaseSort } from '../components/SortSelect';
import { type Anime } from '../shared/types/api';
import { emptyTab, type TabData } from '../shared/types/internal';
import { useUser } from '../shared/contexts/userContext';
import { useSettings } from '../shared/contexts/settingsContext';
import { useSearchScope, type SearchScope } from '../shared/contexts/searchContext';
import styles from './LatestReleasesScreen.module.css';
import { useTranslation } from '../shared/useTranslation';

type ProfilePage = 'favorites' | 'history' | 'watching' | 'planned' | 'completed' | 'onHold' | 'dropped';

const PAGE_ITEMS: { page: ProfilePage; buttonText: 'nav.favorites' | 'home.history' | 'status.watching' | 'status.planned' | 'status.watched' | 'status.hold_on' | 'status.dropped' }[] = [
    { page: 'favorites', buttonText: 'nav.favorites' }, { page: 'history', buttonText: 'home.history' }, { page: 'watching', buttonText: 'status.watching' }, { page: 'planned', buttonText: 'status.planned' }, { page: 'completed', buttonText: 'status.watched' }, { page: 'onHold', buttonText: 'status.hold_on' }, { page: 'dropped', buttonText: 'status.dropped' },
];

const PROFILE_LIST_IDS: Record<Exclude<ProfilePage, 'favorites' | 'history'>, number> = {
    watching: 1,
    planned: 2,
    completed: 3,
    onHold: 4,
    dropped: 5,
};

const API_SORT_VALUES: Record<ReleaseSort, number> = {
    addedDesc: 1,
    addedAsc: 2,
    yearDesc: 3,
    yearAsc: 4,
    titleAsc: 5,
    titleDesc: 6,
};

const SEARCH_SCOPES: Record<ProfilePage, SearchScope> = {
    favorites: { type: 'favorites' },
    history: { type: 'history' },
    watching: { type: 'profileList', list: 1 },
    planned: { type: 'profileList', list: 2 },
    completed: { type: 'profileList', list: 3 },
    onHold: { type: 'profileList', list: 4 },
    dropped: { type: 'profileList', list: 5 },
};

function createTabs(): Record<ProfilePage, TabData> {
    return {
        favorites: emptyTab(),
        history: emptyTab(),
        watching: emptyTab(),
        planned: emptyTab(),
        completed: emptyTab(),
        onHold: emptyTab(),
        dropped: emptyTab(),
    };
}

export default function FavoritesScreen() {
    const { userToken } = useUser();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { setSearchScope } = useSearchScope();
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const loadingRequestsRef = useRef(new Set<string>());
    const sortVersionRef = useRef(0);
    const [activePage, setActivePage] = useState<ProfilePage>('favorites');
    const [sort, setSort] = useState<ReleaseSort>('addedDesc');
    const [tabs, setTabs] = useState<Record<ProfilePage, TabData>>(createTabs);

    const activeTab = tabs[activePage];
    const currentPageIsLoaded = activeTab.loadedPages.includes(activeTab.page);
    const isInitialLoading = activeTab.isLoading && activeTab.releases.length === 0;
    const isLoadingMore = activeTab.isLoading && activeTab.releases.length > 0;

    useEffect(() => {
        setSearchScope(SEARCH_SCOPES[activePage]);
        return () => setSearchScope({ type: 'releases' });
    }, [activePage, setSearchScope]);

    const handleSortChange = (nextSort: ReleaseSort) => {
        if (nextSort === sort) return;

        sortVersionRef.current += 1;
        setSort(nextSort);
        setTabs(createTabs());
    };

    useEffect(() => {
        if (!userToken) return;
        if (!activeTab.hasMore || currentPageIsLoaded) return;

        const requestedPage = activeTab.page;
        const sortVersion = sortVersionRef.current;
        const requestKey = `${activePage}:${requestedPage}:${sortVersion}`;
        if (loadingRequestsRef.current.has(requestKey)) return;

        loadingRequestsRef.current.add(requestKey);
        setTabs(previousTabs => ({
            ...previousTabs,
            [activePage]: {
                ...previousTabs[activePage],
                isLoading: true,
            },
        }));

        getReleasesForTab(activePage, requestedPage, userToken, sort)
            .then(newReleases => {
                if (sortVersion !== sortVersionRef.current) return;

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
                if (sortVersion !== sortVersionRef.current) return;
                console.error('Не удалось загрузить список:', error);
                setTabs(previousTabs => ({
                    ...previousTabs,
                    [activePage]: {
                        ...previousTabs[activePage],
                        isLoading: false,
                    },
                }));
            })
            .finally(() => loadingRequestsRef.current.delete(requestKey));
    }, [activePage, activeTab.hasMore, activeTab.page, currentPageIsLoaded, sort, userToken]);

    useEffect(() => {
        if (!currentPageIsLoaded || activeTab.isLoading || !activeTab.hasMore) return;

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
    }, [activePage, activeTab.hasMore, activeTab.isLoading, activeTab.page, currentPageIsLoaded]);

    return (
        <div className={styles.body}>
            <div className={styles['side-panel']}>
                {PAGE_ITEMS.map(({ page, buttonText }) => (
                    <button
                        key={page}
                        className={activePage === page ? styles.active : ''}
                        onClick={() => setActivePage(page)}
                    >
                        {t(buttonText)}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                <div className={styles['sort-toolbar']}>
                    <SortSelect value={sort} onChange={handleSortChange} />
                </div>
                <div className={`${styles['releases-grid']} ${settings.appearance.defaultCardType === 'horizontal' ? styles['horizontal-grid'] : ''}`}>
                    {activeTab.releases.map(anime => (
                        settings.appearance.defaultCardType === 'vertical'
                            ? <AnimeCard key={anime.id} anime={anime} />
                            : <AnimeCardHorizontal key={anime.id} anime={anime} />
                    ))}
                    <div ref={triggerRef} style={{ height: '20px', background: 'transparent' }} />
                    {isLoadingMore && <div className={styles['loading-more']} role="status">{t('misc.loading')}</div>}
                </div>
            </div>

            {isInitialLoading && <div className={styles['loading-overlay']} role="status" aria-label={t('misc.loading')} />}
            {!userToken && <div className={styles['auth-overlay']} role="dialog" aria-modal="true" aria-label={t('auth.login')}>
                <div className={styles['auth-card']}>
                    <h2>{t('auth.loginTitle')}</h2>
                    <p>{t('release.loginToChangeStatus')}</p>
                    <button type="button" onClick={() => navigate('/account/login')}>{t('auth.login')}</button>
                </div>
            </div>}
        </div>
    );
}

async function getReleasesForTab(page: ProfilePage, currentPage: number, token: string, sort: ReleaseSort): Promise<Anime[]> {
    const query = `extended_mode=true&token=${token}&sort=${API_SORT_VALUES[sort]}`;
    const url = page === 'favorites'
        ? `https://api-s.anixsekai.com/favorite/all/${currentPage}?${query}`
        : page === 'history'
            ? `https://api-s.anixsekai.com/history/${currentPage}?${query}`
            : `https://api-s.anixsekai.com/profile/list/all/${PROFILE_LIST_IDS[page]}/${currentPage}?${query}`;

    const response = await fetch(url);

    if (!response.ok) throw new Error(`Не удалось загрузить список: ${response.status}`);
    const data = await response.json();
    const content = data.content ?? data.history ?? [];
    return content.map((item: Anime | { release: Anime }) => 'release' in item ? item.release : item);
}
