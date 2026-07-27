import { useState } from "react"
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../shared/contexts/userContext";
import styles from './LoginScreen.module.css'

export default function LoginScreen(){
    const [username, setUsername] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const {userToken, setUserToken, setUserId} = useUser()
    const navigate = useNavigate()

    if (userToken !== "") navigate('/account')

    return(
        <div className={styles['body']}>
            <h2>Войдите в свой аккаунт Anixart</h2>
            <div className={styles['form-container']}>
                <input type="text"
                       name="username"
                       placeholder="Юзернейм"
                       onChange={e => setUsername(e.target.value)}/>
                       
                <input type="password"
                       name="password" 
                       placeholder="Пароль"
                       onChange={e => setPassword(e.target.value)}/>
                       
                <div className={styles['actions']}>
                    <Link to='/account/recover'>Забыли пароль?</Link>
                    <Link to='/account/create'>Зарегистрироваться</Link>
                </div>
                
                <button onClick={() => {handleLogin(username, password, setUserToken, setUserId)}}>Войти</button>
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
        setUserToken(data.profileToken.token)
        setUserId(data.profileToken.id)
        console.log(data)
        alert(`Logged in:`)
        return
    }
    throw new Error("Failed to login")
}