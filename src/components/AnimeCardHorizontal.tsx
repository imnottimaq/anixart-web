import { Link } from "react-router-dom";
import { useState } from 'react';
import styles from "./AnimeCardHorizontal.module.css"
import { type Anime } from "../shared/types/api";
import { profileListStatus } from "../shared/profileListStatus"
import starIcon from '../assets/icons/star.svg'
import RemoteImage from './RemoteImage';
import { useSettings } from '../shared/contexts/settingsContext';

export interface AnimeCardProps {
  anime: Anime;
  compact?: boolean;
}

export default function AnimeCardHorizontal({ anime, compact = false }: AnimeCardProps) {
  const { settings } = useSettings();
  const listStatus = profileListStatus[anime.profile_list_status as 0 | 1 | 2 | 3 | 4 | 5];
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const isImageLoaded = loadedImage === anime.image;
  const title = settings.appearance.language === 'english' && anime.title_original
    ? anime.title_original
    : anime.title_ru;

  return (
    <Link to={`/anime/${anime.id}`} state={{partialAnime: anime}} key={anime.id} className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={`${styles.poster} ${isImageLoaded ? styles['poster-loaded'] : styles['poster-loading']}`}>
        <RemoteImage
          src={anime.image}
          alt={title}
          loading="lazy"
          onLoad={() => setLoadedImage(anime.image)}
          onError={() => setLoadedImage(anime.image)}
        />
        {listStatus && <span className={`${styles['list-status']} ${styles[`status-${listStatus.color}`]}`}>{listStatus.label}</span>}
      </div>
      <div className={styles.info}>
        <p className={styles['anime-title']}>{title}</p>
        <p className={styles['anime-meta']}>
          {anime.episodes_released || "?"} из {anime.episodes_total || "?"} эп.
          {anime.grade !== 0 && <span className={styles['anime-rating']}><img src={starIcon} alt="" />{anime.grade.toFixed(2)}</span>}
        </p>
        {anime.description && <p className={styles['anime-description']}>{anime.description}</p>}
        {compact && anime.comment_per_day_count > 0 && <p className={styles['comment-activity']}>
          {anime.comment_per_day_count} {getCommentWord(anime.comment_per_day_count)} за сутки
        </p>}
      </div>
    </Link>
  );
}

function getCommentWord(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'комментариев';
  if (lastDigit === 1) return 'комментарий';
  if (lastDigit >= 2 && lastDigit <= 4) return 'комментария';
  return 'комментариев';
}
