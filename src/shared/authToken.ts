const TOKEN_COOKIE_NAME = 'anixart_token';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getCookie(name: string) {
    const encodedName = `${encodeURIComponent(name)}=`;
    const entry = document.cookie.split('; ').find(cookie => cookie.startsWith(encodedName));
    return entry ? decodeURIComponent(entry.slice(encodedName.length)) : '';
}

export function getStoredUserToken() {
    const cookieToken = getCookie(TOKEN_COOKIE_NAME);
    if (cookieToken) return cookieToken;

    // One-time migration for users who already signed in before cookies were used.
    const legacyToken = localStorage.getItem('user_token') ?? '';
    if (legacyToken) {
        setStoredUserToken(legacyToken);
        localStorage.removeItem('user_token');
    }

    return legacyToken;
}

export function setStoredUserToken(token: string) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';

    if (!token) {
        document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
        localStorage.removeItem('user_token');
        return;
    }

    document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    localStorage.removeItem('user_token');
}
