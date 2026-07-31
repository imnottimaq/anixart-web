import { saveRoomIdentity } from './roomParticipant';

type SearchProfile = { id: number; login: string; avatar?: string | null };

export async function resolveAndStoreProfileIdentity(login: string): Promise<number | null> {
    const response = await fetch('https://api-s.anixsekai.com/search/profiles/0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: login.trim(), searchBy: 0 }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { code?: number; content?: SearchProfile[]; profiles?: SearchProfile[] };
    if (data.code !== 0) return null;
    const profiles = data.content ?? data.profiles ?? [];
    const normalizedLogin = login.trim().toLocaleLowerCase();
    const profile = profiles.find(item => item.login.toLocaleLowerCase() === normalizedLogin) ?? profiles[0];
    if (!profile?.id || !profile.login) return null;
    saveRoomIdentity({ id: profile.id, login: profile.login, avatar: profile.avatar ?? null });
    return profile.id;
}
