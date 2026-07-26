import { useNavigate } from "react-router-dom"
import { useUser } from "../shared/contexts/userContext"
import { useEffect } from "react"

export default function AccountScreen(){
    const {userToken} = useUser()
    const navigate = useNavigate()
    console.log(userToken)
    useEffect(() => {
        if (userToken === "") navigate('/account/login')
    },[userToken])
    
    return (
        <div>

        </div>
    )
}