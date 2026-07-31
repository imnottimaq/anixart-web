import styles from './WatchlistLine.module.css'
import { useTranslation } from '../shared/useTranslation';

export interface WatchlistLineProps{
    watching_count: number;
    plan_count: number;
    completed_count: number;
    hold_on_count: number;
    dropped_count: number
}

export default function WatchlistLine({watching_count, plan_count, completed_count, hold_on_count, dropped_count}: WatchlistLineProps){
    const { t } = useTranslation();
    const overallListCount = Math.max(watching_count + plan_count + completed_count + hold_on_count + dropped_count, 1)
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
                    ['watching', 'status.watching', watching_count],
                    ['plan', 'status.planned', plan_count],
                    ['completed', 'status.watched', completed_count],
                    ['hold', 'status.hold_on', hold_on_count],
                    ['dropped', 'status.dropped', dropped_count],
                ].map(([status, label, count]) => (
                    <div className={`${styles['watchlist-hint-item']} ${styles[`status-${status}`]}`} key={status}>
                        <span className={`${styles['watchlist-hint-circle']} ${styles[`circle-${status}`]}`}></span>
                        <span>{t(label as 'status.watching' | 'status.planned' | 'status.watched' | 'status.hold_on' | 'status.dropped')}</span>
                        <strong>{count ?? 0}</strong>
                    </div>
                ))}
            </div>
        </div>
    )
}
