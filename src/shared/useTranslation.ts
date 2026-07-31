import { useCallback } from 'react';
import { useSettings } from './contexts/settingsContext';
import { dictionaries, type TranslationKey } from './i18n';

export function useTranslation() {
    const { settings } = useSettings();
    const dictionary = dictionaries[settings.appearance.language];

    const t = useCallback((key: TranslationKey) => dictionary[key], [dictionary]);

    return {
        t,
        language: settings.appearance.language,
    };
}
