import { useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button, Card, Badge } from "../components/ui";
import { careerAPI } from "../api";
import { Briefcase, Sparkles, Target } from "lucide-react";

function parseSkills(text) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CareerRecommendationsPage() {
  const [skillsInput, setSkillsInput] = useState("");
  const [desiredRole, setDesiredRole] = useState("");
  const [topK, setTopK] = useState(8);
  const [useEmbeddings, setUseEmbeddings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [mode, setMode] = useState("tfidf");
  const [gapLoadingId, setGapLoadingId] = useState("");
  const [skillGap, setSkillGap] = useState(null);

  const skills = useMemo(() => parseSkills(skillsInput), [skillsInput]);

  async function handleRecommend() {
    setError("");
    setSkillGap(null);
    setLoading(true);
    try {
      const { data } = await careerAPI.recommend({
        userSkills: skills,
        desiredRole,
        topK: Number(topK) || 8,
        minScore: 0,
        useEmbeddings,
      });
      setResults(data.data.recommendations || []);
      setMode(data.data.mode || "tfidf");
    } catch (e) {
      setError(e.response?.data?.message || "Could not fetch recommendations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkillGap(job) {
    setGapLoadingId(job.job_id);
    setError("");
    try {
      const { data } = await careerAPI.skillGap({
        userSkills: skills,
        jobId: job.job_id,
      });
      setSkillGap(data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Could not fetch skill-gap analysis.");
    } finally {
      setGapLoadingId("");
    }
  }

  return (
    <AppLayout>
      <div className="fade-in">
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Career intelligence</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase size={24} className="text-blue-400" />
            Job Recommendations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your target role and skills to get best-fit jobs, then run skill-gap analysis for any recommendation.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="text-xs text-slate-500 font-mono block mb-1">Desired Role</label>
              <input
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                placeholder="e.g. ML Engineer"
                className="w-full bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="md:col-span-6">
              <label className="text-xs text-slate-500 font-mono block mb-1">Skills (comma separated)</label>
              <input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, SQL, Docker, NLP"
                className="w-full bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-mono block mb-1">Top K</label>
              <input
                type="number"
                min={1}
                max={25}
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                className="w-full bg-[#151e30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>

          <div className="px-5 pb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-400 flex items-center gap-2">
              <input
                type="checkbox"
                checked={useEmbeddings}
                onChange={(e) => setUseEmbeddings(e.target.checked)}
                className="accent-blue-500"
              />
              Use semantic embeddings (if enabled on service)
            </label>
            <Button onClick={handleRecommend} loading={loading} disabled={!desiredRole && skills.length === 0}>
              <Sparkles size={14} /> Find matches
            </Button>
            <Badge color="purple">Mode: {mode}</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {results.length === 0 ? (
              <Card>
                <div className="p-8 text-center text-slate-500 text-sm">
                  Enter role/skills and click <span className="text-slate-300">Find matches</span>.
                </div>
              </Card>
            ) : (
              results.map((job) => (
                <Card key={job.job_id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-100">{job.job_title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {job.company_name} · {job.location || "Location NA"} · {job.experience_level || "—"}
                        </p>
                      </div>
                      <Badge color="green">{job.relevance_score}% match</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(job.required_skills || []).map((s) => (
                        <Badge key={`${job.job_id}-${s}`} color="blue">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSkillGap(job)}
                        loading={gapLoadingId === job.job_id}
                      >
                        <Target size={14} /> Analyze Skill Gap
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div>
            <Card>
              <div className="p-4">
                <h2 className="text-xs font-bold text-slate-500 mb-3 tracking-widest uppercase font-mono">
                  Skill-gap report
                </h2>
                {!skillGap ? (
                  <p className="text-sm text-slate-500">Select a recommendation and run analysis.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-white font-semibold">{skillGap.job_title}</p>
                      <p className="text-xs text-slate-500">{skillGap.company_name}</p>
                      <Badge color="green">{skillGap.match_percentage}% aligned</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Missing skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(skillGap.missing_skills || []).map((s) => (
                          <Badge key={s} color="red">
                            {s}
                          </Badge>
                        ))}
                        {(!skillGap.missing_skills || skillGap.missing_skills.length === 0) && (
                          <span className="text-xs text-green-400">No critical gaps 🎉</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Matching skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(skillGap.matching_skills || []).map((s) => (
                          <Badge key={s} color="green">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
