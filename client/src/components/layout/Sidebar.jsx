// ============================================================
//  components/layout/Sidebar.jsx  —  App Navigation Sidebar
// ============================================================
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authAPI } from '../../api'
import {
  LayoutDashboard, Code2, BookOpen, User,
  LogOut, BarChart3, ChevronRight, ClipboardList, Bot
} from 'lucide-react'

const studentNav = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/modules',     icon: BookOpen,        label: 'Learning Path' },
  { to: '/assessments', icon: ClipboardList,   label: 'Assessments'   },
  { to: '/practice',    icon: Code2,           label: 'Practice'      },
  { to: '/chatbot',     icon: Bot,             label: 'JD Analyzer', badge: 'AI' },
  { to: '/profile',     icon: User,            label: 'Profile'       },
]

const staffNav = [
  { to: '/staff',   icon: BarChart3, label: 'Dashboard' },
  { to: '/profile', icon: User,      label: 'Profile' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const nav = (user?.role === 'staff' || user?.role === 'admin') ? staffNav : studentNav

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-[#0a0e1a] border-r border-[#1c2a42] flex flex-col fixed left-0 top-0 z-40">

      {/* Logo */}
      <div className="p-6 border-b border-[#1c2a42]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm font-mono">P</div>
          <div>
            <div className="font-bold text-sm text-white">PlacementPro</div>
            <div className="text-xs text-slate-500 font-mono">KCT</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-[#1c2a42]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 font-mono truncate">{user?.role}</div>
          </div>
        </div>
        {user?.cohort && (
          <div className="mt-2 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300 font-mono truncate">
              {typeof user.cohort === 'object' ? user.cohort.icon + ' ' + user.cohort.name : '📚 Cohort selected'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
               ${isActive
                ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-blue-400' : ''} />
                <span className="font-medium">{label}</span>
                {badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-full">
                    {badge}
                  </span>
                )}
                {isActive && !badge && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#1c2a42]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}