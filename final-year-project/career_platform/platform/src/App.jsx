import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import './App.css';
import {
  loginStudent,
  loginTeacher,
  fetchTeacherStudents,
  generateQuizFromTopic,
} from './api';

const ROLE_STUDENT = 'student';
const ROLE_TEACHER = 'teacher';

function RequireStudent({ user, children }) {
  if (!user || user.role !== ROLE_STUDENT) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireTeacher({ user, children }) {
  if (!user || user.role !== ROLE_TEACHER) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const [role, setRole] = useState(ROLE_STUDENT);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = () => {
    setUser(null);
    setError('');
  };

  const handleLogin = async (formData) => {
    setLoading(true);
    setError('');

    try {
      if (role === ROLE_STUDENT) {
        const result = await loginStudent(formData);
        setUser(result);
      } else {
        const result = await loginTeacher(formData);
        setUser(result);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const defaultRedirect =
    user?.role === ROLE_STUDENT
      ? '/student/dashboard'
      : user?.role === ROLE_TEACHER
        ? '/teacher/dashboard'
        : null;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo-block">
          <Link to="/" className="logo-link">
            <div className="logo-mark">CP</div>
          </Link>
          <div className="logo-text">
            <h1>Career Platform</h1>
            <p>Smart practice and insights for college students</p>
          </div>
        </div>
        {user && (
          <div className="user-pill">
            <div className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-role">
                {user.role === ROLE_STUDENT ? 'Student' : 'Teacher'}
              </span>
            </div>
            <button className="btn btn-ghost-small" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              defaultRedirect ? (
                <Navigate to={defaultRedirect} replace />
              ) : (
                <LoginScreen
                  role={role}
                  setRole={setRole}
                  onLogin={handleLogin}
                  loading={loading}
                  error={error}
                />
              )
            }
          />

          <Route
            path="/student/dashboard"
            element={
              <RequireStudent user={user}>
                <StudentDashboard student={user} />
              </RequireStudent>
            }
          />

          <Route
            path="/student/quiz"
            element={
              <RequireStudent user={user}>
                <StudentQuizPage student={user} />
              </RequireStudent>
            }
          />

          <Route
            path="/teacher/dashboard"
            element={
              <RequireTeacher user={user}>
                <TeacherDashboard teacher={user} />
              </RequireTeacher>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <span>Made for college career exploration</span>
        <span className="footer-dot">•</span>
        <span>Frontend-only mock backend · Gemini-powered quizzes when configured</span>
      </footer>
    </div>
  );
}

function LoginScreen({ role, setRole, onLogin, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email: email.trim(), password });
  };

  const isTeacher = role === ROLE_TEACHER;

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <div className="role-toggle">
          <button
            type="button"
            className={`role-chip ${!isTeacher ? 'active' : ''}`}
            onClick={() => setRole(ROLE_STUDENT)}
            disabled={loading}
          >
            Student
          </button>
          <button
            type="button"
            className={`role-chip ${isTeacher ? 'active' : ''}`}
            onClick={() => setRole(ROLE_TEACHER)}
            disabled={loading}
          >
            Teacher
          </button>
        </div>

        <h2 className="auth-title">
          {isTeacher ? 'Teacher Login' : 'Student Login'}
        </h2>
        <p className="auth-subtitle">
          {isTeacher
            ? 'Use one of the predefined faculty accounts to access the analytics dashboard.'
            : 'Login with your college email to take topic-based quizzes and track your readiness.'}
        </p>

        {isTeacher && (
          <div className="hint-box">
            <p className="hint-title">Demo teacher credentials</p>
            <ul className="hint-list">
              <li>
                <span className="hint-label">Email:</span>{' '}
                <code>ananya.sharma@college.edu</code> ·{' '}
                <span className="hint-label">Password:</span> <code>teacher123</code>
              </li>
              <li>
                <span className="hint-label">Email:</span>{' '}
                <code>rahul.iyer@college.edu</code> ·{' '}
                <span className="hint-label">Password:</span> <code>teacher123</code>
              </li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              {isTeacher ? 'College email (teacher)' : 'College email'}
            </label>
            <input
              type="email"
              className="input"
              placeholder={
                isTeacher
                  ? 'ananya.sharma@college.edu'
                  : 'yourname@college.edu'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder={isTeacher ? 'teacher123' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </section>

      <section className="auth-side">
        <h3>Why this platform?</h3>
        <ul>
          <li>
            <span>Students</span> get quick topic-wise quizzes to check their readiness
            before exams or placements.
          </li>
          <li>
            <span>Teachers</span> get an overview of student attempts and average scores
            (mocked for now).
          </li>
          <li>
            Backend is mocked today but wired through a clean API layer so you can plug
            in real services later.
          </li>
        </ul>
      </section>
    </div>
  );
}

function StudentDashboard({ student }) {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div>
          <h2>Welcome back, {student.name}</h2>
          <p>
            Practice placement topics, see where you stand, and share your progress with
            mentors.
          </p>
        </div>
        <div className="badge-row">
          <div className="badge">
            <span className="badge-label">Role</span>
            <span className="badge-value">Student</span>
          </div>
          <div className="badge">
            <span className="badge-label">Branch</span>
            <span className="badge-value">{student.branch}</span>
          </div>
          <div className="badge">
            <span className="badge-label">Year</span>
            <span className="badge-value">{student.year}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card take-quiz-card">
          <h3>Take a quick topic quiz</h3>
          <p className="card-subtitle">
            Enter any subject or topic (e.g. &quot;Operating Systems - Deadlocks&quot;,
            &quot;OOP in Java&quot;) and we will generate a short multiple-choice quiz on
            a separate page.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/student/quiz')}
          >
            Go to quiz page
          </button>
        </div>
      </section>
    </div>
  );
}

function StudentQuizPage({ student }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [quizState, setQuizState] = useState({
    loading: false,
    error: '',
    questions: [],
    answers: {},
    submitted: false,
  });

  const hasQuiz = quizState.questions.length > 0;

  const startQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setQuizState({
      loading: true,
      error: '',
      questions: [],
      answers: {},
      submitted: false,
    });

    try {
      const result = await generateQuizFromTopic(topic.trim(), 5);
      setQuizState((prev) => ({
        ...prev,
        loading: false,
        questions: result.questions,
        fromGemini: result.fromGemini,
      }));
    } catch (err) {
      setQuizState((prev) => ({
        ...prev,
        loading: false,
        error: 'Could not generate quiz. Please try again.',
      }));
    }
  };

  const handleAnswerChange = (questionId, optionIndex) => {
    if (quizState.submitted) return;
    setQuizState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: optionIndex,
      },
    }));
  };

  const handleSubmitQuiz = () => {
    if (!hasQuiz) return;
    setQuizState((prev) => ({
      ...prev,
      submitted: true,
    }));
  };

  const handleResetQuiz = () => {
    setQuizState({
      loading: false,
      error: '',
      questions: [],
      answers: {},
      submitted: false,
    });
    setTopic('');
  };

  const computeScore = () => {
    if (!hasQuiz) return { score: 0, total: 0 };
    let correct = 0;

    quizState.questions.forEach((q) => {
      if (quizState.answers[q.id] === q.answerIndex) {
        correct += 1;
      }
    });

    return { score: correct, total: quizState.questions.length };
  };

  const { score, total } = computeScore();

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div>
          <h2>Topic quiz for {student?.name || 'student'}</h2>
          <p>
            Generate a short multiple-choice quiz for any topic. Use results to see where
            you need revision.
          </p>
        </div>
        <div className="badge-row">
          <div className="badge">
            <span className="badge-label">Page</span>
            <span className="badge-value">Student quiz</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card take-quiz-card">
          <h3>Choose your topic</h3>
          <p className="card-subtitle">
            Example topics: &quot;DBMS normalization&quot;, &quot;OOP concepts in
            Java&quot;, &quot;Operating Systems - Scheduling&quot;.
          </p>

          <form onSubmit={startQuiz} className="quiz-form">
            <label className="form-label">Topic</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Data Structures - Trees"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={quizState.loading}
              required
            />
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={quizState.loading}
            >
              {quizState.loading ? 'Generating quiz…' : 'Generate quiz'}
            </button>
            {quizState.error && <div className="error-banner">{quizState.error}</div>}
            {hasQuiz && (
              <p className="hint-text">
                {quizState.fromGemini
                  ? 'Questions generated live from Gemini.'
                  : 'Gemini API key not configured. Using built-in demo questions.'}
              </p>
            )}
          </form>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/student/dashboard')}
          >
            ← Back to dashboard
          </button>
        </div>

        <div className="card quiz-card">
          {!hasQuiz && !quizState.loading && (
            <div className="empty-quiz">
              <p className="empty-title">No quiz yet</p>
              <p className="empty-text">
                Start by entering a topic on the left. We will generate 5 questions for
                you.
              </p>
            </div>
          )}

          {quizState.loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Talking to Gemini / loading questions…</p>
            </div>
          )}

          {hasQuiz && (
            <div className="quiz-content">
              <div className="quiz-header">
                <div>
                  <h3>Quiz on: {topic}</h3>
                  <p>{quizState.questions.length} questions · single correct option</p>
                </div>
                {quizState.submitted && (
                  <div className="score-pill">
                    <span>Score</span>
                    <strong>
                      {score}/{total}
                    </strong>
                  </div>
                )}
              </div>

              <ol className="question-list">
                {quizState.questions.map((q, index) => (
                  <li key={q.id} className="question-item">
                    <p className="question-text">
                      Q{index + 1}. {q.question}
                    </p>
                    <div className="options-grid">
                      {q.options.map((opt, idx) => {
                        const selected = quizState.answers[q.id] === idx;
                        const isCorrect = q.answerIndex === idx;
                        const showState = quizState.submitted;

                        let optionClass = 'option-pill';
                        if (showState) {
                          if (isCorrect) optionClass += ' correct';
                          else if (selected && !isCorrect) optionClass += ' incorrect';
                        } else if (selected) {
                          optionClass += ' selected';
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            className={optionClass}
                            onClick={() => handleAnswerChange(q.id, idx)}
                          >
                            <span className="option-letter">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="quiz-actions">
                {!quizState.submitted ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitQuiz}
                  >
                    Submit quiz
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleResetQuiz}
                    >
                      New topic
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setQuizState((prev) => ({
                          ...prev,
                          submitted: false,
                        }))
                      }
                    >
                      Review answers again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TeacherDashboard({ teacher }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    students: [],
  });

  useEffect(() => {
    let mounted = true;
    fetchTeacherStudents(teacher.id)
      .then((res) => {
        if (!mounted) return;
        setState({
          loading: false,
          error: '',
          students: res.students || [],
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setState({
          loading: false,
          error: err.message || 'Failed to load students',
          students: [],
        });
      });

    return () => {
      mounted = false;
    };
  }, [teacher.id]);

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div>
          <h2>Welcome, {teacher.name}</h2>
          <p>
            Track how your students are performing on topic-wise quizzes and which areas
            may need revision. Data is mocked for now but the layout is ready for a real
            backend.
          </p>
        </div>
        <div className="badge-row">
          <div className="badge">
            <span className="badge-label">Role</span>
            <span className="badge-value">Teacher</span>
          </div>
          <div className="badge">
            <span className="badge-label">Department</span>
            <span className="badge-value">{teacher.department}</span>
          </div>
        </div>
      </section>

      <section className="teacher-section card">
        <div className="teacher-header">
          <div>
            <h3>Student quiz overview</h3>
            <p className="card-subtitle">
              Once you have a backend, wire this table to real quiz submissions.
            </p>
          </div>
        </div>

        {state.loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading mock student data…</p>
          </div>
        )}

        {state.error && <div className="error-banner">{state.error}</div>}

        {!state.loading && !state.error && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Last topic</th>
                  <th>Attempts</th>
                  <th>Average score</th>
                </tr>
              </thead>
              <tbody>
                {state.students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="student-cell">
                        <div className="avatar-circle">
                          {s.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="student-name">{s.name}</div>
                          <div className="student-email">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.branch}</td>
                    <td>{s.lastTopic}</td>
                    <td>{s.attempts}</td>
                    <td>
                      <span className="score-chip">{s.averageScore}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;

