// ============================================================
//  pages/CodingPage.jsx  —  Code Editor + Problem Statement
// ============================================================
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { questionAPI, submissionAPI } from '../api'
import { DiffBadge, Badge, Button, Spinner } from '../components/ui'
import { Play, ChevronLeft, CheckCircle, XCircle } from 'lucide-react'

const LANGUAGES = [
  { value: 'python',     label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java',       label: 'Java' },
  { value: 'cpp',        label: 'C++' },
]

export default function CodingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [question, setQuestion] = useState(null)
  const [language, setLanguage] = useState('python')
  const [code,     setCode]     = useState('')
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)

  useEffect(() => {
    questionAPI.getById(id).then(({ data }) => {
      const q = data.data.question
      setQuestion(q)
      // Set starter code for default language
      const starter = q.starterCode?.[language] || ''
      setCode(starter)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // When language changes, switch starter code
  const handleLangChange = (lang) => {
    setLanguage(lang)
    const starter = question?.starterCode?.[lang] || ''
    setCode(starter)
    setResult(null)
  }

  const handleSubmit = async () => {
    setRunning(true)
    setResult(null)
    try {
      const { data } = await submissionAPI.submitCode({ questionId: id, code, language })
      setResult(data.data)
    } catch (err) {
      setResult({ status: 'error', message: err.response?.data?.message || 'Submission failed' })
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Problem not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07090f' }}>

      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#0a0e1a] border-b border-[#1c2a42]">
        <button onClick={() => navigate('/practice')} className="flex items-center gap-2 text-slate-500 hover:text-slate-200 text-sm transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="font-semibold text-white text-sm">{question.title}</span>
          <DiffBadge difficulty={question.difficulty} />
          <Badge color="blue">{question.topic}</Badge>
        </div>

        {/* Language selector */}
        <select
          value={language}
          onChange={e => handleLangChange(e.target.value)}
          className="bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
        >
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        <Button onClick={handleSubmit} loading={running} size="sm">
          <Play size={14} /> Run & Submit
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 53px)' }}>

        {/* Left: Problem description */}
        <div className="w-2/5 overflow-y-auto p-6 border-r border-[#1c2a42]">
          <h2 className="font-bold text-white text-lg mb-4">{question.title}</h2>

          <p className="text-slate-400 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {question.description}
          </p>

          {/* Examples */}
          {question.examples?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Examples</h3>
              {question.examples.map((ex, i) => (
                <div key={i} className="bg-[#0d1117] border border-[#1c2a42] rounded-lg p-4 mb-3 text-sm font-mono">
                  <div className="text-slate-500 mb-1">Input:</div>
                  <div className="text-green-400 mb-2">{ex.input}</div>
                  <div className="text-slate-500 mb-1">Output:</div>
                  <div className="text-blue-400 mb-2">{ex.output}</div>
                  {ex.explanation && (
                    <div className="text-slate-500 text-xs mt-2">{ex.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {question.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.tags.map(tag => <Badge key={tag} color="slate">{tag}</Badge>)}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Results</h3>

              {result.status === 'error' ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                  {result.message}
                </div>
              ) : (
                <>
                  <div className={`flex items-center gap-2 p-4 rounded-lg mb-3 ${result.status === 'passed' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {result.status === 'passed'
                      ? <CheckCircle size={16} className="text-green-400" />
                      : <XCircle size={16} className="text-red-400" />}
                    <span className={`font-bold text-sm ${result.status === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
                      {result.testsPassed}/{result.testsTotal} test cases passed
                    </span>
                    <span className="ml-auto text-slate-500 text-xs font-mono">{result.score}%</span>
                  </div>

                  {result.results?.map((r, i) => (
                    <div key={i} className={`p-3 rounded-lg mb-2 border text-xs font-mono ${r.passed ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {r.passed ? <CheckCircle size={12} className="text-green-400" /> : <XCircle size={12} className="text-red-400" />}
                        <span className="text-slate-400">Test {i + 1}</span>
                      </div>
                      {!r.passed && (
                        <>
                          <div className="text-slate-500">Expected: <span className="text-blue-400">{r.expectedOutput}</span></div>
                          <div className="text-slate-500">Got: <span className="text-red-400">{r.actualOutput}</span></div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Code editor */}
        <div className="flex-1 flex flex-col">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language === 'javascript' ? 'javascript' : language}
            value={code}
            onChange={val => setCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              suggestOnTriggerCharacters: true,
            }}
          />
        </div>
      </div>
    </div>
  )
}
