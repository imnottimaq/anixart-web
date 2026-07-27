import styles from './Comment.module.css'
import verifiedBadge from '../assets/icons/verified.svg'
import upArrowIcon from '../assets/icons/up-arrow.svg'
import downArrowIcon from '../assets/icons/down-arrow.svg'
import replyIcon from '../assets/icons/reply.svg'
import arrowDownIcon from '../assets/icons/arrow-down.svg'
import { useState } from 'react'
import { Modal } from '../modals/ModalTemplate'

export interface CommentProps {
    comment: CommentType,
    releaseId: number
}

export interface CommentType {
    id: number,
    profile: {
        id: number,
        login: string,
        avatar: string,
        badge_name: string,
        badge_url: string,
        is_verified: boolean,
    },
    message: string,
    timestamp: string,
    vote_count: number,
    is_spoiler: boolean,
    vote: number,
    reply_count: number
}

interface CommentRepliesResponse {
    content: CommentType[],
    total_count: number,
    total_page_count: number
}

export default function Comment({ comment, releaseId }: CommentProps) {
    const [isRepliesShown, setIsRepliesShown] = useState(false);
    const [isUnimplementedModalShown, setIsUnimplementedModalShown] = useState(false);
    const [replies, setReplies] = useState<CommentType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const toggleReplies = async () => {
        if (isRepliesShown) {
            setIsRepliesShown(false);
            return;
        }

        if (replies.length === 0) {
            setIsLoading(true);
            try {
                const fetchedReplies = await fetchCommentReplies(comment.id, 0);
                setReplies(fetchedReplies);
                setIsRepliesShown(true);
            } catch (err) {
                console.error("Ошибка загрузки ответов:", err);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsRepliesShown(true);
        }
    };

    return (
        <>
        <div className={styles["comment"]}>
            <div className="flex-row-center">
                <img src={`https://images.weserv.nl/?url=${comment.profile.avatar}`} className={styles['avatar']} alt="" />
                <p style={{ fontWeight: 'bold' }}>{comment.profile.login}</p>
                <div className={styles['reply-div']} onClick={() => setIsUnimplementedModalShown(true)}>
                    <img src={replyIcon} className={styles['arrow']}/>
                    <a>Ответить</a>
                </div>
                
                {comment.profile.is_verified && <img src={verifiedBadge} className={styles['verified-badge']} alt="" />}
                <p>{formatCustomDate(comment.timestamp)}</p>
            </div>
            
            <div className="flex-row-flex-start">
                <p>{comment.message}</p>
            </div>
            
            <div className={styles['vote']}>
                <img src={upArrowIcon} className={styles['arrow']} onClick={() => setIsUnimplementedModalShown(true) }/>
                <p>{comment.vote_count}</p>
                <img src={downArrowIcon} className={styles['arrow']} onClick={() => setIsUnimplementedModalShown(true)} />
            </div>
            {comment.reply_count !== 0 && (
                <div 
                    className={styles['show-replies']} 
                    onClick={toggleReplies}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={arrowDownIcon} className={styles['arrow']} alt="" />
                    <p>
                        {isLoading ? "Загрузка..." : (
                            <>
                                {isRepliesShown ? "Скрыть " : "Показать "}
                                {comment.reply_count} {getPluralReplies(comment.reply_count)}
                            </>
                        )}
                    </p>
                </div>
            )}
            {isRepliesShown && replies.length > 0 && (
                <div className={styles.reply} style={{ marginLeft: '20px' }}>
                    {replies.map((reply) => (
                        <Comment key={reply.id} comment={reply} releaseId={releaseId} />
                    ))}
                </div>
            )}
        </div>
        <Modal title="Внимание"
            text="Данный функционал отключен из-за невозможности его реализации. Воспользуйтесь официальным приложением Anixart для данного действия."
            isOpen={isUnimplementedModalShown}
            onClose={() => setIsUnimplementedModalShown(false)}
            actions={[{
                label: "Закрыть",
                onClick: () => setIsUnimplementedModalShown(false),
                variant: 'primary'
            }]}/>
        </>
    )
}

async function fetchCommentReplies(commentId: number, page: number): Promise<CommentType[]> {
    const response = await fetch(`https://api-s.anixsekai.com/release/comment/replies/${commentId}/${page}?sort=2&token=`);
    if (!response.ok) {
        throw new Error("Не удалось загрузить ответы: " + response.status);
    }
    const data: CommentRepliesResponse = await response.json();
    return data.content;
}

function getPluralReplies(count: number): string {
    const absCount = Math.abs(count) % 100;
    const lastDigit = absCount % 10;

    if (absCount > 10 && absCount < 20) return 'ответов';
    if (lastDigit > 1 && lastDigit < 5) return 'ответа';
    if (lastDigit === 1) return 'ответ';
    return 'ответов';
}

function formatCustomDate(dateInput: Date | string | number): string {
    let date: Date;

    if (typeof dateInput === 'number') {
        const isSeconds = dateInput.toString().length <= 10;
        date = new Date(isSeconds ? dateInput * 1000 : dateInput);
    } else {
        date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) {
        return 'Некорректная дата';
    }

    const currentYear = new Date().getFullYear();
    const options: Intl.DateTimeFormatOptions = { 
        month: 'long', 
        day: 'numeric' 
    };
    
    if (date.getFullYear() !== currentYear) {
        options.year = 'numeric';
    }
    
    return new Intl.DateTimeFormat('ru-RU', options).format(date);
}