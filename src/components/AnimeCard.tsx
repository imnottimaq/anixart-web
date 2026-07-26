import { Link } from "react-router-dom";
import styles from "./AnimeCard.module.css"
import { type Anime } from "../shared/types/api";
import { profileListStatus } from "../shared/profileListStatus"
export interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const listStatus = profileListStatus[anime.profile_list_status as 0 | 1 | 2 | 3 | 4 | 5];
  return (
    <Link to={`/anime/${anime.id}`} state={{partialAnime: anime}} key={anime.id} className={`${styles.card} no-link-decoration`}>
      <div className={styles.poster}>
        <img src={`https://images.weserv.nl/?url=${anime.image}`} loading='lazy'></img>
        {listStatus && <span className={`${styles['list-status']} ${styles[`status-${listStatus.color}`]}`}>{listStatus.label}</span>}
      </div>
      <p className={styles['anime-title']}>{anime.title_ru.length > 50 ? anime.title_ru.slice(0,49)+"..." : anime.title_ru}</p>
      <p>{anime.episodes_released || "?"} из {anime.episodes_total || "?"} эп. {anime.grade == 0 ? "": "| ⭐ " + anime.grade.toFixed(2)}</p>
    </Link>
  );
}
