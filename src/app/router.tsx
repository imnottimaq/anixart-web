import { Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './RootLayout';

import { LatestReleasesScreen, OverviewScreen, FavoritesScreen, ReleaseScreen, PlayerScreen, FranchiseScreen,
    AccountScreen, EditAccountScreen, LoginScreen, RecoverScreen, NewAccountScreen, RandomAnime, SettingsScreen,
    NotificationsScreen, NotificationSettingsScreen, ReleaseNotificationSettingsScreen, WatchRoomScreen
 } from './components';

function lazyPage(page: ReactNode) {
    return <Suspense fallback={<div className="route-loader" role="status">Загрузка…</div>}>{page}</Suspense>;
}

const basename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter([
{
    path: '/',
    element: <RootLayout />,
    children: [
    { index: true, element: lazyPage(<LatestReleasesScreen />) },
    { path: 'overview', element: lazyPage(<OverviewScreen />) },
    { path: 'favorites', element: lazyPage(<FavoritesScreen />) },
    { path: 'anime/:id', element: lazyPage(<ReleaseScreen />) },
    { path: 'anime/:id/watch', element: lazyPage(<PlayerScreen />) },
    { path: 'franchise/:id', element: lazyPage(<FranchiseScreen />) },
    { path: 'account', element: lazyPage(<AccountScreen />) },
    { path: 'account/edit', element: lazyPage(<EditAccountScreen />) },
    { path: 'account/:id', element: lazyPage(<AccountScreen />)  },
    { path: 'account/login', element: lazyPage(<LoginScreen />) },
    { path: 'account/recover', element: lazyPage(<RecoverScreen />) },
    { path: 'account/create', element: lazyPage(<NewAccountScreen />) },
    { path: 'random', element: lazyPage(<RandomAnime />) },
    { path: 'settings', element: lazyPage(<SettingsScreen />) }
    ,{ path: 'notifications', element: lazyPage(<NotificationsScreen />) }
    ,{ path: 'notifications/settings', element: lazyPage(<NotificationSettingsScreen />) }
    ,{ path: 'notifications/releases', element: lazyPage(<ReleaseNotificationSettingsScreen />) }
    ,{ path: 'together', element: lazyPage(<WatchRoomScreen />) }
    ,{ path: 'together/:roomId', element: lazyPage(<WatchRoomScreen />) }
    ],
},
], { basename });
