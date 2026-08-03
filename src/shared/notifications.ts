import type { Dub } from "../modals/DubSelectModal"
import type {
    AllDubbersAPIResponse,
    AllNotificationsAPIResponse,
    CollectionCommentNotification,
    EpisodeNotification,
    FriendNotification,
    PagedResponse,
    RelatedReleaseNotification,
    ReleaseCommentNotification,
    ReleaseNotificationsPreferencesAPIResponse,
} from "./types/api"

export async function GetAllSubscribedReleases(page: number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/profile/preference/notification/release/all/${page}?token=${token}`)
    const data: ReleaseNotificationsPreferencesAPIResponse = await response.json()
    if (data.code === 0) return data
}

export async function GetSubscribedReleaseDubs(animeId: number, token: string) {
    const response = await fetch(`https://api-s.anixsekai.com/profile/preference/notification/release/type/${animeId}?token=${token}`)
    const data: {code: number, profile_release_type_notification_preferences: Dub[] } = await response.json()
    if (data.code === 0) return data.profile_release_type_notification_preferences
}

export async function SetSubscribedReleaseDubs(animeId: number, dubIds:number[], token: string, ) {
    const response = await fetch(`https://api-s.anixsekai.com/profile/preference/notification/release/type/edit?token=${token}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            profile_release_type_notification_preferences: dubIds,
            release_id: animeId
        })
    })
    const data = await response.json()
    if (data.code === 0) return
}

export async function GetAllDubbers() {
    const response = await fetch('https://api-s.anixsekai.com/type/all')
    const data: AllDubbersAPIResponse = await response.json()
    if (data.code === 0) return data.types
}

export async function GetAllNotifications(page: number, token: string): Promise<AllNotificationsAPIResponse> {
    return getNotifications<AllNotificationsAPIResponse>('all', page, token)
}

export async function GetFriendsNotifications(page: number, token: string): Promise<PagedResponse<FriendNotification>> {
    return getNotifications<PagedResponse<FriendNotification>>('friends', page, token)
}

export async function GetRelatedReleaseNotifications(page: number, token: string): Promise<PagedResponse<RelatedReleaseNotification>> {
    return getNotifications<PagedResponse<RelatedReleaseNotification>>('related/release', page, token)
}

export async function GetEpisodeNotifications(page: number, token: string): Promise<PagedResponse<EpisodeNotification>> {
    return getNotifications<PagedResponse<EpisodeNotification>>('episodes', page, token)
}

export async function GetReleaseCommentsNotifications(page: number, token: string): Promise<PagedResponse<ReleaseCommentNotification>> {
    return getNotifications<PagedResponse<ReleaseCommentNotification>>('releaseComments', page, token)
}

export async function GetCollectionCommentsNotifications(page: number, token: string): Promise<PagedResponse<CollectionCommentNotification>> {
    return getNotifications<PagedResponse<CollectionCommentNotification>>('collectionComments', page, token)
}

export async function MarkNotificationsAsRead(token: string): Promise<void> {
    const response = await fetch(`https://api-s.anixsekai.com/notification/read?token=${token}`)
    if (!response.ok) throw new Error(`Не удалось отметить уведомления прочитанными: ${response.status}`)

    const data = await response.json() as { code: number }
    if (data.code !== 0) throw new Error(`Не удалось отметить уведомления прочитанными: ${data.code}`)
}

async function getNotifications<TResponse extends { code: number }>(type: string, page: number, token: string): Promise<TResponse> {
    if (!Number.isInteger(page) || page < 0) throw new Error('Некорректный номер страницы уведомлений')

    const response = await fetch(`https://api-s.anixsekai.com/notification/${type}/${page}?token=${token}`)
    if (!response.ok) throw new Error(`Не удалось загрузить уведомления: ${response.status}`)

    const data = await response.json() as TResponse
    if (data.code !== 0) throw new Error(`Не удалось загрузить уведомления: ${data.code}`)
    return data
}
