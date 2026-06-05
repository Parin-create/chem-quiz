import { useState, useEffect, useRef, useCallback } from "react";
import {
  FlaskConical, Sun, Moon, Trophy, History, LayoutDashboard,
  Clock, CheckCircle2, XCircle, ArrowRight, Share2, RotateCcw,
  CalendarDays, CalendarRange, Sparkles, Gauge, Flame, BookOpen,
  Award, Target, ChevronLeft, Lightbulb,
} from "lucide-react";
import { QUESTIONS, TOPICS } from "./data/questions.js";
import { shareResults } from "./share.js";
import "./App.css";

// ----------------------------- constants -----------------------------
const QUIZ_DURATION = 30 * 60; // 30 minutes, in seconds
const LS = {
  theme: "cq_theme",
  attempts: "cq_attempts",
  rotation: "cq_rotation",
  name: "cq_name",
};

const MODES = [
  { key: "daily", label: "Daily Quiz", size: 25, icon: CalendarDays, desc: "25 mixed questions, fresh set every attempt", color: "#6366f1" },
  { key: "weekly", label: "Weekly Challenge", size: 25, icon: CalendarRange, desc: "25 mixed questions across all chapters", color: "#8b5cf6" },
  { key: "easy", label: "Easy", size: 25, icon: Sparkles, desc: "25 warm-up level questions", color: "#10b981" },
  { key: "medium", label: "Medium", size: 25, icon: Gauge, desc: "25 board-exam level questions", color: "#f59e0b" },
  { key: "hard", label: "Hard", size: 25, icon: Flame, desc: "25 tricky, application-based questions", color: "#ef4444" },
  { key: "topic", label: "Topic-wise", size: 25, icon: BookOpen, desc: "25 questions from a chapter you pick", color: "#0ea5e9" },
];

// ----------------------------- helpers -----------------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

// Build the pool of questions for a given mode/topic.
function poolFor(mode, topic) {
  switch (mode) {
    case "easy": return QUESTIONS.filter((q) => q.difficulty === "Easy");
    case "medium": return QUESTIONS.filter((q) => q.difficulty === "Medium");
    case "hard": return QUESTIONS.filter((q) => q.difficulty === "Hard");
    case "topic": return QUESTIONS.filter((q) => q.topic === topic);
    case "daily":
    case "weekly":
    default: return QUESTIONS;
  }
}

