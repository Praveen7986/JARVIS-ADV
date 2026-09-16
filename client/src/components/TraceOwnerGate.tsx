import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export function TraceOwnerGate() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const formatError = (msg: string) => {
    const lower = (msg || "").toLowerCase();
    if (lower.includes("<!doctype") || lower.includes("not valid json") || lower.includes("unexpected token") || lower.includes("json.parse") || lower.includes("token '<'")) {
      return "Cannot connect to JARVIS backend server. If using Netlify, ensure Netlify Functions are deployed or proxy /api to your Node.js backend.";
    }
    return msg;
  };
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: () => void utils.auth.me.invalidate(), onError: (reason) => setError(formatError(reason.message)) });
  const register = trpc.auth.register.useMutation({ onSuccess: () => void utils.auth.me.invalidate(), onError: (reason) => setError(formatError(reason.message)) });
  const pending = login.isPending || register.isPending;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (mode === "login") login.mutate({ email, password });
    else register.mutate({ name, email, password });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#071018] p-5 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-[#0b1823]/95 p-7 shadow-2xl shadow-cyan-950/30">
        <div className="mb-6 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300"><LockKeyhole className="size-5" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Private workspace</p><h1 className="mt-1 text-xl font-medium text-white">JARVIS Trace</h1></div></div>
        <p className="text-sm leading-6 text-slate-400">Only the JARVIS owner can view people, manage connections, or generate sharing links.</p>
        <div className="mt-5 grid gap-3">
          {mode === "register" && <label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Owner name<input value={name} onChange={(event) => setName(event.target.value)} required className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50" /></label>}
          <label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50" /></label>
          <label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Password<input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50" /></label>
        </div>
        <div className="mt-5 flex gap-2 rounded-lg bg-emerald-300/[0.06] p-3 text-[11px] leading-4 text-slate-400"><ShieldCheck className="size-4 shrink-0 text-emerald-300" /> Location data stays behind this owner session.</div>
        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        <Button type="submit" disabled={pending} className="mt-5 w-full bg-cyan-300 text-[#071018] hover:bg-cyan-200">{pending ? "Please wait..." : mode === "login" ? "Unlock Trace" : "Create owner account"}</Button>
        <button type="button" className="mt-4 w-full text-xs text-slate-500 hover:text-cyan-300" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "First time here? Create the owner account" : "Already have an owner account? Sign in"}</button>
      </form>
    </main>
  );
}
