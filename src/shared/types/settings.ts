export interface AppSettings {
    player: {
        defaultQuality: 'auto'| '1080' | '720' | '480' | '360';
        autoplay: boolean;
        volume: number;
        qualityUpgrade: boolean;
        showSkipOpeningButton: boolean;
        skipOpeningValue: number; // in seconds
    },
    content: {
        defaultTabOnHome: 'latest' | 'my' | 'ongoing' | 'announced' | 'finished' | 'films'
        rememberSource: boolean;
        rememberedSourceId: number | null;
        rememberDub: boolean;
        rememberedDubId: number | null;
        rememberEpisodeTime: boolean;
    }
    appearance:{
        theme: 'light' | 'dark';
        language: 'russian' | 'english';
        defaultCardType: 'vertical' | 'horizontal';
    }
}

export const defaultAppSettings:AppSettings = {
    player:{
        defaultQuality: 'auto',
        autoplay: false,
        volume: 60,
        qualityUpgrade: false,
        showSkipOpeningButton: true,
        skipOpeningValue: 84,
    },
    content:{
        defaultTabOnHome: 'latest',
        rememberSource: false,
        rememberedSourceId: null,
        rememberDub: false,
        rememberedDubId: null,
        rememberEpisodeTime: false,
    },
    appearance:{
        theme: 'light',
        language: 'russian',
        defaultCardType: 'vertical'
    }
}
