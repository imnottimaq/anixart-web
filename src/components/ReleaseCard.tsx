import { Link } from 'react-router-dom';
import { type Anime } from '../shared/types/api';
import styles from './ReleaseCard.module.css';
import starIcon from '../assets/icons/star.svg';
import RemoteImage from './RemoteImage';

type RelatedReleaseCardProps = {
    variant: 'related';
    anime: Anime;
};

type ProfileReleaseCardProps = {
    variant: 'rated' | 'history';
    name: string;
    poster: string;
    grade: number;
    timestamp: number;
};

type ReleaseCardProps = RelatedReleaseCardProps | ProfileReleaseCardProps;

export default function ReleaseCard(props: ReleaseCardProps) {
    const isRelated = props.variant === 'related';
    const name = isRelated ? props.anime.title_ru : props.name;
    const poster = isRelated ? props.anime.image : props.poster;

    const content = (
        <article className={styles['release-card']}>
            <RemoteImage src={poster} loading="lazy" alt="" />
            <div className={styles['release-content']}>
                <p className={styles.title}>{name}</p>
                {isRelated ? <>
                    <div className={styles['meta-row']}>
                        <span>{props.anime.year} г.</span>
                        <span className={styles['release-rating']}><img src={starIcon} alt="" />{props.anime.grade.toFixed(2)}</span>
                    </div>
                    {props.anime.category?.name && <span className={styles.category}>{props.anime.category.name}</span>}
                </> : <div className={styles['meta-row']}>
                    {props.variant === 'rated'
                        ? <span className={styles.stars} aria-label={`Оценка: ${props.grade} из 5`}>
                            {Array.from({ length: Math.max(0, Math.min(5, Math.round(props.grade))) }, (_, index) => (
                                <img key={index} src={starIcon} alt="" />
                            ))}
                        </span>
                        : <span>{props.grade} серия</span>}
                    <span>{formatTimestamp(props.timestamp)}</span>
                </div>}
            </div>
        </article>
    );

    return isRelated
        ? <Link to={`/anime/${props.anime.id}`} className={styles.link}>{content}</Link>
        : content;
}

function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
