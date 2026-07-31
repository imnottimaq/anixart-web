import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './RootLayout';

import LatestReleasesScreen from '../pages/LatestReleasesScreen';
import FavoritesScreen from '../pages/FavoritesScreen';
import ReleaseScreen from '../pages/ReleaseScreen';
import PlayerScreen from '../pages/PlayerScreen';
import AccountScreen from '../pages/AccountScreen';
import LoginScreen from '../pages/LoginScreen';
import RecoverScreen from '../pages/RecoverScreen';
import NewAccountScreen from '../pages/NewAccountScreen';
import RandomAnime from '../pages/RandomAnime';
import SettingsScreen from '../pages/SettingsScreen';

const basename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter([
{
    path: '/',
    element: <RootLayout />,
    children: [
    { index: true, element: <LatestReleasesScreen /> },
    { path: 'overview', element: <LatestReleasesScreen /> },
    { path: 'favorites', element: <FavoritesScreen /> },
    { path: 'anime/:id', element: <ReleaseScreen /> },
    { path: 'anime/:id/watch', element: <PlayerScreen /> },
    { path: 'account', element: <AccountScreen /> },
    { path: 'account/:id', element: <AccountScreen/>  },
    { path: 'account/login', element: <LoginScreen /> },
    { path: 'account/recover', element: <RecoverScreen /> },
    { path: 'account/create', element: <NewAccountScreen /> },
    { path: 'random', element: <RandomAnime /> },
    { path: 'settings', element: <SettingsScreen />}
    ],
},
], { basename });
