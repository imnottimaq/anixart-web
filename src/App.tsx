import { useEffect, useState,} from 'react'
import {  RouterProvider } from 'react-router-dom'
import { router } from './app/router';
import './App.css'
import { type AppSettings, defaultAppSettings } from './shared/types/settings';
import { UserContext } from './shared/contexts/userContext';
import { SettingsContext } from './shared/contexts/settingsContext';

function App() {
  const [userToken, setUserTokenState] = useState<string>(() => localStorage.getItem('user_token') || "");
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

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  const setUserToken = (token: string) => {
    setUserTokenState(token);
    if (token) {
      localStorage.setItem('user_token', token);
    } else {
      localStorage.removeItem('user_token');
    }
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
        <RouterProvider router={router} />
      </UserContext.Provider>
    </SettingsContext.Provider>
  )
}

export default App
