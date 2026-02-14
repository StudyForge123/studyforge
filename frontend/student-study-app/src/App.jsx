import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useEffect, useState } from "react";
import { api } from "./api/client";

// Components
import Dashboard from "./components/Dashboard";
import Calendar from "./components/Calendar";
import AllClasses from "./components/AllClasses";
import Settings from "./components/Settings";

const navItems = ["Dashboard", "Calendar", "All Classes", "Settings"];

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => <AuthedApp signOut={signOut} user={user} />}
    </Authenticator>
  );
}

function AuthedApp({ signOut, user }) {
  const [activeNav, setActiveNav] = useState("Dashboard");

  // Dashboard Data State
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [d, cs] = await Promise.all([api.getDashboard(), api.listClasses()]);
      setDashboard(d);
      setClasses(cs);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleGenerateCalendar() {
    setErr("");
    try {
      await api.generateCalendar();
      await refresh();
      setActiveNav("Calendar");
    } catch (e) {
      setErr(e.message || "Generate failed");
    }
  }

  function renderContent() {
    switch (activeNav) {
      case "Dashboard":
        return (
          <Dashboard
            dashboard={dashboard}
            classes={classes}
            loading={loading}
            err={err}
            onAddClass={() => {}}
            onGenerateCalendar={handleGenerateCalendar}
          />
        );
      case "Calendar":
        return <Calendar />;
      case "All Classes":
        return <AllClasses />;
      case "Settings":
        return <Settings user={user} onSignOut={signOut} />;
      default:
        return <div className="p-8">Page not found</div>;
    }
  }

  const email =
    user?.signInDetails?.loginId || user?.attributes?.email || user?.username;

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="flex h-full">
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <div className="text-lg font-bold leading-none">StudyHub</div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                  Student Portal
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{email}</div>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={[
                  "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition",
                  activeNav === item
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4">
            <button
              onClick={signOut}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
