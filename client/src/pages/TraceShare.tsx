import { useState } from "react";
import { Check, MapPin, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function TraceShare() {
  const [, params] = useRoute("/trace/share/:token");
  const token = params?.token ?? "";
  const [enabled, setEnabled] = useState(false);
  const personQuery = trpc.trace.resolveSharingLink.useQuery({ token }, { enabled: token.length > 0, retry: false });
  const person = personQuery.data?.person;

  if (personQuery.isLoading) return <ShareShell><p className="text-sm text-slate-400">Checking your secure sharing link...</p></ShareShell>;
  if (!person) return <ShareShell><p className="text-lg font-medium text-white">This sharing link is unavailable</p><p className="mt-2 text-sm text-slate-400">It may have been revoked or copied incorrectly.</p></ShareShell>;

  return <ShareShell>
    <div className="mx-auto grid size-16 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-300"><MapPin className="size-7" /></div>
    <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">JARVIS location sharing</p>
    <h1 className="mt-3 text-2xl font-medium text-white">Share your location with JARVIS</h1>
    <p className="mt-4 text-sm leading-6 text-slate-400">JARVIS is requesting permission to receive the location of <strong className="font-medium text-slate-200">{person.displayName || person.name}</strong>.</p>
    <div className="mt-6 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-left"><div className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-emerald-300" /><p className="text-xs leading-5 text-slate-300">You choose whether to share. You can stop browser location permission at any time.</p></div></div>
    <Button className="mt-6 h-11 w-full bg-cyan-300 text-[#071018] hover:bg-cyan-200" onClick={() => navigator.geolocation?.getCurrentPosition(() => setEnabled(true))}>{enabled ? <><Check className="size-4" /> Location sharing enabled</> : "Allow location sharing"}</Button>
    <p className="mt-4 text-[10px] leading-4 text-slate-500">This link remains reusable until sharing is explicitly stopped or the owner revokes it.</p>
  </ShareShell>;
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#071018] p-5 text-center"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1823] p-7 shadow-2xl">{children}</section></main>;
}
