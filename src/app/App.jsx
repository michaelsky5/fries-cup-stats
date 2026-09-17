import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider.jsx'
import router, { RouteFallback } from './router.jsx'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} fallbackElement={<RouteFallback />} />
    </AuthProvider>
  )
}
