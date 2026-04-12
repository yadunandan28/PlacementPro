// ============================================================
//  pages/CohortSelect.jsx  —  Pick your learning domain
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cohortAPI, userAPI } from '../api'
import { useAuthStore } from '../store/authStore'
import { Button, LoadingScreen } from '../components/ui'
import { CheckCircle } from 'lucide-react'

export default function CohortSelect() {
  const navigate  = useNavigate()
  const { user, setUser } = useAuthStore()
  const [cohorts,   setCohorts]   = useState([])
  const [selected,  setSelected]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    cohortAPI.getAll().then(({ data }) => {
      setCohorts(data.data.cohorts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const { data } = await userAPI.selectCohort(selected._id)
      setUser(data.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to select cohort')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl fade-in">

        <div className="text-center mb-10">
          <p className="text-blue-400 font-mono text-xs tracking-widest uppercase mb-3">Step 1 of 1</p>
          <h1 className="text-3xl font-bold text-white mb-2">Choose your domain</h1>
          <p className="text-slate-500">Select the area you want to prepare for placement. You can't change this later.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {cohorts.length === 0 && (
          <div className="mb-8 px-5 py-6 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
            <p className="text-amber-200/90 font-medium mb-2">No learning domains available yet</p>
            <p className="mb-2">
              These choices are loaded from the server. If the list is empty, no cohorts exist in the database yet—ask an admin to create them, or seed demo data if you are setting up the app.
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Server: npm run seed:cohorts (requires MONGO_URI in server/.env), then refresh.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cohorts.map((cohort) => {
            const isSelected = selected?._id === cohort._id
            return (
              <button
                key={cohort._id}
                onClick={() => setSelected(cohort)}
                className={`relative p-5 rounded-xl border text-left transition-all duration-200 group
                  ${isSelected
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-[#1c2a42] bg-[#0f1623] hover:border-slate-600'}`}
              >
                {isSelected && (
                  <CheckCircle size={16} className="absolute top-3 right-3 text-blue-400" />
                )}
                <div className="text-3xl mb-3">{cohort.icon}</div>
                <div className="font-bold text-sm text-white mb-1">{cohort.name}</div>
                <div className="text-xs text-slate-500 leading-relaxed mb-3">{cohort.description}</div>
                <div className="flex flex-wrap gap-1">
                  {cohort.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-[#1c2a42] rounded text-xs text-slate-400 font-mono">{tag}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            loading={saving}
            size="lg"
            className="px-10"
          >
            {selected ? `Continue with ${selected.name} →` : 'Select a domain to continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
