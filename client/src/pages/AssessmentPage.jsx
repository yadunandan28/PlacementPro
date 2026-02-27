import { useState, useEffect } from 'react'
import { cohortAPI, analyticsAPI } from '../api'
import AppLayout from '../components/layout/AppLayout'
import { Card, Button, Badge, LoadingScreen, Spinner } from '../components/ui'
import { CheckCircle, X, RotateCcw, Trophy, BookOpen } from 'lucide-react'

const SUBJECTS = [
  { key:'os',   label:'Operating Systems',    icon:'🖥️', color:'#a855f7', border:'border-purple-500/20', bg:'bg-purple-500/5',
    topics:['Process Management','Memory Management','CPU Scheduling','Synchronization','File Systems'] },
  { key:'dbms', label:'Database Management',  icon:'🗄️', color:'#22c55e', border:'border-green-500/20',  bg:'bg-green-500/5',
    topics:['SQL Queries','Normalization','Transactions & ACID','Indexing','ER Diagrams'] },
  { key:'cn',   label:'Computer Networks',    icon:'🌐', color:'#f59e0b', border:'border-amber-500/20',  bg:'bg-amber-500/5',
    topics:['OSI / TCP-IP Model','IP Addressing','TCP vs UDP','DNS & HTTP','Subnetting'] },
]

