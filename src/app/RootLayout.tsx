import { Link, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Modal } from '../modals/ModalTemplate';

export default function RootLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isFirstTimeOpening, setIsFirstTimeOpeningState] = useState<boolean>(() => localStorage.getItem('onboarded') != "true")

  const closeOnboarding = () => {
      localStorage.setItem('onboarded', 'true');
      setIsFirstTimeOpeningState(false);
    };

  useEffect(() => {
      document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
      <div>
        <header>
          <Link to="/" className='nav-link header-left nav-logo-block'>
              <img src="https://anixart-app.com/assets/images/logo.svg?v2" alt="Anixart" />
              <p>Anixart</p>
            </Link>  
          <nav className='header-left'>
            <Link to="/" className='nav-link'>Главная</Link>
            <Link to="/overview" className='nav-link'>Обзор</Link>
            <Link to="/favorites" className='nav-link'>Избранное</Link>
            <Link to="/account" className='nav-link'>Аккаунт</Link>
            <Link to="/random" className='nav-link'>Случайное аниме</Link>    
          </nav>
          <button className='header-right' 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ padding: '8px 16px', appearance:'none', cursor: 'pointer', backgroundColor: 'transparent', border:'0px' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
        <main>
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