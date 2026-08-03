import { Link } from "react-router-dom";
import { useState } from 'react';
import styles from "./AnimeCard.module.css"
import { type Anime } from "../shared/types/api";
import { profileListStatus } from "../shared/profileListStatus"
import starIcon from '../assets/icons/star.svg'
import RemoteImage from './RemoteImage';
import { useSettings } from '../shared/contexts/settingsContext';

export interface AnimeCardProps { anime: Anime; }

export default function AnimeCard({ anime }: AnimeCardProps) {
  const { settings } = useSettings();
  const listStatus = profileListStatus[anime.profile_list_status as 0 | 1 | 2 | 3 | 4 | 5];
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const isImageLoaded = loadedImage === anime.image;
  const title = settings.appearance.language === 'english' && anime.title_original
    ? anime.title_original
    : anime.title_ru;

  return (
    <Link to={`/anime/${anime.id}`} state={{partialAnime: anime}} key={anime.id} className={styles.card}>
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
      <p className={styles['anime-title']}>{title.length > 50 ? title.slice(0,49)+"..." : title}</p>
      <p className={styles['anime-meta']}>
        {anime.episodes_released || "?"} из {anime.episodes_total || "?"} эп.
        {anime.grade !== 0 && <span className={styles['anime-rating']}><img src={starIcon} alt="" />{anime.grade.toFixed(2)}</span>}
      </p>
      {anime.description && <p className={styles['anime-description']}>{anime.description}</p>}
    </Link>
  );
}
