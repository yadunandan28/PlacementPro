// ============================================================
//  pages/LoginPage.jsx
// ============================================================
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { authAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import { Button, Input } from '../components/ui'

export default function LoginPage() {
  const navigate  = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authAPI.login(form)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      const user = data.data.user
      if (user.role === 'staff' || user.role === 'admin') {
        navigate('/staff')
      } else if (!user.cohort) {
        navigate('/select-cohort')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md fade-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl font-mono mb-4">P</div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm">Sign in to PlacementPro — KCT</p>
        </div>

        {/* Card */}
        <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="College Email"
              type="email"
              placeholder="yourname@kct.ac.in"
              icon={<Mail size={15} />}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={15} />}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Sign In
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-4 border-t border-[#1c2a42]">
            <p className="text-xs text-slate-600 font-mono mb-3 text-center">DEMO ACCOUNTS</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Student', email: 'student@kct.ac.in', pwd: 'Student@123' },
                { label: 'Staff',   email: 'staff@kct.ac.in',   pwd: 'Staff@123'   },
              ].map(({ label, email, pwd }) => (
                <button
                  key={label}
                  onClick={() => setForm({ email, password: pwd })}
                  className="px-3 py-2 bg-[#151e30] border border-[#1c2a42] rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:border-blue-500/30 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          New student?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
