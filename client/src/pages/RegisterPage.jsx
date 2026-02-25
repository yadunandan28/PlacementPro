// ============================================================
//  pages/RegisterPage.jsx
// ============================================================
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Hash } from 'lucide-react'
import { authAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import { Button, Input, Select } from '../components/ui'

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    name: '', email: '', password: '', rollNumber: '',
    department: 'Computer Science & Engineering',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authAPI.register(form)
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken)
      navigate('/select-cohort')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-in">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl font-mono mb-4">P</div>
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-slate-500 text-sm">Join PlacementPro with your KCT email</p>
        </div>

        <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl p-8">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Full Name" type="text" placeholder="Your full name"
              icon={<User size={15} />} value={form.name} onChange={set('name')} required />

            <Input label="College Email" type="email" placeholder="yourname@kct.ac.in"
              icon={<Mail size={15} />} value={form.email} onChange={set('email')} required />

            <Input label="Roll Number" type="text" placeholder="e.g. 21CS001"
              icon={<Hash size={15} />} value={form.rollNumber} onChange={set('rollNumber')} />

            <Select label="Department" value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>

            <Input label="Password" type="password" placeholder="Min 6 characters"
              icon={<Lock size={15} />} value={form.password} onChange={set('password')} required />

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