// Batch-rotation: serve a fresh slice of the pool on each attempt by advancing
// an offset stored in localStorage, then lightly shuffle that slice.
function buildQuiz(mode, topic, size) {
  const pool = poolFor(mode, topic);
  if (pool.length === 0) return [];
  const key = mode === "topic" ? `topic:${topic}` : mode;
  const rotation = loadJSON(LS.rotation, {});
  const counter = rotation[key] || 0;
  const k = Math.min(size, pool.length);
  const offset = (counter * k) % pool.length;

  const batch = [];
  for (let i = 0; i < k; i++) batch.push(pool[(offset + i) % pool.length]);

  // advance & persist the rotation counter so the next attempt is different
  rotation[key] = counter + 1;
  saveJSON(LS.rotation, rotation);

  // shuffle the chosen batch
  for (let i = batch.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [batch[i], batch[j]] = [batch[j], batch[i]];
  }
  return batch;
}

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ----------------------------- app -----------------------------
export default function App() {
  const [theme, setTheme] = useState(() => loadJSON(LS.theme, "light"));
  const [screen, setScreen] = useState("dashboard"); // dashboard | quiz | result | history | leaderboard
  const [attempts, setAttempts] = useState(() => loadJSON(LS.attempts, []));
  const [name, setName] = useState(() => loadJSON(LS.name, "You"));

  // active quiz state
  const [mode, setMode] = useState(null);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);     // selected option for current q
  const [locked, setLocked] = useState(false);        // answer confirmed -> show feedback
  const [responses, setResponses] = useState([]);     // {qid, chosen, correct}
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [lastResult, setLastResult] = useState(null);
  const [shareMsg, setShareMsg] = useState("");

  // persist theme + apply to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveJSON(LS.theme, theme);
  }, [theme]);

  useEffect(() => saveJSON(LS.attempts, attempts), [attempts]);
  useEffect(() => saveJSON(LS.name, name), [name]);

  // ------------------- quiz flow -------------------
  const finishQuiz = useCallback((finalResponses) => {
    const total = questions.length;
    const score = finalResponses.filter((r) => r.correct).length;
    const percent = total ? Math.round((score / total) * 100) : 0;
    const timeTaken = QUIZ_DURATION - timeLeft;
    const result = {
      id: Date.now(),
      date: Date.now(),
      mode,
      topic: mode === "topic" ? topic : null,
      modeLabel: MODES.find((m) => m.key === mode)?.label || mode,
      name,
      score, total, percent, timeTaken,
    };
    setAttempts((prev) => [result, ...prev].slice(0, 200));
    setLastResult({ ...result, responses: finalResponses, questions });
    setScreen("result");
  }, [questions, timeLeft, mode, topic, name]);

  // countdown timer while in quiz
  useEffect(() => {
    if (screen !== "quiz") return;
    if (timeLeft <= 0) { finishQuiz(responses); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft, responses, finishQuiz]);

  function startQuiz(modeKey) {
    const m = MODES.find((x) => x.key === modeKey);
    const qs = buildQuiz(modeKey, topic, m.size);
    if (qs.length === 0) return;
    setMode(modeKey);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setLocked(false);
    setResponses([]);
    setTimeLeft(QUIZ_DURATION);
    setScreen("quiz");
  }

  function confirmAnswer() {
    if (selected === null || locked) return;
    setLocked(true);
    const q = questions[index];
    setResponses((prev) => [...prev, { qid: q.id, chosen: selected, correct: selected === q.correct }]);
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      finishQuiz(responses);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setLocked(false);
    }
  }

  async function onShare() {
    if (!lastResult) return;
    const r = lastResult;
    const text =
      `🧪 CBSE Class 12 Chemistry Quiz\n` +
      `Mode: ${r.modeLabel}${r.topic ? ` (${r.topic})` : ""}\n` +
      `Score: ${r.score}/${r.total} (${r.percent}%)\n` +
      `Time: ${fmtTime(r.timeTaken)}\n` +
      `Can you beat me?`;
    const outcome = await shareResults(text);
    setShareMsg(outcome === "copied" ? "Copied to clipboard!" : outcome === "shared" ? "Shared!" : "Could not share");
    setTimeout(() => setShareMsg(""), 2500);
  }

  // ------------------- derived stats -------------------
  const stats = (() => {
    if (attempts.length === 0) return { count: 0, avg: 0, best: 0, answered: 0 };
    const avg = Math.round(attempts.reduce((a, x) => a + x.percent, 0) / attempts.length);
    const best = Math.max(...attempts.map((x) => x.percent));
    const answered = attempts.reduce((a, x) => a + x.total, 0);
    return { count: attempts.length, avg, best, answered };
  })();

  const leaderboard = [...attempts]
    .sort((a, b) => b.percent - a.percent || b.score - a.score || a.timeTaken - b.timeTaken)
    .slice(0, 10);

  // ----------------------------- render -----------------------------
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setScreen("dashboard")} role="button" tabIndex={0}>
          <FlaskConical size={26} className="brand-icon" />
          <div>
            <h1>Chem<span>Quiz</span></h1>
            <p className="brand-sub">CBSE Class 12 Chemistry</p>
          </div>
        </div>
        <button className="icon-btn" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))} aria-label="Toggle theme">
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className="content">
        {screen === "dashboard" && (
          <Dashboard
            stats={stats} attempts={attempts} name={name} setName={setName}
            topic={topic} setTopic={setTopic} onStart={startQuiz}
            goHistory={() => setScreen("history")} goLeaderboard={() => setScreen("leaderboard")}
          />
        )}

        {screen === "quiz" && questions.length > 0 && (
          <Quiz
            q={questions[index]} index={index} total={questions.length}
            selected={selected} setSelected={setSelected} locked={locked}
            timeLeft={timeLeft} onConfirm={confirmAnswer} onNext={nextQuestion}
            onQuit={() => setScreen("dashboard")}
          />
        )}

        {screen === "result" && lastResult && (
          <Result result={lastResult} onShare={onShare} shareMsg={shareMsg}
            onRetry={() => startQuiz(lastResult.mode)} onHome={() => setScreen("dashboard")} />
        )}

        {screen === "history" && (
          <HistoryView attempts={attempts} onBack={() => setScreen("dashboard")}
            onClear={() => setAttempts([])} />
        )}

        {screen === "leaderboard" && (
          <Leaderboard rows={leaderboard} onBack={() => setScreen("dashboard")} />
        )}
      </main>
    </div>
  );
}

