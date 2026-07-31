import styles from './Comment.module.css'
import verifiedBadge from '../assets/icons/verified.svg'
import upArrowIcon from '../assets/icons/up-arrow.svg'
import downArrowIcon from '../assets/icons/down-arrow.svg'
import replyIcon from '../assets/icons/reply.svg'
import arrowDownIcon from '../assets/icons/arrow-down.svg'
import { useEffect, useState } from 'react'
import { useUser } from '../shared/contexts/userContext'
import { Modal } from '../modals/ModalTemplate'
import { type Comment } from '../shared/types/api'
import RemoteImage from './RemoteImage'
import { useTranslation } from '../shared/useTranslation';

const AGENT_PROXY = "https://kodik-proxy.tima3050505.workers.dev/agentproxy?url="

export interface CommentProps {
    comment: Comment,
    releaseId: number,
    onReply: (comment: Comment) => void,
    onEdit: (comment: Comment) => void,
    newReply?: { parentCommentId: number; comment: Comment } | null,
    editedComment?: { commentId: number; message: string; spoiler: boolean } | null
}

interface CommentRepliesResponse {
    content: Comment[],
    total_count: number,
    total_page_count: number
}

export default function CommentComponent({ comment, releaseId, onReply, onEdit, newReply, editedComment }: CommentProps) {
    const { t } = useTranslation();
    const [isRepliesShown, setIsRepliesShown] = useState(false);
    const userToken = useUser()
    const [replies, setReplies] = useState<Comment[]>([]);
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
            <div className={styles['comment-header']}>
                <RemoteImage src={comment.profile.avatar} className={styles['avatar']} alt="" />
                <div className={styles['author-info']}>
                    <div className={styles['author-line']}>
                        <strong>{comment.profile.login}</strong>
                        {comment.profile.is_verified && <img src={verifiedBadge} className={styles['verified-badge']} alt="" />}
                        <time>{formatCustomDate(comment.timestamp)}</time>
                    </div>
                    <button type="button" className={styles['reply-button']} onClick={() => onReply(comment)}>
                        <img src={replyIcon} className={styles['arrow']} alt="" />
                        {t('comments.reply')}
                    </button>
                </div>
                {isOwnComment && <div className={styles['comment-menu']}>
                    <button
                        type="button"
                        className={styles['comment-menu-button']}
                        onClick={() => setIsCommentMenuOpen((isOpen) => !isOpen)}
                        aria-label={t('comments.actions')}
                        aria-expanded={isCommentMenuOpen}
                    >•••</button>
                    {isCommentMenuOpen && <div className={styles['comment-menu-options']}>
                        <button type="button" disabled={isCommentActionLoading} onClick={() => {
                            setIsCommentMenuOpen(false);
                            onEdit(comment);
                        }}>{t('comments.edit')}</button>
                        <button type="button" disabled={isCommentActionLoading} className={styles['delete-comment-option']} onClick={() => {
                            setIsCommentMenuOpen(false);
                            setIsDeleteConfirmationOpen(true);
                        }}>{t('comments.delete')}</button>
                    </div>}
                </div>}
            </div>
            
            <div className={styles['comment-message']}>
                {isSpoiler ? <div className={`${styles['spoiler-message']} ${!isSpoilerRevealed ? styles['spoiler-message-covered'] : ''}`}>
                    <p className={isSpoilerRevealed ? '' : styles['spoiler-message-hidden']}>{commentMessage}</p>
                    {!isSpoilerRevealed && <button
                        type="button"
                        className={styles['spoiler-reveal']}
                        onClick={() => setIsSpoilerRevealed(true)}
                    >
                        <span className={styles['spoiler-reveal-title']}>{t('comments.spoiler')}</span>
                        <span className={styles['spoiler-reveal-hint']}>{t('comments.spoilerHint')}</span>
                    </button>}
                </div> : <p>{commentMessage}</p>}
            </div>
            
            <div className={styles['vote']}>
                <button type="button" aria-label={t('comments.voteUp')} onClick={() => void handleVote(2)}>
                    <img src={upArrowIcon} className={`${styles['arrow']} ${currentVote === 2 ? styles['positive'] : ''}`} alt="" />
                </button>
                <span>{voteCount}</span>
                <button type="button" aria-label={t('comments.voteDown')} onClick={() => void handleVote(1)}>
                    <img src={downArrowIcon} className={`${styles['arrow']} ${currentVote === 1 ? styles['negative'] : ''}`} alt="" />
                </button>
            </div>
            {replyCount !== 0 && (
                <div 
                    className={styles['show-replies']} 
                    onClick={toggleReplies}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={arrowDownIcon} className={styles['arrow']} alt="" />
                    <p>
                        {isLoading ? t('misc.loading') : (
                            <>
                                {isRepliesShown ? `${t('comments.hideReplies')} ` : `${t('comments.showReplies')} `}
                                {replyCount} {getPluralReplies(replyCount)}
                            </>
                        )}
                    </p>
                </div>
            )}
            {isRepliesShown && replies.length > 0 && (
                <div className={styles.reply}>
                    {replies.map((reply) => (
                        <CommentComponent
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
            title={t('comments.deleteConfirmTitle')}
            text={t('comments.deleteConfirmText')}
            actions={[
                {
                    label: t('misc.cancel'),
                    variant: 'secondary',
                    onClick: () => setIsDeleteConfirmationOpen(false),
                },
                {
                    label: t('comments.delete'),
                    variant: 'danger',
                    onClick: () => void handleDeleteComment(),
                },
            ]}
        />
        </>
    )
}

async function fetchCommentReplies(commentId: number, page: number, token: string): Promise<Comment[]> {
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
