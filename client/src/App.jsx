import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import CohortSelect    from './pages/CohortSelect'
import Dashboard       from './pages/Dashboard'
import PracticePage    from './pages/PracticePage'
import CodingPage      from './pages/CodingPage'
import ModulesPage     from './pages/ModulesPage'
import AssessmentPage  from './pages/AssessmentPage'
import ProfilePage     from './pages/ProfilePage'
import StaffDashboard  from './pages/StaffDashboard'
import ChatbotPage     from './pages/ChatbotPage'   // ← NEW Phase 5
import MockInterviewPage    from './pages/MockInterviewPage'
import MyInterviewsPage from './pages/MyInterviewsPage'
import ScheduleInterviewPage from './pages/ScheduleInterviewPage'



const isStaff = (user) => user?.role === 'staff' || user?.role === 'admin'

// Redirect to correct home based on role
const HomeRedirect = () => {
  const { user, accessToken } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (isStaff(user))               return <Navigate to="/staff" replace />
  if (!user?.cohort)               return <Navigate to="/select-cohort" replace />
  return <Navigate to="/dashboard" replace />
}

// Only unauthenticated users
const GuestRoute = ({ children }) => {
  const { user, accessToken } = useAuthStore()
  if (!accessToken) return children
  if (isStaff(user)) return <Navigate to="/staff" replace />
  return <Navigate to="/dashboard" replace />
}

// Must be logged in
const PrivateRoute = ({ children }) => {
  const { accessToken } = useAuthStore()
  return accessToken ? children : <Navigate to="/login" replace />
}

// Staff/admin only
const StaffRoute = ({ children }) => {
  const { user, accessToken } = useAuthStore()
  if (!accessToken)    return <Navigate to="/login" replace />
  if (!isStaff(user))  return <Navigate to="/dashboard" replace />
  return children
}

// Students only — redirect staff to their dashboard
const StudentRoute = ({ children }) => {
  const { user, accessToken } = useAuthStore()
  if (!accessToken)   return <Navigate to="/login" replace />
  if (isStaff(user))  return <Navigate to="/staff" replace />
  if (!user?.cohort)  return <Navigate to="/select-cohort" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<HomeRedirect />} />
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        <Route path="/select-cohort" element={<PrivateRoute><CohortSelect /></PrivateRoute>} />

        {/* Student-only routes */}
        <Route path="/dashboard"    element={<StudentRoute><Dashboard /></StudentRoute>} />
        <Route path="/practice"     element={<StudentRoute><PracticePage /></StudentRoute>} />
        <Route path="/practice/:id" element={<StudentRoute><CodingPage /></StudentRoute>} />
        <Route path="/modules"      element={<StudentRoute><ModulesPage /></StudentRoute>} />
        <Route path="/assessments"  element={<StudentRoute><AssessmentPage /></StudentRoute>} />
        <Route path="/chatbot"      element={<StudentRoute><ChatbotPage /></StudentRoute>} />  {/* NEW */}
        <Route path="/profile"      element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/interview/:slotId" element={<StudentRoute><MockInterviewPage /></StudentRoute>} />
        <Route path="/my-interviews" element={<StudentRoute><MyInterviewsPage /></StudentRoute>} />

        {/* Staff-only routes */}
        <Route path="/staff" element={<StaffRoute><StaffDashboard /></StaffRoute>} />
        <Route path="/staff/interviews"  element={<StaffRoute><ScheduleInterviewPage /></StaffRoute>} />

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}