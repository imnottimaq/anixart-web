import { useEffect, useState } from "react";
import styles from "./SearchBar.module.css"
import { type Anime } from "../shared/types/api";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../shared/contexts/settingsContext";
import { useSearchScope, type SearchScope } from "../shared/contexts/searchContext";
import AnimeCard from "./AnimeCard";
import AnimeCardHorizontal from "./AnimeCardHorizontal";
import SearchIcon from "../assets/icons/search.svg";
import RemoteImage from './RemoteImage';
import { useTranslation } from '../shared/useTranslation';
import { useApi } from '../shared/apiClient';

interface ReleaseSearchResponse{
  code: number;
  related? : {
    id: number,
    name: string,
    name_ru: string,
    description: string,
    images: string[],
    release_count: number,
  }
  releases: Anime[];
}

interface SearchProfile {
    id: number;
    login: string;
    avatar: string | null;
    status: string | null;
    rating_score: number | null;
}

interface ProfileSearchResponse {
    code: number;
    profiles: SearchProfile[];
    total_count: number;
    total_page_count: number;
    current_page: number;
}

type SearchResults = ReleaseSearchResponse | ProfileSearchResponse;

export default function SearchButton(){
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResults>();
    const [isLoading, setIsLoading] = useState(false);
    const {settings} = useSettings()
    const { t } = useTranslation();
    const { searchScope } = useSearchScope();
    const api = useApi();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const navigate = useNavigate()

    const setHistory = (query: string) => {
        const value = query.trim();
        if (!value) return;

        const oldHistory = JSON.parse(
            localStorage.getItem('search_history') ?? '[]'
        ) as string[];

        const nextHistory = [
            value,
            ...oldHistory.filter(i => i.toLowerCase() !== value.toLowerCase()),
        ].slice(0, 10);

        localStorage.setItem('search_history', JSON.stringify(nextHistory));
    }

    useEffect(() => {
        const value = query.trim();
        if (!value) return;

        const timer = window.setTimeout(() => {
            setIsLoading(true);
            GetSearchResults(value, searchScope, api, settings.content.proxySearchThroughShikimori)
                .then(data => {
                    setIsSearchOpen(true);
                    setSearchResults(data);
                    setHistory(value);
                })
                .catch(error => console.error('Не удалось выполнить поиск:', error))
                .finally(() => {
                    setIsLoading(false);
                });
        }, 500)

        return () => window.clearTimeout(timer)
    }, [api, query, searchScope, settings.content.proxySearchThroughShikimori])

    const clearSearch = () => {
        setQuery('');
        setSearchResults(undefined);
        setIsSearchOpen(false);
    }

    const isProfileSearch = searchScope.type === 'profiles';
    const profileResults = searchResults && 'profiles' in searchResults ? searchResults.profiles : [];
    const releaseResults = searchResults && 'releases' in searchResults ? searchResults : undefined;

    return (
        <div className={styles.search}>
            <label className={styles['search-field']}>
                <img className={styles['search-icon']} src={SearchIcon} alt="" />
                <input
                    value={query}
                    onChange={e => {
                        const value = e.target.value;
                        setQuery(value);
                        setIsSearchOpen(Boolean(value.trim()));
                    }}
                    placeholder={isProfileSearch ? t('search.users') : t('search.anime')}
                    aria-label={isProfileSearch ? t('search.users') : t('search.anime')}
                />
                {query && <button
                    type="button"
                    className={styles['clear-button']}
                    onClick={clearSearch}
                    aria-label={t('search.clear')}
                >×</button>}
            </label>
            {isSearchOpen && <div className={styles['search-overlay']}>
                <div className={styles['search-content']}>
                    {isLoading && <p className={styles.message}>{t('search.waiting')}</p>}
                    {!isLoading && releaseResults?.related && <button type="button" className={styles['related-release']} onClick={() => navigate(`/franchise/${releaseResults.related?.id || 0}`)}>
                        <span className={styles['related-posters']} aria-hidden="true">
                            {releaseResults.related.images.slice(0, 3).map((image) => (
                                <RemoteImage key={image} src={image} alt="" />
                            ))}
                        </span>
                        <span className={styles['related-info']}>
                            <strong>{releaseResults.related.name_ru}</strong>
                            <small>{releaseResults.related.release_count} {t('search.franchiseReleases')}</small>
                            <small>{releaseResults.related.description}</small>
                        </span>
                    </button>}
                    {!isLoading && releaseResults && <div className={`${styles.results} ${settings.appearance.defaultCardType === 'horizontal' ? styles['horizontal-results'] : ''}`}>
                        {releaseResults.releases.map(item => (
                            <div key={item.id} onClick={() => setIsSearchOpen(false)}>
                                {settings.appearance.defaultCardType === 'vertical'
                                    ? <AnimeCard key={item.id} anime={item} />
                                    : <AnimeCardHorizontal key={item.id} anime={item} />}</div>
                        ))}
                    </div>}
                    {!isLoading && isProfileSearch && profileResults.length > 0 && <div className={styles['profile-results']}>
                        {profileResults.map(profile => (
                            <button key={profile.id} type="button" className={styles['profile-result']} onClick={() => {
                                clearSearch();
                                navigate(`/account/${profile.id}`);
                            }}>
                                {profile.avatar
                                    ? <RemoteImage src={profile.avatar} alt="" />
                                    : <span className={styles['profile-avatar-placeholder']}>{profile.login[0]?.toUpperCase()}</span>}
                                <span className={styles['profile-info']}>
                                    <strong>{profile.login}</strong>
                                    {profile.status && <small>{profile.status}</small>}
                                </span>
                                {typeof profile.rating_score === 'number' && <span className={styles['profile-rating']}>{profile.rating_score}</span>}
                            </button>
                        ))}
                    </div>}
                    {!isLoading && searchResults && (isProfileSearch ? profileResults.length === 0 : releaseResults?.releases.length === 0) && <p className={styles.message}>{t('search.empty')}</p>}
                </div>
            </div>}
        </div>
    )
}

