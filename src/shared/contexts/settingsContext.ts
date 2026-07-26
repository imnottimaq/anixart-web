import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import { type AppSettings } from "../types/settings";

export const SettingsContext = createContext<{
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
}| null>(null)

export function useSettings(){
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings failed')
  return context
}