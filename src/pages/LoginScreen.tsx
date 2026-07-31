import { useState } from "react"
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../shared/contexts/userContext";
import styles from './LoginScreen.module.css'
import { useTranslation } from '../shared/useTranslation';
import { resolveAndStoreProfileIdentity } from '../shared/profileIdentity';
import { saveRoomIdentity } from '../shared/roomParticipant';

export default function LoginScreen(){
    const [username, setUsername] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const {userToken, setUserToken, setUserId} = useUser()
    const navigate = useNavigate()
    const { t } = useTranslation();

    if (userToken !== "") navigate('/account')

    return(
        <div className={styles['body']}>
            <h2>{t('auth.loginTitle')}</h2>
            <div className={styles['form-container']}>
                <input type="text"
                       name="username"
                       placeholder={t('auth.username')}
                       onChange={e => setUsername(e.target.value)}/>
                       
                <input type="password"
                       name="password" 
                       placeholder={t('auth.password')}
                       onChange={e => setPassword(e.target.value)}/>
                       
                <div className={styles['actions']}>
                    <Link to='/account/recover'>{t('auth.forgotPassword')}</Link>
                    <Link to='/account/create'>{t('auth.register')}</Link>
                </div>
                
                <button onClick={() => {handleLogin(username, password, setUserToken, setUserId)}}>{t('auth.login')}</button>
            </div>
        </div>
    )
}

async function handleLogin(username: string, password: string, setUserToken: (token:string) => void, setUserId: (id:number) => void){
    const response = await fetch(`https://api-s.anixsekai.com/auth/signIn?login=${username}&password=${password}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({})
    })
    if (response.ok) {
        const data = await response.json()
        if (data.code !== 0 || !data.profileToken?.token) throw new Error('Неверный логин или пароль');
        setUserToken(data.profileToken.token)

        // `profileToken.id` is an ID of the token record, not the public
        // profile ID used by profile endpoints and watch rooms.
        if (data.profile?.id && data.profile.login) {
            saveRoomIdentity({ id: data.profile.id, login: data.profile.login, avatar: data.profile.avatar ?? null });
            setUserId(data.profile.id);
        } else {
            const profileId = await resolveAndStoreProfileIdentity(username);
            setUserId(profileId ?? 0);
        }
        alert(`Logged in:`)
        return
    }
    throw new Error("Failed to login")
}
