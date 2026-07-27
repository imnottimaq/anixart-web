import { useState } from "react"
import { useUser } from "../shared/contexts/userContext";
import styles from './LoginScreen.module.css'
import { useNavigate } from "react-router-dom";

export default function NewAccountScreen() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const navigate = useNavigate()
    
    const [isFirstStageCompleted, setIsFirstStageCompleted] = useState(false)
    const {userToken, setUserToken, setUserId } = useUser()
    const [hash, setHash] = useState("")
    const [code, setCode] = useState("")
    const [errorMsg, setErrorMsg] = useState("")

    const isButtonDisabled = !username || !email || !password || password !== confirmPassword;

    if (userToken !== "") navigate('/account')

    return (
        <div className={styles['body']}>
            <h2>Создание аккаунта</h2>
            <div className={styles['form-container']}>
                
                {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

                {!isFirstStageCompleted ? (
                    <div>
                        <input 
                            type="text"
                            name="username"
                            placeholder="Юзернейм"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />

                        <input 
                            type="text"
                            name="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                       
                        <input 
                            type="password"
                            name="password" 
                            placeholder="Пароль"
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
                            onClick={() => handleCreateFirstStage(
                                username, 
                                email,
                                password,
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
                        <p>Проверьте почту, которую вы указали, там лежит код.</p>
                        <p>Введите его сюда:</p>
                        <input 
                            type="text" 
                            placeholder="Код из письма"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                        <button 
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
                        >
                            Отправить
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

async function handleCreateFirstStage(
    username: string,
    email: string,
    password: string, 
    setHash: (hash: string) => void,
    setIsFirstStageCompleted: (state: boolean) => void,
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
        console.log("Response:", rawText);

        if (!rawText) {
            setErrorMsg("Сервер прислал пустой ответ");
            return;
        }

        const data = JSON.parse(rawText);
        if (data.code !== 0) throw new Error(data.message || "Ошибка создания аккаунта");

        setHash(data.hash);
        setIsFirstStageCompleted(true);
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
