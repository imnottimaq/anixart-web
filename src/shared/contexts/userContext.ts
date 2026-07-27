import { createContext, useContext } from "react";

export const UserContext = createContext<{
  userToken: string;
  userId: number;
  setUserToken: (token: string) => void;
  setUserId: (id: string | number) => void; 
}| null>(null)

export function useUser(){
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser failed')
  return context
}