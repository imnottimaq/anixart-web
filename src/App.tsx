import { useEffect, useState,} from 'react'
import {  RouterProvider } from 'react-router-dom'
import { router } from './app/router';
import { type AppSettings, defaultAppSettings } from './shared/types/settings';
import { UserContext } from './shared/contexts/userContext';
import { SettingsContext } from './shared/contexts/settingsContext';
import { SearchContext, type SearchScope } from './shared/contexts/searchContext';
import { getStoredUserToken, setStoredUserToken } from './shared/authToken';
import { saveRoomIdentity } from './shared/roomParticipant';

function App() {
  const [userToken, setUserTokenState] = useState<string>(getStoredUserToken);
  const [userId, setUserIdState] = useState<number>(() => +(localStorage.getItem('user_id') || ""))
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');

    if (!saved) return defaultAppSettings;

    try {
      const parsed = JSON.parse(saved);

      return {
        ...defaultAppSettings,
        ...parsed,
        player: { ...defaultAppSettings.player, ...parsed.player },
        content: { ...defaultAppSettings.content, ...parsed.content },
        appearance: { ...defaultAppSettings.appearance, ...parsed.appearance },
      };
    } catch {
      return defaultAppSettings;
    }
  });
  const [searchScope, setSearchScope] = useState<SearchScope>({ type: 'releases' });

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!userToken) return;

    let isCancelled = false;

    const loadCurrentProfileId = async () => {
      try {
        const response = await fetch(`https://api-s.anixsekai.com/profile/info?token=${userToken}`);
        if (!response.ok) return;

        const data: { id?: number | string; profile?: { id?: number | string; login?: string; avatar?: string | null } } = await response.json();
        const profileId = Number(data.profile?.id ?? data.id);
        if (!isCancelled && Number.isFinite(profileId) && profileId > 0) {
          setUserIdState(profileId);
          localStorage.setItem('user_id', String(profileId));
          if (data.profile?.login) {
            saveRoomIdentity({ id: profileId, login: data.profile.login, avatar: data.profile.avatar });
          }
        }
      } catch (error) {
        console.error('Не удалось определить ID текущего профиля:', error);
      }
    };

    void loadCurrentProfileId();

    return () => {
      isCancelled = true;
    };
  }, [userToken]);

  const setUserToken = (token: string) => {
    setUserTokenState(token);
    setStoredUserToken(token);
  };

  const setUserId = (id: string | number) => {
    setUserIdState(+id)
    if (id) {
      localStorage.setItem('user_id', id.toString())
    } else {
      localStorage.removeItem('user_id')
    }
  }
  
  return (
    <SettingsContext.Provider value={{settings, setSettings}}>
      <UserContext.Provider value={{userToken, setUserToken, userId, setUserId}}>
        <SearchContext.Provider value={{searchScope, setSearchScope}}>
          <RouterProvider router={router} />
        </SearchContext.Provider>
      </UserContext.Provider>
    </SettingsContext.Provider>
  )
}

export default App
