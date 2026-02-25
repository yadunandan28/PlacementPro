// pages/ProfilePage.jsx — role-aware profile (staff vs student)
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { userAPI } from '../api'
import AppLayout from '../components/layout/AppLayout'
import { Card, Button, Input, Select, Badge } from '../components/ui'
import { User, Hash, GraduationCap, Upload, Plus, X, CheckCircle } from 'lucide-react'

const DEPARTMENTS = [
  'Computer Science & Engineering','Information Technology',
  'Electronics & Communication','Electrical Engineering',
  'Mechanical Engineering','Civil Engineering',
]

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const isStaff = user?.role === 'staff' || user?.role === 'admin'

  const [form, setForm] = useState({
    name:       user?.name       || '',
    rollNumber: user?.rollNumber || '',
    cgpa:       user?.cgpa       || '',
    department: user?.department || 'Computer Science & Engineering',
  })
  const [skills,    setSkills]    = useState(user?.skills || [])
  const [newSkill,  setNewSkill]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const addSkill = () => {
    const s = newSkill.trim()
    if (s && !skills.includes(s)) { setSkills([...skills, s]); setNewSkill('') }
  }
  const removeSkill = (s) => setSkills(skills.filter(x => x !== s))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const payload = isStaff
        ? { name: form.name, department: form.department }
        : { ...form, cgpa: Number(form.cgpa), skills }
      const { data } = await userAPI.updateProfile(payload)
      setUser(data.data.user)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await userAPI.uploadResume(file)
      setUser({ ...user, resumeUrl: data.data.resumeUrl })
    } catch { setError('Resume upload failed. Check Cloudinary config in .env') }
    finally { setUploading(false) }
  }

  return (
    <AppLayout>
      <div className="fade-in max-w-2xl">
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Account</p>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
        </div>

        <Card className="mb-6">
          <div className="p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">{user?.name}</h2>
              <p className="text-slate-500 text-sm font-mono">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge color={isStaff ? 'amber' : 'blue'}>{user?.role}</Badge>
                {!isStaff && user?.cohort && (
                  <Badge color="purple">{typeof user.cohort === 'object' ? user.cohort.name : 'Cohort selected'}</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <Card className="mb-6">
          <div className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-widest font-mono">
              {isStaff ? 'Staff Info' : 'Personal Info'}
            </h3>
            <Input label="Full Name" value={form.name} onChange={set('name')} icon={<User size={14} />} />
            {!isStaff && (
              <>
                <Input label="Roll Number" value={form.rollNumber} onChange={set('rollNumber')} icon={<Hash size={14} />} placeholder="e.g. 21CS001" />
                <Input label="CGPA" type="number" step="0.1" min="0" max="10" value={form.cgpa} onChange={set('cgpa')} icon={<GraduationCap size={14} />} placeholder="e.g. 8.5" />
              </>
            )}
            <Select label="Department" value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
        </Card>

        {!isStaff && (
          <>
            <Card className="mb-6">
              <div className="p-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-widest font-mono mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm font-mono">
                      {s}
                      <button onClick={() => removeSkill(s)} className="text-blue-400/50 hover:text-red-400 transition-colors"><X size={12} /></button>
                    </span>
                  ))}
                  {skills.length === 0 && <p className="text-slate-600 text-sm">No skills added yet</p>}
                </div>
                <div className="flex gap-2">
                  <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="Add a skill (e.g. Python, Docker)"
                    className="flex-1 bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                  <Button variant="secondary" size="sm" onClick={addSkill}><Plus size={14} /> Add</Button>
                </div>
              </div>
            </Card>

            <Card className="mb-6">
              <div className="p-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-widest font-mono mb-4">Resume</h3>
                {user?.resumeUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg mb-3">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-green-300 text-sm">Resume uploaded</span>
                    <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 text-xs hover:underline">View</a>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-3">No resume uploaded yet</p>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#151e30] border border-[#1c2a42] rounded-lg text-sm text-slate-300 hover:border-slate-600 cursor-pointer transition-all">
                  <Upload size={14} />
                  {uploading ? 'Uploading...' : 'Upload PDF Resume'}
                  <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-slate-600 mt-2">⚠️ Requires Cloudinary setup in .env</p>
              </div>
            </Card>
          </>
        )}

        <Button onClick={handleSave} loading={saving} size="lg">
          {saved ? <><CheckCircle size={16} /> Saved!</> : 'Save Changes'}
        </Button>
      </div>
    </AppLayout>
  )
}