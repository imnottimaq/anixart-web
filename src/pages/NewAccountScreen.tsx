import { useState } from "react"
import { useUser } from "../shared/contexts/userContext";
import styles from './LoginScreen.module.css'
import { useNavigate } from "react-router-dom";
import { useTranslation } from '../shared/useTranslation';

export default function NewAccountScreen() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const navigate = useNavigate()
    
    const {userToken, setUserToken, setUserId } = useUser()
    const [hash, setHash] = useState("")
    const [code, setCode] = useState("")
    const [errorMsg, setErrorMsg] = useState("")
    const { t } = useTranslation();

    const isCodeRequestDisabled = !username || !email || !password || password !== confirmPassword;

    if (userToken !== "") navigate('/account')

    return (
        <div className={styles['body']}>
            <h2>{t('auth.registerTitle')}</h2>
            <div className={styles['form-container']}>
                
                {errorMsg && <p className={styles.error}>{errorMsg}</p>}
                <div className={styles['form-fields']}>
                        <input 
                            type="text"
                            name="username"
                            placeholder={t('auth.username')}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />

                        <input 
                            type="text"
                            name="email"
                            placeholder={t('auth.email')}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                       
                        <input 
                            type="password"
                            name="password" 
                            placeholder={t('auth.password')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />

                        <input 
                            type="password"
                            name="confirmPassword" 
                            placeholder={t('auth.confirmPassword')}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />

                        <div className={styles['code-row']}>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder={t('auth.emailCode')}
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                            <button
                                type="button"
                                className={styles['send-code-button']}
                            onClick={() => handleCreateFirstStage(
                                username, 
                                email,
                                password,
                                setHash, 
                                setErrorMsg
                            )} 
                            disabled={isCodeRequestDisabled}
                        >
                            {hash ? t('misc.reset') : t('auth.sendCode')}
                        </button>
                        </div>
                        {hash && <p className={styles['code-hint']}>{t('auth.checkEmail')}</p>}
                        <button
                            className={styles['submit-button']}
                            onClick={() => handleCreateSecondStage(
                                username,
                                email,
                                password,
                                hash,
                                code,
                                setUserToken,
                                setUserId,
                                setErrorMsg
                            )}
                            disabled={!hash || !code}
                        >
                            {t('auth.register')}
                        </button>
                </div>
            </div>
        </div>
    )
}

async function handleCreateFirstStage(
    username: string,
    email: string,
    password: string, 
    setHash: (hash: string) => void,
    setErrorMsg: (msg: string) => void
) {
    setErrorMsg("");
    try {
        const response = await fetch(`https://api-s.anixsekai.com/auth/signUp`, { 
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({ login: username, email: email, password: password })
        });
        
        const rawText = await response.text();

        if (!rawText) {
            setErrorMsg("Сервер прислал пустой ответ");
            return;
        }

        const data = JSON.parse(rawText);
        if (data.code !== 0) throw new Error(data.message || "Ошибка создания аккаунта");

        setHash(data.hash);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Не удалось отправить код");
    }
}

async function handleCreateSecondStage(
    username: string, 
    email: string,
    password: string, 
    hash: string, 
    code: string, 
    setUserToken: (token: string) => void,
    setUserId: (id: number) => void,
    setErrorMsg: (msg: string) => void
) {
    setErrorMsg("");
    try {
        const response = await fetch(`https://api-s.anixsekai.com/auth/verify`, {   
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({ login: username, email:email, password: password, hash: hash, code:code })
            });
        if (!response.ok) throw new Error("Ошибка при подтверждении: " + response.status);

        const data = await response.json();
        if (data.code !== 0) throw new Error(data.message || "Неверный код или не удалось создать аккаунт");
        if (data.profileToken && data.profileToken.token) {
            setUserToken(data.profileToken.token);
            setUserId(data.profileToken.id);
            alert("Аккаунт успешно создан! Вы вошли в аккаунт.");
        }
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Ошибка при вводе кода");
    }
}
