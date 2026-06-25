import { createContext, useContext } from 'react'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ value, children }) {
  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  return useContext(FavoritesContext)
}
