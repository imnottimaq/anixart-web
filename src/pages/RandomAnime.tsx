import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';

export default function RandomAnime(){
    const navigate = useNavigate();
    useEffect(() => {
        GetRelease()
            .then(data => {navigate(`/anime/${data.release.id}`, { state: { anime: data.release } });})
    }, [])
    return (
        <div>
            Randomizing...
        </div>
    )
}

async function GetRelease() {
    const response = await fetch(`https://api-s.anixsekai.com/release/random?extended_mode=true`)
    if (response.ok) return response.json()
    throw new Error("Error while trying to fetch release data:" + response.status);
}