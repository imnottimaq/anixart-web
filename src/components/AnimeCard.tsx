import { Link } from "react-router-dom";
import styles from "./AnimeCard.module.css"
import { type Anime } from "../shared/types/api";
import { profileListStatus } from "../shared/profileListStatus"
import starIcon from '../assets/icons/star.svg'
import RemoteImage from './RemoteImage';

export interface AnimeCardProps { anime: Anime; }

export default function AnimeCard({ anime }: AnimeCardProps) {
  const listStatus = profileListStatus[anime.profile_list_status as 0 | 1 | 2 | 3 | 4 | 5];
  return (
    <Link to={`/anime/${anime.id}`} state={{partialAnime: anime}} key={anime.id} className={styles.card}>
      <div className={styles.poster}>
        <RemoteImage src={anime.image} alt={anime.title_ru} loading='lazy' />
        {listStatus && <span className={`${styles['list-status']} ${styles[`status-${listStatus.color}`]}`}>{listStatus.label}</span>}
      </div>
      <p className={styles['anime-title']}>{anime.title_ru.length > 50 ? anime.title_ru.slice(0,49)+"..." : anime.title_ru}</p>
      <p className={styles['anime-meta']}>
        {anime.episodes_released || "?"} из {anime.episodes_total || "?"} эп.
        {anime.grade !== 0 && <span className={styles['anime-rating']}><img src={starIcon} alt="" />{anime.grade.toFixed(2)}</span>}
      </p>
      {anime.description && <p className={styles['anime-description']}>{anime.description}</p>}
    </Link>
  );
}