// ----------------------------- Dashboard -----------------------------
function Dashboard({ stats, attempts, name, setName, topic, setTopic, onStart, goHistory, goLeaderboard }) {
  return (
    <div className="dash">
      <section className="stat-grid">
        <StatCard icon={Target} label="Attempts" value={stats.count} />
        <StatCard icon={Gauge} label="Avg Score" value={`${stats.avg}%`} />
        <StatCard icon={Award} label="Best Score" value={`${stats.best}%`} />
        <StatCard icon={CheckCircle2} label="Questions Done" value={stats.answered} />
      </section>

      <div className="name-row">
        <label htmlFor="player">Your name (for leaderboard):</label>
        <input id="player" value={name} maxLength={20}
          onChange={(e) => setName(e.target.value || "You")} />
      </div>

      <h2 className="section-title">Choose a Quiz Mode</h2>
      <section className="mode-grid">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="mode-card" style={{ "--accent": m.color }}>
              <div className="mode-head">
                <span className="mode-ico"><Icon size={22} /></span>
                <h3>{m.label}</h3>
              </div>
              <p className="mode-desc">{m.desc}</p>
              {m.key === "topic" && (
                <select className="topic-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <button className="start-btn" onClick={() => onStart(m.key)}>
                Start <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </section>

      <div className="dash-actions">
        <button className="ghost-btn" onClick={goHistory}><History size={18} /> Attempt History</button>
        <button className="ghost-btn" onClick={goLeaderboard}><Trophy size={18} /> Leaderboard</button>
      </div>

      {attempts.length > 0 && (
        <section className="recent">
          <h2 className="section-title">Recent Activity</h2>
          {attempts.slice(0, 4).map((a) => (
            <div key={a.id} className="recent-row">
              <span className="recent-mode">{a.modeLabel}{a.topic ? ` · ${a.topic}` : ""}</span>
              <span className={`badge ${a.percent >= 60 ? "good" : "bad"}`}>{a.score}/{a.total} · {a.percent}%</span>
              <span className="recent-date">{fmtDate(a.date)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      <Icon size={20} className="stat-ico" />
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

// ----------------------------- Quiz -----------------------------
function Quiz({ q, index, total, selected, setSelected, locked, timeLeft, onConfirm, onNext, onQuit }) {
  const progress = Math.round((index / total) * 100);
  const low = timeLeft <= 60;
  return (
    <div className="quiz">
      <div className="quiz-top">
        <button className="link-btn" onClick={onQuit}><ChevronLeft size={16} /> Quit</button>
        <div className={`timer ${low ? "timer-low" : ""}`}><Clock size={16} /> {fmtTime(timeLeft)}</div>
      </div>

      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="q-meta">
        <span>Question {index + 1} of {total}</span>
        <span className="chip">{q.topic} · {q.difficulty}</span>
      </div>

      <div className="q-card">
        <p className="q-text">{q.q}</p>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = "option";
            if (locked) {
              if (i === q.correct) cls += " correct";
              else if (i === selected) cls += " wrong";
            } else if (i === selected) cls += " selected";
            return (
              <button key={i} className={cls} disabled={locked}
                onClick={() => setSelected(i)}>
                <span className="opt-key">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
                {locked && i === q.correct && <CheckCircle2 size={18} className="opt-mark ok" />}
                {locked && i === selected && i !== q.correct && <XCircle size={18} className="opt-mark no" />}
              </button>
            );
          })}
        </div>

        {locked && (
          <div className={`feedback ${selected === q.correct ? "fb-ok" : "fb-no"}`}>
            <strong>{selected === q.correct ? "Correct!" : "Incorrect"}</strong>
            <p><Lightbulb size={15} /> {q.solution}</p>
          </div>
        )}
      </div>

      <div className="quiz-actions">
        {!locked ? (
          <button className="primary-btn" disabled={selected === null} onClick={onConfirm}>
            Check Answer
          </button>
        ) : (
          <button className="primary-btn" onClick={onNext}>
            {index + 1 >= total ? "Finish Quiz" : "Next Question"} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------- Result -----------------------------
function Result({ result, onShare, shareMsg, onRetry, onHome }) {
  const { score, total, percent, timeTaken, responses, questions, modeLabel, topic } = result;
  const pass = percent >= 60;
  return (
    <div className="result">
      <div className={`result-hero ${pass ? "hero-good" : "hero-bad"}`}>
        <Award size={48} />
        <h2>{percent}%</h2>
        <p>{score} of {total} correct · {modeLabel}{topic ? ` (${topic})` : ""}</p>
        <p className="result-time"><Clock size={14} /> Time taken: {fmtTime(timeTaken)}</p>
      </div>

      <div className="result-actions">
        <button className="primary-btn" onClick={onShare}><Share2 size={16} /> Share Result</button>
        <button className="ghost-btn" onClick={onRetry}><RotateCcw size={16} /> Try Again</button>
        <button className="ghost-btn" onClick={onHome}><LayoutDashboard size={16} /> Dashboard</button>
      </div>
      {shareMsg && <p className="share-msg">{shareMsg}</p>}

      <h3 className="section-title">Review</h3>
      <div className="review">
        {questions.map((q) => {
          const r = responses.find((x) => x.qid === q.id);
          const chosen = r ? r.chosen : null;
          const wasCorrect = r ? r.correct : false;
          return (
            <div key={q.id} className={`review-item ${wasCorrect ? "ri-ok" : "ri-no"}`}>
              <p className="ri-q">{q.q}</p>
              <p className="ri-line">
                {wasCorrect
                  ? <><CheckCircle2 size={15} className="ok" /> Your answer: {q.options[chosen]}</>
                  : <><XCircle size={15} className="no" /> {chosen === null ? "Not answered" : `You: ${q.options[chosen]}`} · Correct: {q.options[q.correct]}</>}
              </p>
              <p className="ri-sol"><Lightbulb size={14} /> {q.solution}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------- History -----------------------------
function HistoryView({ attempts, onBack, onClear }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <button className="link-btn" onClick={onBack}><ChevronLeft size={16} /> Back</button>
        {attempts.length > 0 && <button className="link-btn danger" onClick={onClear}>Clear all</button>}
      </div>
      <h2 className="section-title"><History size={20} /> Attempt History</h2>
      {attempts.length === 0 ? (
        <p className="empty">No attempts yet. Take a quiz to see your history here.</p>
      ) : (
        <div className="hist-list">
          {attempts.map((a) => (
            <div key={a.id} className="hist-row">
              <div>
                <div className="hist-mode">{a.modeLabel}{a.topic ? ` · ${a.topic}` : ""}</div>
                <div className="hist-date">{fmtDate(a.date)} · {fmtTime(a.timeTaken)}</div>
              </div>
              <span className={`badge ${a.percent >= 60 ? "good" : "bad"}`}>{a.score}/{a.total} · {a.percent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------- Leaderboard -----------------------------
function Leaderboard({ rows, onBack }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="panel">
      <div className="panel-head">
        <button className="link-btn" onClick={onBack}><ChevronLeft size={16} /> Back</button>
      </div>
      <h2 className="section-title"><Trophy size={20} /> Leaderboard</h2>
      <p className="empty-sub">Top 10 of your best attempts on this device.</p>
      {rows.length === 0 ? (
        <p className="empty">No scores yet. Be the first — take a quiz!</p>
      ) : (
        <div className="lb-list">
          {rows.map((r, i) => (
            <div key={r.id} className={`lb-row ${i < 3 ? "lb-top" : ""}`}>
              <span className="lb-rank">{medals[i] || i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-mode">{r.modeLabel}</span>
              <span className="lb-score">{r.percent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
