import { useState } from "react"
import { useUser } from "../shared/contexts/userContext";
import styles from './LoginScreen.module.css'
import { useNavigate } from "react-router-dom";

export default function RecoverScreen() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const navigate = useNavigate()
    
    const [isFirstStageCompleted, setIsFirstStageCompleted] = useState(false)
    const {userToken, setUserToken, setUserId } = useUser()
    const [hash, setHash] = useState("")
    const [code, setCode] = useState("")
    const [errorMsg, setErrorMsg] = useState("")

    const isButtonDisabled = !username || !password || password !== confirmPassword;

    if (userToken !== "") navigate('/account')


    return (
        <div className={styles['body']}>
            <h2>Восстановление пароля</h2>
            <div className={styles['form-container']}>
                
                {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

                {!isFirstStageCompleted ? (
                    <div>
                        <input 
                            type="text"
                            name="username"
                            placeholder="Юзернейм или email"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                       
                        <input 
                            type="password"
                            name="password" 
                            placeholder="Новый пароль"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />

                        <input 
                            type="password"
                            name="confirmPassword" 
                            placeholder="Подтвердите пароль"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />

                        <button 
                            onClick={() => handleRecoverFirstStage(
                                username, 
                                setHash, 
                                setIsFirstStageCompleted, 
                                setErrorMsg
                            )} 
                            disabled={isButtonDisabled}
                        >
                            Продолжить
                        </button>
                    </div>
                ) : (
                    <div>
                        <p>Проверьте почту, на которую был зарегистрирован аккаунт, там лежит код.</p>
                        <p>Введите его сюда:</p>
                        <input 
                            type="text" 
                            placeholder="Код из письма"
                            onChange={e => setCode(e.target.value)}
                            value={code}
                        />
                        <button 
                            onClick={() => handleRecoverSecondStage(
                                username,
                                password,
                                hash,
                                code,
                                setUserToken,
                                setUserId,
                                setErrorMsg
                            )}
                        >
                            Отправить
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

async function handleRecoverFirstStage(
    username: string, 
    setHash: (hash: string) => void,
    setIsFirstStageCompleted: (state: boolean) => void,
    setErrorMsg: (msg: string) => void
) {
    setErrorMsg("");
    try {
        const response = await fetch(`https://api-s.anixsekai.com/auth/restore`, { 
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({ data: username })
        });
        
        const rawText = await response.text();
        console.log("Response:", rawText);

        if (!rawText) {
            setErrorMsg("Сервер прислал пустой ответ");
            return;
        }

        const data = JSON.parse(rawText);
        if (data.code !== 0) throw new Error(data.message || "Ошибка восстановления");

        setHash(data.hash);
        setIsFirstStageCompleted(true);
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Не удалось отправить код");
    }
}

async function handleRecoverSecondStage(
    username: string, 
    password: string, 
    hash: string, 
    code: string, 
    setUserToken: (token: string) => void,
    setUserId: (id: number) => void,
    setErrorMsg: (msg: string) => void
) {
    setErrorMsg("");
    try {
        const response = await fetch(`https://api-s.anixsekai.com/auth/restore/verify`, {   
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({ data: username, password: password, hash: hash, code:code })
            });
        if (!response.ok) throw new Error("Ошибка при подтверждении: " + response.status);

        const data = await response.json();
        if (data.code !== 0) throw new Error(data.message || "Неверный код или не удалось восстановить пароль");
        if (data.profileToken && data.profileToken.token) {
            setUserToken(data.profileToken.token);
            setUserId(data.profileToken.id);
            alert("Пароль успешно изменен! Вы вошли в аккаунт.");
        }
    } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Ошибка при вводе кода");
    }
}
