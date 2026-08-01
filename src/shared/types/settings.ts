import type { Dub } from "../../modals/DubSelectModal";
import type { Anime } from "./api";

export interface AppSettings {
    player: {
        defaultQuality: 'auto'| '1080' | '720' | '480' | '360';
        autoplay: boolean;
        volume: number;
        qualityUpgrade: boolean;
        qualityUpgradeMode: 'weak' | 'medium' | 'strong';
        showSkipOpeningButton: boolean;
        skipOpeningValue: number; // in seconds
    },
    content: {
        defaultTabOnHome: 'latest' | 'my' | 'ongoing' | 'announced' | 'finished' | 'films';
        defaultTabOnFavorites: 'collections' | 'favorites' | 'history' | 'watching' | 'planned' | 'completed' | 'hold_on' | 'dropped'
        rememberSource: boolean;
        rememberedSourceId: number | null;
        rememberDub: boolean;
        rememberedDubId: number | null;
        rememberEpisodeTime: boolean;
        proxySearchThroughShikimori: boolean;
    }
    appearance:{
        theme: 'light' | 'dark';
        language: 'russian' | 'english';
        defaultCardType: 'vertical' | 'horizontal';
    }
    notifications:{
        recieveNotifications: boolean; // https://api-s.anixsekai.com/profile/preference/notification/episode/edit?token= для переключения
        notificationsType: 'all' | 'selected_lists' | 'selected_releases' | null /* https://api-s.anixsekai.com/profile/preference/notification/status/edit?token= для изменения
        {
            "profileStatusNotificationPreferences": [0,1,2,3,4,5]
        }  для 'all',
        {
            "profileStatusNotificationPreferences": [0, 1, 2.. ] д
        } для 'selected_lists',
        https://api-s.anixsekai.com/profile/preference/notification/selected/releases/edit?token= для 'selected_releases'
            */
        selectedLists: string[] | null;
        selectedDubs: Dub[] | null;
        selectedReleases: Anime[] | null;
        getOnlyOneNotification: boolean;  /*Если выбрана больше чем одна озвучка, уведомление придет только от той, которая быстрее всего выпустит серию
        https://api-s.anixsekai.com/profile/preference/notification/episode/first/edit?token= для переключания*/
        notificationOnRelatedRelease: boolean; //https://api-s.anixsekai.com/profile/preference/notification/related/release/edit?token= для переключения 
        repliesNotifications: boolean; // https://api-s.anixsekai.com/profile/preference/notification/comment/edit?token= для переключения
        commentsOnCollectionNotification: boolean; // https://api-s.anixsekai.com/profile/preference/notification/my/collection/comment/edit?token= для переключения
    }
}

export const defaultAppSettings:AppSettings = {
    player:{
        defaultQuality: 'auto',
        autoplay: false,
        volume: 60,
        qualityUpgrade: false,
        qualityUpgradeMode: 'medium',
        showSkipOpeningButton: true,
        skipOpeningValue: 84,
    },
    content:{
        defaultTabOnHome: 'latest',
        defaultTabOnFavorites: 'favorites',
        rememberSource: false,
        rememberedSourceId: null,
        rememberDub: false,
        rememberedDubId: null,
        rememberEpisodeTime: false,
        proxySearchThroughShikimori: false,
    },
    appearance:{
        theme: 'light',
        language: 'russian',
        defaultCardType: 'vertical'
    },
    notifications:{
        recieveNotifications: false,
        notificationsType: null,
        selectedLists: null,
        selectedDubs: null,
        selectedReleases: null,
        getOnlyOneNotification: false, 
        notificationOnRelatedRelease: false,
        repliesNotifications: false,
        commentsOnCollectionNotification: false,
    }
}
