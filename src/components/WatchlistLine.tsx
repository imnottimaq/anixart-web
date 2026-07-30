import styles from './WatchlistLine.module.css'

export interface WatchlistLineProps{
    watching_count: number;
    plan_count: number;
    completed_count: number;
    hold_on_count: number;
    dropped_count: number
}

export default function WatchlistLine({watching_count, plan_count, completed_count, hold_on_count, dropped_count}: WatchlistLineProps){
    const overallListCount = watching_count + plan_count + completed_count + hold_on_count + dropped_count
    return(
        <div className={styles['watchlist-info']}>
            <div className={styles['watchlist-line']}>
                <progress value='100' max='100' className={styles['progress1']}></progress>
                <progress value={(watching_count + plan_count + completed_count + hold_on_count) / overallListCount * 100} max='100' className={styles['progress2']}></progress>
                <progress value={(watching_count + plan_count + completed_count) / overallListCount * 100} max='100' className={styles['progress3']}></progress>
                <progress value={(watching_count + plan_count) / overallListCount * 100} max='100' className={styles['progress4']}></progress>
                <progress value={(watching_count) / overallListCount * 100} max='100' className={styles['progress5']}></progress>
            </div>
            <div className={styles['watchlist-hint']}>
                {[
                    ['watching', 'Смотрю', watching_count],
                    ['plan', 'В планах', plan_count],
                    ['completed', 'Просмотрено', completed_count],
                    ['hold', 'Отложено', hold_on_count],
                    ['dropped', 'Брошено', dropped_count],
                ].map(([status, label, count]) => (
                    <div className={`${styles['watchlist-hint-item']} ${styles[`status-${status}`]}`} key={status}>
                        <span className={`${styles['watchlist-hint-circle']} ${styles[`circle-${status}`]}`}></span>
                        <span>{label}</span>
                        <strong>{count ?? 0}</strong>
                    </div>
                ))}
            </div>
        </div>
    )
}
