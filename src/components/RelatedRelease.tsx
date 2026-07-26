import { Link } from 'react-router-dom'
import {type AnimeCardProps} from './AnimeCard'
import styles from './RelatedRelease.module.css'

export default function ReleatedRelease({anime}:AnimeCardProps){
    return(
        <Link to={`/anime/${anime.id}`} className='no-link-decoration'>
        <div className={styles['release-card']}>
            <img src={"https://images.weserv.nl/?url="+anime.image} loading='lazy' />
            <div style={{display: "flex", flexDirection:"column"}}>
                <p className={styles['title']}>{anime.title_ru}</p>
                <div style={{display:'flex', flexDirection:'row'}}>
                    <p>{anime.year + " г."}</p>
                    <p>{anime.grade.toFixed(2) + " ⭐"}</p>
                </div>
                <div className={styles['category']}> 
                    <p className={styles['category']}>{anime.category?.name}</p>
                </div>
            </div>
        </div>
        </Link>
        
    )
}