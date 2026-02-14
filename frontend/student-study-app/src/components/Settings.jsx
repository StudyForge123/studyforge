import { useState } from "react";

export default function Settings({ user, onSignOut }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-4 text-sm text-slate-600">
        Signed in as: {user?.signInDetails?.loginId || user?.username}
      </div>

      <button
        onClick={onSignOut}
        className="mt-6 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl"
      >
        Sign out
      </button>
    </div>
  );
}
