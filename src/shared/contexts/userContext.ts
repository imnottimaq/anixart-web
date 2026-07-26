import { createContext, useContext } from "react";

export const UserContext = createContext<{
  userToken: string;
  setUserToken: (token: string) => void; 
}| null>(null)

export function useUser(){
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser failed')
  return context
}