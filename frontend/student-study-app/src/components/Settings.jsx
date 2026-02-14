import { useState } from "react";

export default function Settings() {
    const [profile, setProfile] = useState({
        name: "Student Name",
        email: "student@example.com",
        notifications: true,
        darkMode: false
    });

    return (
        <div className="px-8 py-10 max-w-4xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Settings</h1>
            <p className="text-slate-500 mb-10">Manage your account preferences and app settings.</p>

            <div className="space-y-8">

                {/* Section: Profile */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Profile Information
                        </h2>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>
                </section>

                {/* Section: Preferences */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            App Preferences
                        </h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="block text-sm font-bold text-slate-900">Email Notifications</span>
                                <span className="block text-xs text-slate-500 mt-0.5">Receive updates about your exams and classes</span>
                            </div>
                            <button
                                onClick={() => setProfile(p => ({ ...p, notifications: !p.notifications }))}
                                className={`w-14 h-8 flex items-center p-1 rounded-full transition-all duration-300 cursor-pointer ${profile.notifications ? 'bg-indigo-600' : 'bg-slate-200 shadow-inner'}`}
                            >
                                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${profile.notifications ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 opacity-60">
                            <div>
                                <span className="block text-sm font-bold text-slate-900">Dark Mode</span>
                                <span className="block text-xs text-slate-500 mt-0.5">Enable dark theme for the interface (Coming Soon)</span>
                            </div>
                            <button
                                disabled
                                className="w-14 h-8 flex items-center p-1 rounded-full bg-slate-100 shadow-inner cursor-not-allowed"
                            >
                                <div className="bg-white w-6 h-6 rounded-full shadow-sm translate-x-0" />
                            </button>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-3.5 text-sm font-bold rounded-xl hover:from-slate-800 hover:to-slate-700 shadow-xl shadow-slate-900/10 transition-all hover:translate-y-[-2px] active:translate-y-0">
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
}
