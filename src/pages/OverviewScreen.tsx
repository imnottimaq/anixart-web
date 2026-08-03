import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import AnimeCardHorizontal from '../components/AnimeCardHorizontal';
import RemoteImage from '../components/RemoteImage';
import { useApi } from '../shared/apiClient';
import type { Anime, Comment, DiscoverInteresting, PagedResponse } from '../shared/types/api';
import leftArrowIcon from '../assets/icons/left-arrow.svg';
import rightArrowIcon from '../assets/icons/right-arrow.svg';
import styles from './OverviewScreen.module.css';

type DiscoverComment = Omit<Comment, 'release'> & {
    release?: { id: number; title_ru: string } | null;
    parent_comment_id?: number | null;
};

type OverviewData = {
    interesting: DiscoverInteresting[];
    recommendations: Anime[];
    watching: Anime[];
    discussing: Anime[];
    comments: DiscoverComment[];
};

const EMPTY_DATA: OverviewData = {
    interesting: [], recommendations: [], watching: [], discussing: [], comments: [],
};

export default function OverviewScreen() {
    const api = useApi();
    const [data, setData] = useState<OverviewData>(EMPTY_DATA);
    const [isLoading, setIsLoading] = useState(true);
    const [activeInterestingIndex, setActiveInterestingIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const get = <T,>(path: string) => api.get<PagedResponse<T>>(path)
            .catch(() => api.getViaAgent<PagedResponse<T>>(path));

        void Promise.allSettled([
            get<DiscoverInteresting>('/discover/interesting'),
            get<Anime>('/discover/recommendations/-1'),
            get<Anime>('/discover/watching/0'),
            get<Anime>('/discover/discussing'),
            get<DiscoverComment>('/discover/comments'),
        ] as const).then(([interesting, recommendations, watching, discussing, comments]) => {
            if (cancelled) return;
            setData({
                interesting: getContent(interesting),
                recommendations: getContent(recommendations),
                watching: getContent(watching),
                discussing: getContent(discussing),
                comments: resolveCommentReleases(getContent(comments)),
            });
            setActiveInterestingIndex(0);
        }).finally(() => {
            if (!cancelled) setIsLoading(false);
        });

        return () => { cancelled = true; };
    }, [api]);

    return <main className={styles.page}>
        {isLoading && <div className={styles.loading} role="status"><span />Загружаем обзор…</div>}

        {!isLoading && <>
            {(data.interesting.length > 0 || data.discussing.length > 0) && <div className={styles.topLayout}>
                {data.interesting.length > 0 && <section className={styles.featured}>
                    <SectionTitle title="Интересное" />
                    <div className={styles.gallery}>
                        <FeaturedItem key={data.interesting[activeInterestingIndex].id} item={data.interesting[activeInterestingIndex]} />
                        {data.interesting.length > 1 && <>
                            <button
                                type="button"
                                className={`${styles.galleryButton} ${styles.galleryPrevious}`}
                                aria-label="Предыдущий баннер"
                                onClick={() => setActiveInterestingIndex(index => (index - 1 + data.interesting.length) % data.interesting.length)}
                            ><img src={leftArrowIcon} alt="" /></button>
                            <button
                                type="button"
                                className={`${styles.galleryButton} ${styles.galleryNext}`}
                                aria-label="Следующий баннер"
                                onClick={() => setActiveInterestingIndex(index => (index + 1) % data.interesting.length)}
                            ><img src={rightArrowIcon} alt="" /></button>
                        </>}
                    </div>
                </section>}

                {data.discussing.length > 0 && <section className={styles.topDiscussing}>
                    <SectionTitle title="Сейчас обсуждают" />
                    <div className={styles.releaseList}>
                        {data.discussing.map(anime => <AnimeCardHorizontal key={anime.id} anime={anime} compact />)}
                    </div>
                </section>}
            </div>}

            <section className={styles.section}>
                <SectionTitle title="Рекомендуем тебе" description="Релизы, которые могут тебе понравиться" />
                {data.recommendations.length > 0
                    ? <div className={styles.posterRail}>
                        {data.recommendations.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
                    </div>
                    : <p className={styles.recommendationsEmpty}>Оцените хотя бы 20 релизов, чтобы получить персональные рекомендации.</p>}
            </section>

            {data.watching.length > 0 && <section className={styles.section}>
                <SectionTitle title="Сейчас смотрят" />
                <div className={styles.posterRail}>
                    {data.watching.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
                </div>
            </section>}

            {data.comments.length > 0 && <section className={styles.section}>
                <SectionTitle title="Комментарии недели" />
                <div className={styles.comments}>
                    {data.comments.slice(0, 6).map(comment => <CommentPreview key={comment.id} comment={comment} />)}
                </div>
            </section>}

            {!data.interesting.length && !data.recommendations.length && !data.watching.length && !data.discussing.length && <p className={styles.empty}>Пока нечего показать. Попробуй открыть страницу позже.</p>}
        </>}
    </main>;
}

function getContent<T>(result: PromiseSettledResult<PagedResponse<T>>): T[] {
    return result.status === 'fulfilled' ? result.value.content ?? [] : [];
}

function resolveCommentReleases(comments: DiscoverComment[]): DiscoverComment[] {
    const commentsById = new Map(comments.map(comment => [comment.id, comment]));

    const getRelease = (comment: DiscoverComment, checked = new Set<number>()): DiscoverComment['release'] => {
        if (comment.release) return comment.release;
        if (!comment.parent_comment_id || checked.has(comment.id)) return null;

        checked.add(comment.id);
        const parent = commentsById.get(comment.parent_comment_id);
        return parent ? getRelease(parent, checked) : null;
    };

    return comments.map((comment, index) => {
        if (comment.release) return comment;

        const parentRelease = getRelease(comment);
        if (parentRelease) return { ...comment, release: parentRelease };

        const previousRelease = comments.slice(0, index).reverse()
            .find(previous => previous.release)?.release ?? null;
        return { ...comment, release: previousRelease };
    });
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
    return <div className={styles.sectionTitle}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
    </div>;
}

function FeaturedItem({ item }: { item: DiscoverInteresting }) {
    const content = <>
        <RemoteImage src={item.image} alt="" />
        <span className={styles.featuredShade} />
        <span className={styles.featuredText}>
            <strong>{item.title}</strong>
            {item.description && <small>{item.description}</small>}
        </span>
    </>;

    return item.action > 0
        ? <Link to={`/anime/${item.action}`} className={styles.featuredItem}>{content}</Link>
        : <article className={styles.featuredItem}>{content}</article>;
}

function CommentPreview({ comment }: { comment: DiscoverComment }) {
    const releaseId = Number(comment.release?.id);
    const canOpenRelease = Number.isInteger(releaseId) && releaseId > 0;
    const content = <>
        <RemoteImage className={styles.commentAvatar} src={comment.profile.avatar} alt="" />
        <span className={styles.commentBody}>
            <span><b>{comment.profile.login}</b>{comment.release && <> · {comment.release.title_ru}</>}</span>
            <span className={styles.commentMessage}>{comment.message}</span>
        </span>
        {comment.vote_count > 0 && <em className={styles.commentRating}>{comment.vote_count}</em>}
    </>;

    return canOpenRelease
        ? <Link className={styles.comment} to={`/anime/${releaseId}`}>{content}</Link>
        : <article className={styles.comment}>{content}</article>;
}
