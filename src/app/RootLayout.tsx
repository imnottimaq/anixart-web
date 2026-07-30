import { Link, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Modal } from '../modals/ModalTemplate';
import SearchBar from '../components/SearchBar'
import { useSettings } from '../shared/contexts/settingsContext';
import SunIcon from '../assets/icons/sun.svg';
import MoonIcon from '../assets/icons/moon.svg';
import styles from './RootLayout.module.css';

export default function RootLayout() {
  const { settings, setSettings } = useSettings();
  const { theme } = settings.appearance;
  const [isFirstTimeOpening, setIsFirstTimeOpeningState] = useState<boolean>(() => localStorage.getItem('onboarded') != "true")

  const closeOnboarding = () => {
      localStorage.setItem('onboarded', 'true');
      setIsFirstTimeOpeningState(false);
    };

  useEffect(() => {
      document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
      <div className={styles.layout}>
        <header className={styles.header}>
          <Link to="/" className={`${styles['nav-link']} ${styles['nav-logo-block']}`}>
              <img src="https://anixart-app.com/assets/images/logo.svg?v2" alt="Anixart" />
              <p>Anixart</p>
            </Link>  
          <nav className={styles.navigation}>
            <Link to="/" className={styles['nav-link']}>Главная</Link>
            <Link to="/overview" className={styles['nav-link']}>Обзор</Link>
            <Link to="/favorites" className={styles['nav-link']}>Избранное</Link>
            <Link to="/account" className={styles['nav-link']}>Аккаунт</Link>
            <Link to="/random" className={styles['nav-link']}>Случайное аниме</Link>
          </nav>
          <SearchBar />
          <button
            type="button"
            className={styles['theme-toggle']}
            onClick={() => setSettings(previous => ({
              ...previous,
              appearance: {
                ...previous.appearance,
                theme: previous.appearance.theme === 'dark' ? 'light' : 'dark',
              },
            }))}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            <img src={theme === 'dark' ? SunIcon : MoonIcon} alt="" />
          </button>
        </header>
        <main className={styles.main}>
          <Outlet/>
        </main>
        <Modal
          isOpen = {isFirstTimeOpening}
          onClose={() => closeOnboarding}
          showCloseButton={false}
          title='Предупреждение'
          text=' Это неофициальный клиент, не связанный с разработчиками Anixart. Сайт предоставляется «как есть»:
          некоторые функции могут отсутствовать, а дальнейшая поддержка и разработка не гарантируются. 
          Используя сайт, вы принимаете эти условия и самостоятельно несёте ответственность за безопасность своего аккаунта.'
          actions={[
            {
              label: 'Закрыть сайт',
              variant: 'secondary',
              onClick: () => window.location.href = 'https://google.com'
            },
            {
              label: 'Продолжить',
              variant: 'primary',
              onClick: closeOnboarding
            }
          ]}
        />
      </div>
      
  );
}
