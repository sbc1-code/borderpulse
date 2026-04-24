import { createContext, useContext } from 'react';

export const LangContext = createContext('en');

export function useLang() {
  return useContext(LangContext);
}
