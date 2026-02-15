import { useEffect, useState } from "react";
import { api } from "./api/client";

// Components
import Dashboard from "./components/Dashboard";
import Calendar from "./components/Calendar";
import AllClasses from "./components/AllClasses";
import Quiz from "./components/Quiz";
import StudySession from "./components/StudySession";
import Chat from "./components/Chat";
import Settings from "./components/Settings";

const navItems = ["Dashboard", "Calendar", "All Classes", "Quiz", "Study Session", "Chat", "Settings"];

export default function App() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  // Dashboard Data State
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Modal: Add Class State
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", professor: "", semester: "" });

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [d, cs] = await Promise.all([api.getDashboard(), api.listClasses()]);
      setDashboard(d);
      setClasses(cs || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateClass() {
    setErr("");
    try {
      await api.createClass(form);
      setShowAdd(false);
      setForm({ name: "", professor: "", semester: "" });
      await refresh();
    } catch (e) {
      setErr(e.message || "Create failed");
    }
  }

  async function handleGenerateCalendar() {
    setErr("");
    try {
      // Generate calendar for all classes
      const classIds = classes.map(c => c.id);
      if (classIds.length === 0) {
        setErr("No classes found. Please add a class first.");
        return;
      }
      await api.generateCalendar(classIds);
      await refresh();
      setActiveNav("Calendar");
    } catch (e) {
      setErr(e.message || "Generate failed");
    }
  }

  // Render logic for main content
  function renderContent() {
    switch (activeNav) {
      case "Dashboard":
        return (
          <Dashboard
            dashboard={dashboard}
            classes={classes}
            loading={loading}
            err={err}
            onAddClass={() => setShowAdd(true)}
            onGenerateCalendar={handleGenerateCalendar}
          />
        );
      case "Calendar":
        return <Calendar />;
      case "All Classes":
        return <AllClasses />;
      case "Quiz":
        return <Quiz />;
      case "Study Session":
        return <StudySession />;
      case "Chat":
        return <Chat />;
      case "Settings":
        return <Settings />;
      default:
        return <div>Page not found</div>;
    }
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  StudyHub
                </div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                  Student Portal
                </div>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-1 flex-1">
            {navItems.map((item) => {
              const active = item === activeNav;
              return (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={[
                    "w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out group flex items-center gap-3",
                    active
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1",
                  ].join(" ")}
                >
                  {/* Icon placeholder circles */}
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-400' : 'bg-slate-300 group-hover:bg-slate-400'}`} />
                  {item}
                </button>
              );
            })}
          </nav>

          <div className="p-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pro Tip</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check your calendar regularly to stay ahead of deadlines.
              </p>
            </div>
            <div className="mt-4 text-[10px] text-center text-slate-400">
              v1.0.0 • Student App
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">

          {/* Scrollable Page Content */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
            {renderContent()}
          </div>

          {/* Add Class Modal - Global Overlay */}
          {showAdd && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 transform transition-all scale-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Add New Class</h2>
                <p className="text-slate-500 text-sm mb-6">Enter the details below to track a new course.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Class Name</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Introduction to Psychology"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Professor</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Dr. Smith"
                      value={form.professor}
                      onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Semester</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Fall 2024"
                      value={form.semester}
                      onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClass}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-sm font-medium rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                  >
                    Create Class
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