// ── QUIZ ──────────────────────────────────────────────────
function Quiz({ subject, onBack }) {
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({}) // { questionIndex: optionIndex }
  const [current,    setCurrent]    = useState(0)
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [prevScore,  setPrevScore]  = useState(0)

  useEffect(() => {
    cohortAPI.getAssessment(subject.key).then(({ data }) => {
      setQuestions(data.data.questions || [])
      setPrevScore(data.data.previousScore || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [subject.key])

  // Use question INDEX as key — avoids all ObjectId serialization issues
  const handleSelect = (idx, optionIdx) => {
    if (result) return
    setAnswers(prev => ({ ...prev, [idx]: optionIdx }))
  }

  const handleSubmit = async () => {
    const answered = Object.keys(answers).length
    if (answered < questions.length) {
      alert(`Please answer all ${questions.length} questions. (${answered}/${questions.length} answered)`)
      return
    }
    setSubmitting(true)
    try {
      // Send answers as array of { questionIndex, selectedOption }
      // Backend will match by index position
      const answersArray = questions.map((q, idx) => ({
        questionId: q._id,          // ID-based match (immune to caching)
        questionIndex: idx,          // index fallback
        selectedOption: answers[idx] ?? -1,
      }))
      const { data } = await cohortAPI.submitAssessment(subject.key, answersArray)
      setResult(data.data)
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    setCurrent(0)
    if (result) setPrevScore(Math.max(prevScore, result.score))
  }

  const answered  = Object.keys(answers).length
  const progress  = questions.length > 0 ? (answered / questions.length) * 100 : 0

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors text-sm font-mono">← Back</button>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{subject.icon}</span>
          <div>
            <h2 className="font-bold text-white">{subject.label}</h2>
            <p className="text-xs text-slate-500 font-mono">{questions.length} questions · Pass 70% to improve your score</p>
          </div>
        </div>
        {prevScore > 0 && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-[#151e30] border border-[#1c2a42] rounded-lg">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-xs font-mono text-slate-400">Best: <span className="text-amber-400 font-bold">{prevScore}%</span></span>
          </div>
        )}
      </div>

      {/* RESULTS */}
      {result ? (
        <Card>
          <div className="p-8 flex flex-col items-center text-center">
            <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center mb-5 border-4 ${
              result.score >= 70 ? 'border-green-500/40 bg-green-500/10' :
              result.score >= 40 ? 'border-amber-500/40 bg-amber-500/10' :
                                   'border-red-500/40 bg-red-500/10'
            }`}>
              <span className={`text-3xl font-bold font-mono ${
                result.score >= 70 ? 'text-green-400' : result.score >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}>{result.score}%</span>
              <span className="text-xs text-slate-500 font-mono mt-0.5">{result.earnedPoints}/{result.totalPoints} pts</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{result.message}</h3>
            {result.isNewBest && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 mt-1">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-xs text-amber-300 font-mono font-bold">New personal best!</span>
              </div>
            )}

            {/* Answer breakdown */}
            <div className="w-full max-w-lg text-left mt-6 flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Answer Review</p>
              {questions.map((q, i) => {
                const graded = result.gradedAnswers?.[i]
                return (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${graded?.isCorrect ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                    <div className="flex items-start gap-2">
                      {graded?.isCorrect
                        ? <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                        : <X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-slate-300 font-medium mb-1">{q.title}</p>
                        {!graded?.isCorrect && (
                          <>
                            <p className="text-xs text-red-400">Your answer: {graded?.selectedOption >= 0 ? q.options[graded.selectedOption]?.text : 'Not answered'}</p>
                            <p className="text-xs text-green-400">Correct: {q.options[graded?.correctOption]?.text}</p>
                            {q.explanation && <p className="text-xs text-slate-500 mt-1 italic">{q.explanation}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={handleRetry}><RotateCcw size={14} /> Try Again</Button>
              <Button onClick={onBack}>← Back to Assessments</Button>
            </div>
          </div>
        </Card>
      ) : (
        /* QUIZ VIEW */
        <div>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-mono">
              <span>{answered} / {questions.length} answered</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width:`${progress}%`, background:subject.color }} />
            </div>
          </div>

          {/* Question navigator */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                  i === current ? 'text-white'
                  : answers[i] !== undefined ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                  : 'bg-[#151e30] text-slate-500 border border-[#1c2a42]'
                }`}
                style={i === current ? { background:subject.color+'33', border:`1px solid ${subject.color}66` } : {}}
              >{i+1}</button>
            ))}
          </div>

          {/* Current question */}
          {questions[current] && (
            <Card>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono text-slate-500">Q{current+1} of {questions.length}</span>
                  <Badge color={questions[current].difficulty==='easy'?'green':questions[current].difficulty==='medium'?'amber':'red'}>
                    {questions[current].difficulty}
                  </Badge>
                  <span className="text-xs text-slate-600 font-mono">{questions[current].topic}</span>
                </div>

                <h3 className="text-white font-semibold mb-1">{questions[current].title}</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">{questions[current].description}</p>

                <div className="flex flex-col gap-2.5">
                  {questions[current].options?.map((opt, optIdx) => {
                    const isSelected = answers[current] === optIdx
                    return (
                      <button key={optIdx} onClick={() => handleSelect(current, optIdx)}
                        className={`w-full p-4 rounded-xl border text-left text-sm transition-all duration-150 ${
                          isSelected ? 'text-white' : 'border-[#1c2a42] bg-[#151e30] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                        style={isSelected ? { borderColor:subject.color+'66', background:subject.color+'15' } : {}}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold font-mono mr-3 ${isSelected?'text-white':'bg-[#1c2a42] text-slate-500'}`}
                          style={isSelected ? { background:subject.color } : {}}>
                          {String.fromCharCode(65+optIdx)}
                        </span>
                        {opt.text}
                      </button>
                    )
                  })}
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="ghost" size="sm" onClick={() => setCurrent(c=>Math.max(0,c-1))} disabled={current===0}>← Previous</Button>
                  {current < questions.length-1
                    ? <Button variant="secondary" size="sm" onClick={() => setCurrent(c=>c+1)}>Next →</Button>
                    : <Button onClick={handleSubmit} loading={submitting}>Submit Assessment</Button>
                  }
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function AssessmentPage() {
  const [myScores,   setMyScores]   = useState({})
  const [loading,    setLoading]    = useState(true)
  const [activeQuiz, setActiveQuiz] = useState(null)

  const loadScores = () => {
    analyticsAPI.getMyAnalytics().then(({ data }) => {
      const a = data.data.analytics || {}
      setMyScores({ os:a.osScore||0, dbms:a.dbmsScore||0, cn:a.cnScore||0 })
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadScores() }, [])

  const handleBack = () => { setActiveQuiz(null); loadScores() }

  const scoreColor = (s) => s>=70?'#22c55e':s>=40?'#f59e0b':s>0?'#ef4444':'#475569'
  const scoreLabel = (s) => s>=70?'Good':s>=40?'Average':s>0?'Needs work':'Not attempted'

  if (loading) return <LoadingScreen />

  return (
    <AppLayout>
      <div className="fade-in">
        {activeQuiz ? <Quiz subject={activeQuiz} onBack={handleBack} /> : (
          <>
            <div className="mb-8">
              <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Subject Tests</p>
              <h1 className="text-2xl font-bold text-white">Assessments</h1>
              <p className="text-slate-500 text-sm mt-1">Test your knowledge. Your best score is always saved.</p>
            </div>

            <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-3">
              <span className="text-lg flex-shrink-0">💻</span>
              <div>
                <p className="text-sm font-medium text-slate-300">DSA Assessment</p>
                <p className="text-xs text-slate-500 mt-0.5">Coding problems are in the <span className="text-blue-300">Practice</span> section — solve them there to improve your DSA score.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SUBJECTS.map(subject => {
                const score = myScores[subject.key] || 0
                return (
                  <Card key={subject.key} accent={subject.color} className="flex flex-col">
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{subject.icon}</span>
                        {score > 0 && (
                          <div className="text-right">
                            <div className="text-lg font-bold font-mono" style={{ color:scoreColor(score) }}>{score}%</div>
                            <div className="text-xs text-slate-500">{scoreLabel(score)}</div>
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-white mb-1">{subject.label}</h3>
                      {score > 0 && (
                        <div className="h-1.5 bg-[#1c2a42] rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full" style={{ width:`${score}%`, background:subject.color }} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-5 mt-1">
                        {subject.topics.map(t => (
                          <span key={t} className={`text-xs px-2 py-0.5 rounded-md border font-mono ${subject.bg} ${subject.border}`}
                            style={{ color:subject.color+'cc' }}>{t}</span>
                        ))}
                      </div>
                      <div className="mt-auto">
                        <Button onClick={() => setActiveQuiz(subject)} className="w-full" variant={score===0?'primary':'secondary'}>
                          <BookOpen size={15} />
                          {score===0?'Start Assessment':score>=70?'Retake to Beat Score':'Continue Practicing'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {Object.values(myScores).some(s=>s>0) && (
              <Card className="mt-6">
                <div className="p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4">Your Progress</h3>
                  <div className="flex flex-col gap-3">
                    {SUBJECTS.map(s => {
                      const score = myScores[s.key]||0
                      return (
                        <div key={s.key}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-slate-400">{s.icon} {s.label}</span>
                            <span className="font-bold font-mono" style={{ color:scoreColor(score) }}>{score>0?`${score}%`:'Not attempted'}</span>
                          </div>
                          <div className="h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${score}%`, background:s.color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}