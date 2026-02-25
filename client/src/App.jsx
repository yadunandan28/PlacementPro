// ============================================================
//  App.jsx  —  Root component with all routes
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Pages
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import CohortSelect    from './pages/CohortSelect'
import Dashboard       from './pages/Dashboard'
import PracticePage    from './pages/PracticePage'
import CodingPage      from './pages/CodingPage'
import ModulesPage     from './pages/ModulesPage'
import ProfilePage     from './pages/ProfilePage'
import StaffDashboard  from './pages/StaffDashboard'

// Route guards
const PrivateRoute = ({ children }) => {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

const CohortGuard = ({ children }) => {
  const { isLoggedIn, user } = useAuthStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!user?.cohort) return <Navigate to="/select-cohort" replace />
  return children
}

const StaffRoute = ({ children }) => {
  const { isLoggedIn, user } = useAuthStore()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (user?.role !== 'staff' && user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isLoggedIn, user } = useAuthStore()
  if (!isLoggedIn) return children
  if (user?.role === 'staff' || user?.role === 'admin') return <Navigate to="/staff" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<Navigate to="/login" replace />} />
        <Route path="/login"   element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Student — cohort selection (before dashboard) */}
        <Route path="/select-cohort" element={<PrivateRoute><CohortSelect /></PrivateRoute>} />

        {/* Student — requires cohort selected */}
        <Route path="/dashboard" element={<CohortGuard><Dashboard /></CohortGuard>} />
        <Route path="/practice"  element={<CohortGuard><PracticePage /></CohortGuard>} />
        <Route path="/practice/:id" element={<CohortGuard><CodingPage /></CohortGuard>} />
        <Route path="/modules"   element={<CohortGuard><ModulesPage /></CohortGuard>} />
        <Route path="/profile"   element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        {/* Staff */}
        <Route path="/staff" element={<StaffRoute><StaffDashboard /></StaffRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