async function GetSearchResults(
    query: string,
    searchScope: SearchScope,
    api: ReturnType<typeof useApi>,
    useShikimoriProxy: boolean,
): Promise<SearchResults> {
    const endpoint = searchScope.type === 'profiles'
        ? '/search/profiles/0'
        : searchScope.type === 'favorites'
            ? '/search/favorites/0'
            : searchScope.type === 'history'
                ? '/search/history/0'
                : searchScope.type === 'profileList'
                    ? `/search/profile/list/${searchScope.list}/0`
                    : '/search/releases/0';
    const searchQuery = useShikimoriProxy && searchScope.type === 'releases'
        ? await getShikimoriSearchQuery(query)
        : query;

    const data = await api.post<{
        code: number;
        related?: ReleaseSearchResponse['related'];
        releases?: Anime[];
        profiles?: SearchProfile[];
        content?: Anime[] | SearchProfile[];
        total_count?: number;
        total_page_count?: number;
        current_page?: number;
    }>(endpoint, { query: searchQuery, searchBy: 0 }, { 'Api-Version': 'v2' });
    if (data.code === 0) {
        if (searchScope.type === 'profiles') {
            return {
                code: data.code,
                profiles: (data.profiles ?? data.content ?? []) as SearchProfile[],
                total_count: data.total_count ?? 0,
                total_page_count: data.total_page_count ?? 0,
                current_page: data.current_page ?? 0,
            };
        }
        return {
            code: data.code,
            related: data.related,
            releases: (data.releases ?? data.content ?? []) as Anime[],
        };
    }
    throw new Error("Error while performing search: " + data.code)
}

type ShikimoriSearchResponse = {
    data?: {
        animes?: Array<{
            name?: string | null;
            russian?: string | null;
        }>;
    };
    errors?: Array<{ message?: string }>;
};

async function getShikimoriSearchQuery(query: string) {
    try {
        const response = await fetch('https://shikimori.one/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query SearchAnime($search: String!) {
                    animes(search: $search, limit: 1) { name russian }
                }`,
                variables: { search: query },
            }),
        });

        if (!response.ok) return query;

        const data = await response.json() as ShikimoriSearchResponse;
        const anime = data.data?.animes?.[0];
        return anime?.russian?.trim() || anime?.name?.trim() || query;
    } catch {
        return query;
    }
}
