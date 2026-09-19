import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider.jsx'
import router, { RouteFallback } from './router.jsx'
import useInitialPageReady from './useInitialPageReady.js'

export default function App() {
  useInitialPageReady(router)
  return (
    <AuthProvider>
      <RouterProvider router={router} fallbackElement={<RouteFallback />} />
    </AuthProvider>
  )
}
