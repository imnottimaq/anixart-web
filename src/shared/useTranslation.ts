import { useSettings } from './contexts/settingsContext';
import { dictionaries, type TranslationKey } from './i18n';

export function useTranslation() {
    const { settings } = useSettings();
    const dictionary = dictionaries[settings.appearance.language];

    return {
        t: (key: TranslationKey) => dictionary[key],
        language: settings.appearance.language,
    };
}
