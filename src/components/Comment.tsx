import styles from './Comment.module.css'
import verifiedBadge from '../assets/icons/verified.svg'
import upArrowIcon from '../assets/icons/up-arrow.svg'
import downArrowIcon from '../assets/icons/down-arrow.svg'
import replyIcon from '../assets/icons/reply.svg'
import arrowDownIcon from '../assets/icons/arrow-down.svg'
import { useEffect, useState } from 'react'
import { useUser } from '../shared/contexts/userContext'
import { Modal } from '../modals/ModalTemplate'

const AGENT_PROXY = "https://kodik-proxy.tima3050505.workers.dev/agentproxy?url="

export interface CommentProps {
    comment: CommentType,
    releaseId: number,
    onReply: (comment: CommentType) => void,
    onEdit: (comment: CommentType) => void,
    newReply?: { parentCommentId: number; comment: CommentType } | null,
    editedComment?: { commentId: number; message: string; spoiler: boolean } | null
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

export default function Comment({ comment, releaseId, onReply, onEdit, newReply, editedComment }: CommentProps) {
    const [isRepliesShown, setIsRepliesShown] = useState(false);
    const userToken = useUser()
    const [replies, setReplies] = useState<CommentType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [replyCount, setReplyCount] = useState(comment.reply_count);
    const [currentVote, setCurrentVote] = useState(comment.vote);
    const [voteCount, setVoteCount] = useState(comment.vote_count);
    const [isVoting, setIsVoting] = useState(false);
    const [isCommentMenuOpen, setIsCommentMenuOpen] = useState(false);
    const [isCommentDeleted, setIsCommentDeleted] = useState(false);
    const [isCommentActionLoading, setIsCommentActionLoading] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
    const isOwnComment = userToken.userId > 0
        && Number(comment.profile.id) === Number(userToken.userId);
    const commentMessage = editedComment?.commentId === comment.id
        ? editedComment.message
        : comment.message;
    const isSpoiler = editedComment?.commentId === comment.id
        ? editedComment.spoiler
        : comment.is_spoiler;

    const handleVote = async (selectedVote: 1 | 2) => {
        if (isVoting) return;

        const nextVote = currentVote === selectedVote ? 0 : selectedVote;
        setIsVoting(true);

        try {
            await HandleVote(comment.id, selectedVote, userToken.userToken);
            setVoteCount((count) => count + getVoteScore(nextVote) - getVoteScore(currentVote));
            setCurrentVote(nextVote);
        } catch (error) {
            console.error('Ошибка голосования:', error);
        } finally {
            setIsVoting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (isCommentActionLoading) return;

        setIsCommentActionLoading(true);
        try {
            await deleteComment(comment.id, userToken.userToken);
            setIsCommentDeleted(true);
        } catch (error) {
            console.error('Ошибка удаления комментария:', error);
        } finally {
            setIsCommentActionLoading(false);
        }
    };

    useEffect(() => {
        if (!newReply || newReply.parentCommentId !== comment.id) return;

        let isCancelled = false;

        const appendReply = async () => {
            setIsLoading(true);
            try {
                const existingReplies = await fetchCommentReplies(comment.id, 0, userToken.userToken);
                if (isCancelled) return;

                setReplies([
                    ...existingReplies.filter((reply) => reply.id !== newReply.comment.id),
                    newReply.comment,
                ]);
                setReplyCount((count) => count + 1);
                setIsRepliesShown(true);
            } catch (error) {
                console.error('Ошибка загрузки ответов:', error);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        void appendReply();

        return () => {
            isCancelled = true;
        };
    }, [comment.id, newReply, userToken.userToken]);

    const toggleReplies = async () => {
        if (isRepliesShown) {
            setIsRepliesShown(false);
            return;
        }

        if (replies.length === 0) {
            setIsLoading(true);
            try {
                const fetchedReplies = await fetchCommentReplies(comment.id, 0, userToken.userToken);
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

    if (isCommentDeleted) return null;

    return (
        <>
        <div className={styles["comment"]}>
            <div className="flex-row-center">
                <img src={`https://images.weserv.nl/?url=${comment.profile.avatar}`} className={styles['avatar']} alt="" />
                <p style={{ fontWeight: 'bold' }}>{comment.profile.login}</p>
                <div className={styles['reply-div']} onClick={() => onReply(comment)}>
                    <img src={replyIcon} className={styles['arrow']}/>
                    <a>Ответить</a>
                </div>
                
                {comment.profile.is_verified && <img src={verifiedBadge} className={styles['verified-badge']} alt="" />}
                <p>{formatCustomDate(comment.timestamp)}</p>
                {isOwnComment && <div className={styles['comment-menu']}>
                    <button
                        type="button"
                        className={styles['comment-menu-button']}
                        onClick={() => setIsCommentMenuOpen((isOpen) => !isOpen)}
                        aria-label="Действия с комментарием"
                        aria-expanded={isCommentMenuOpen}
                    >•••</button>
                    {isCommentMenuOpen && <div className={styles['comment-menu-options']}>
                        <button type="button" disabled={isCommentActionLoading} onClick={() => {
                            setIsCommentMenuOpen(false);
                            onEdit(comment);
                        }}>Редактировать</button>
                        <button type="button" disabled={isCommentActionLoading} className={styles['delete-comment-option']} onClick={() => {
                            setIsCommentMenuOpen(false);
                            setIsDeleteConfirmationOpen(true);
                        }}>Удалить</button>
                    </div>}
                </div>}
            </div>
            
            <div className="flex-row-flex-start">
                {isSpoiler ? <div className={`${styles['spoiler-message']} ${!isSpoilerRevealed ? styles['spoiler-message-covered'] : ''}`}>
                    <p className={isSpoilerRevealed ? '' : styles['spoiler-message-hidden']}>{commentMessage}</p>
                    {!isSpoilerRevealed && <button
                        type="button"
                        className={styles['spoiler-reveal']}
                        onClick={() => setIsSpoilerRevealed(true)}
                    >
                        <span className={styles['spoiler-reveal-title']}>Спойлер</span>
                        <span className={styles['spoiler-reveal-hint']}>Нажмите, чтобы показать</span>
                    </button>}
                </div> : <p>{commentMessage}</p>}
            </div>
            
            <div className={styles['vote']}>
                <img src={upArrowIcon} className={`${styles['arrow']} ${currentVote === 2 ? styles['positive'] : ''}`}
                 onClick={() => void handleVote(2) }/>
                <p>{voteCount}</p>
                <img src={downArrowIcon} className={`${styles['arrow']} ${currentVote === 1 ? styles['negative'] : ''}`}
                onClick={() => void handleVote(1) } />
            </div>
            {replyCount !== 0 && (
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
                                {replyCount} {getPluralReplies(replyCount)}
                            </>
                        )}
                    </p>
                </div>
            )}
            {isRepliesShown && replies.length > 0 && (
                <div className={styles.reply} style={{ marginLeft: '20px' }}>
                    {replies.map((reply) => (
                        <Comment
                            key={reply.id}
                            comment={reply}
                            releaseId={releaseId}
                            onReply={onReply}
                            onEdit={onEdit}
                            newReply={newReply}
                            editedComment={editedComment}
                        />
                    ))}
                </div>
            )}
        </div>
        <Modal
            isOpen={isDeleteConfirmationOpen}
            onClose={() => setIsDeleteConfirmationOpen(false)}
            title="Удалить комментарий?"
            text="Это действие нельзя отменить."
            actions={[
                {
                    label: 'Отмена',
                    variant: 'secondary',
                    onClick: () => setIsDeleteConfirmationOpen(false),
                },
                {
                    label: 'Удалить',
                    variant: 'danger',
                    onClick: () => void handleDeleteComment(),
                },
            ]}
        />
        </>
    )
}

async function fetchCommentReplies(commentId: number, page: number, token: string): Promise<CommentType[]> {
    const response = await fetch(`https://api-s.anixsekai.com/release/comment/replies/${commentId}/${page}?sort=2&token=${token}`);
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

function getVoteScore(vote: number): number {
    if (vote === 2) return 1;
    if (vote === 1) return -1;
    return 0;
}

async function HandleVote(commentId: number, vote: 1|2, token: string){
    const response = await fetch(`${AGENT_PROXY}${encodeURIComponent(`https://api-s.anixsekai.com/release/comment/vote/${commentId}/${vote}?token=${token}`)}`)
    if (!response.ok) throw new Error("Failed to vote on comment: " + response.status)

    const data = await response.json()
    if (data.code !== undefined && data.code !== 0) {
        throw new Error("Failed to vote on comment: " + data.code)
    }

    return data
}

async function deleteComment(commentId: number, token: string) {
    const targetUrl = `https://api-s.anixsekai.com/release/comment/delete/${commentId}?token=${token}`;
    const response = await fetch(`${AGENT_PROXY}${encodeURIComponent(targetUrl)}`);

    return getCommentActionResponse(response, 'удалить');
}

async function getCommentActionResponse(response: Response, action: string) {
    if (!response.ok) throw new Error(`Не удалось ${action} комментарий: ${response.status}`);

    const data: { code?: number } = await response.json();
    if (data.code !== undefined && data.code !== 0) {
        throw new Error(`Не удалось ${action} комментарий: code ${data.code}`);
    }

    return data;
}
