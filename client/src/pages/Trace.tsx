import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  CircleHelp,
  Crosshair,
  Layers,
  LocateFixed,
  MapPinned,
  Mic,
  Menu,
  Minus,
  Navigation,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Square,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { TraceOwnerGate } from "@/components/TraceOwnerGate";

type MapMode = "roadmap" | "satellite";
type Category = "All people" | "Family" | "Friends" | "Relatives" | "Others";

const categoryDefinitions: Array<{ label: Category; value: "all" | "family" | "friends" | "relatives" | "others"; color: string }> = [
  { label: "All people", value: "all", color: "bg-cyan-300" },
  { label: "Family", value: "family", color: "bg-amber-300" },
  { label: "Friends", value: "friends", color: "bg-violet-300" },
  { label: "Relatives", value: "relatives", color: "bg-rose-300" },
  { label: "Others", value: "others", color: "bg-slate-300" },
];

export default function Trace() {
  const [, setLocation] = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("roadmap");
  const [fallbackCenter, setFallbackCenter] = useState({ lat: 20, lng: 0 });
  const [fallbackZoom, setFallbackZoom] = useState(2);
  const [category, setCategory] = useState<Category>("All people");
  const [search, setSearch] = useState("");
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [managePeopleOpen, setManagePeopleOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [personCategory, setPersonCategory] = useState<"family" | "friends" | "relatives" | "others">("family");
  const [formError, setFormError] = useState("");
  const [sharingUrl, setSharingUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const ownerQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const peopleQuery = trpc.trace.people.useQuery(undefined, { retry: false, enabled: Boolean(ownerQuery.data) });
  const createSharingLink = trpc.trace.createSharingLink.useMutation({
    onSuccess: (result) => {
      setSharingUrl(result.url);
      setCopied(false);
    },
    onError: (error) => setFormError(error.message || "Person was added, but the sharing link could not be created."),
  });
  const addPerson = trpc.trace.addPerson.useMutation({
    onSuccess: (person) => {
      setName("");
      setDisplayName("");
      setPersonCategory("family");
      setFormError("");
      setAddPersonOpen(false);
      void peopleQuery.refetch();
      const publicBaseUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim() || window.location.origin;
      createSharingLink.mutate({ personId: person.id, baseUrl: publicBaseUrl });
    },
    onError: (error) => setFormError(error.message || "Could not add this person."),
  });
  const removePerson = trpc.trace.removePerson.useMutation({
    onSuccess: () => void peopleQuery.refetch(),
    onError: (error) => setFormError(error.message || "Could not remove this person."),
  });

  useEffect(() => {
    mapRef.current?.setMapTypeId(mapMode);
  }, [mapMode]);

  const setZoom = (delta: number) => {
    const map = mapRef.current;
    const nextZoom = Math.max(1, Math.min(18, (map?.getZoom() ?? fallbackZoom) + delta));
    if (map) map.setZoom(nextZoom);
    setFallbackZoom(nextZoom);
  };

  const recenter = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const center = { lat: coords.latitude, lng: coords.longitude };
      mapRef.current?.panTo(center);
      mapRef.current?.setZoom(13);
      setFallbackCenter(center);
      setFallbackZoom(13);
    });
  };

  const people = peopleQuery.data ?? [];
  const visiblePeople = people.filter((person) => {
    const matchesSearch = `${person.name} ${person.displayName ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All people" || person.category === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });
  const countFor = (value: "all" | "family" | "friends" | "relatives" | "others") => value === "all" ? people.length : people.filter((person) => person.category === value).length;
  const submitPerson = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Enter a name to continue.");
      return;
    }
    addPerson.mutate({ name: name.trim(), displayName: displayName.trim() || undefined, category: personCategory });
  };
  const copySharingUrl = async () => {
    if (!sharingUrl) return;
    await navigator.clipboard.writeText(sharingUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (ownerQuery.isLoading) return <main className="grid min-h-screen place-items-center bg-[#071018] text-sm text-slate-400">Unlocking Trace...</main>;
  if (!ownerQuery.data) return <TraceOwnerGate />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071018] text-slate-100 selection:bg-cyan-300 selection:text-[#071018]">
      <div className="trace-share-edge" aria-hidden="true" />
      <header className="relative z-20 flex min-h-[72px] items-center justify-between border-b border-white/[0.08] bg-[#08131d]/95 px-4 backdrop-blur-xl md:px-7">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-white/[0.07] hover:text-white" onClick={() => setLocation("/")} aria-label="Back to JARVIS">
            <ArrowLeft className="size-[18px]" />
          </Button>
          <div className="h-7 w-px bg-white/10" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold tracking-[0.34em] text-cyan-200">JARVIS</span>
              <span className="text-[12px] font-semibold tracking-[0.34em] text-cyan-400">TRACE</span>
            </div>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">Location intelligence</p>
          </div>
        </div>
        <div className="hidden items-center gap-5 md:flex">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />Engine ready</div>
          <div className="h-5 w-px bg-white/10" />
          <button type="button" className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"><CircleHelp className="size-4" /> Help</button>
          <Button type="button" size="sm" className="gap-2 bg-cyan-300 text-[#071018] hover:bg-cyan-200" onClick={() => { setFormError(""); setAddPersonOpen(true); }}><UserRoundPlus className="size-4" /> Add person</Button>
          <button type="button" className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-white" onClick={() => setManagePeopleOpen(true)}><Settings2 className="size-4" /> Manage people</button>
        </div>
        <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.07] md:hidden" onClick={() => setPeopleOpen(true)} aria-label="Open people panel"><Menu className="size-5" /></button>
      </header>

      <div className="relative min-h-[calc(100vh-72px)]">
        <aside className={`absolute inset-y-0 left-0 z-30 w-[min(88vw,340px)] border-r border-white/[0.08] bg-[#0a1722]/[.98] shadow-2xl shadow-black/40 transition-transform duration-300 md:relative md:z-10 md:block md:w-[310px] md:translate-x-0 md:shadow-none ${peopleOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col p-5 md:p-6">
            <div className="mb-6 flex items-start justify-between">
              <div><div className="flex items-center gap-2 text-cyan-300"><Users className="size-[18px]" /><h1 className="text-[17px] font-medium tracking-tight text-white">People</h1></div><p className="mt-1.5 pl-6 text-[11px] text-slate-500">Manage authorized connections</p></div>
              <button type="button" className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setPeopleOpen(false)} aria-label="Close people panel"><X className="size-4" /></button>
            </div>
            <Button type="button" className="mb-4 h-10 w-full gap-2 rounded-xl bg-cyan-300 text-xs font-semibold text-[#071018] hover:bg-cyan-200" onClick={() => { setFormError(""); setAddPersonOpen(true); }}><UserRoundPlus className="size-4" /> Add person</Button>
            <label className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm text-slate-500 transition focus-within:border-cyan-300/50 focus-within:bg-white/[0.07]"><Search className="size-4 shrink-0 transition group-focus-within:text-cyan-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600" placeholder="Search people" /><span className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600 sm:block">⌘ K</span></label>
            <div className="mt-7"><div className="mb-2 flex items-center justify-between px-1"><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Categories</p><span className="text-[10px] text-slate-600">{people.length} connected</span></div><nav className="space-y-1">{categoryDefinitions.map((item) => { const active = category === item.label; return <button key={item.label} type="button" onClick={() => setCategory(item.label)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-cyan-300/[0.11] text-cyan-100 ring-1 ring-inset ring-cyan-300/20" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"}`}><span className={`size-2 rounded-full ${item.color} ${active ? "shadow-[0_0_10px_currentColor]" : "opacity-60"}`} /><span className="flex-1 text-xs">{item.label}</span><span className={`text-[11px] ${active ? "text-cyan-300" : "text-slate-600"}`}>{countFor(item.value)}</span></button>; })}</nav></div>
            <div className="mt-6 flex-1">{visiblePeople.length > 0 ? <div className="space-y-2">{visiblePeople.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="grid size-9 place-items-center rounded-full bg-cyan-300/15 text-xs font-semibold text-cyan-200">{(person.displayName || person.name).slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{person.displayName || person.name}</p><p className="mt-1 text-[10px] capitalize text-slate-500">{person.category}</p></div><span className="ml-auto size-1.5 rounded-full bg-slate-500" title="No location connected" /></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-7 text-center"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-300"><MapPinned className="size-5" /></div><p className="text-sm font-medium text-slate-200">{people.length > 0 ? "No people found" : "Your map is quiet"}</p><p className="mx-auto mt-2 max-w-[210px] text-[11px] leading-5 text-slate-500">{people.length > 0 ? "Try a different search or category." : "Add someone with an authorized location source to see them here."}</p><Button className="mt-5 h-9 w-full gap-2 rounded-lg bg-cyan-300 text-xs font-semibold text-[#071018] hover:bg-cyan-200" onClick={() => setAddPersonOpen(true)}><UserRoundPlus className="size-4" /> Add person</Button></div>}</div>
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3.5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" /><p className="text-[10px] leading-4 text-slate-500">People appear here when you add them and connect an authorized sharing source.</p></div>
          </div>
        </aside>
        {peopleOpen && <button type="button" className="absolute inset-0 z-20 bg-black/50 md:hidden" onClick={() => setPeopleOpen(false)} aria-label="Close people panel overlay" />}

        <section className="absolute inset-0 overflow-hidden bg-[#152836] md:left-[310px]">
          <MapView className="absolute inset-0 h-full" initialCenter={fallbackCenter} initialZoom={fallbackZoom} fallbackCenter={fallbackCenter} fallbackZoom={fallbackZoom} fallbackMode={mapMode} onMapReady={(map) => { mapRef.current = map; map.setMapTypeId(mapMode); }} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_35%,rgba(5,12,18,.38)_100%)]" />
          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3 md:left-7 md:right-7 md:top-7"><div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-[#08131d]/90 p-1 shadow-2xl shadow-black/20 backdrop-blur-xl"><button type="button" onClick={() => setMapMode("roadmap")} className={`rounded-lg px-3.5 py-2 text-[11px] font-medium transition ${mapMode === "roadmap" ? "bg-white text-[#0a1722] shadow-lg" : "text-slate-400 hover:text-white"}`}>Standard</button><button type="button" onClick={() => setMapMode("satellite")} className={`rounded-lg px-3.5 py-2 text-[11px] font-medium transition ${mapMode === "satellite" ? "bg-white text-[#0a1722] shadow-lg" : "text-slate-400 hover:text-white"}`}>Satellite</button></div><div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-white/15 bg-[#08131d]/90 shadow-2xl shadow-black/20 backdrop-blur-xl"><Button variant="ghost" size="icon-sm" className="rounded-none text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setZoom(1)} aria-label="Zoom in"><Plus /></Button><div className="mx-2 border-t border-white/10" /><Button variant="ghost" size="icon-sm" className="rounded-none text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setZoom(-1)} aria-label="Zoom out"><Minus /></Button><div className="mx-2 border-t border-white/10" /><Button variant="ghost" size="icon-sm" className="rounded-none text-cyan-300 hover:bg-white/10 hover:text-cyan-200" onClick={recenter} aria-label="Recenter on me"><Crosshair /></Button></div></div>
          <div className="absolute bottom-5 left-4 right-4 flex items-end justify-between gap-3 md:bottom-7 md:left-7 md:right-7"><div className="max-w-[280px] rounded-2xl border border-white/15 bg-[#08131d]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl"><div className="flex items-center gap-2 text-cyan-300"><LocateFixed className="size-4" /><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Live map</span></div><p className="mt-2 text-xs text-slate-300">No authorized locations available</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Locations will appear here after a person accepts their sharing link.</p></div><button type="button" className="hidden items-center gap-2 rounded-xl border border-white/15 bg-[#08131d]/90 px-3.5 py-3 text-[11px] text-slate-300 shadow-xl backdrop-blur-xl transition hover:border-cyan-300/40 hover:text-white sm:flex" onClick={recenter}><Navigation className="size-3.5 text-cyan-300" /> Recenter on me</button></div>
          <div className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#08131d]/75 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-500 backdrop-blur md:flex"><Layers className="size-3" /> {mapMode === "satellite" ? "Satellite imagery" : "Road map"}</div>
        </section>
      </div>

      {sharingUrl && <div className="fixed inset-0 z-50 grid place-items-center bg-[#02070b]/70 p-4 backdrop-blur-sm" role="presentation" onClick={() => setSharingUrl("")}><section className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1823] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Share location link" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Authorization link ready</p><h2 className="mt-2 text-xl font-medium text-white">Share location with JARVIS</h2></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white" onClick={() => setSharingUrl("")} aria-label="Close sharing dialog"><X className="size-4" /></button></div><p className="mt-4 text-sm leading-6 text-slate-400">Send this link to the person’s mobile. It stays valid until you or they explicitly stop sharing.</p><div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2"><input readOnly value={sharingUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-cyan-100 outline-none" aria-label="Permanent sharing URL" /><Button type="button" size="icon" className="shrink-0 bg-cyan-300 text-[#071018] hover:bg-cyan-200" onClick={() => void copySharingUrl()} aria-label="Copy sharing link">{copied ? <Check /> : <Copy />}</Button></div><p className="mt-2 text-[10px] text-slate-500">This is a reusable permanent link. No automatic expiration is applied.</p><div className="mt-5 grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="border-white/15 text-slate-200 hover:bg-white/10" onClick={() => void copySharingUrl()}>{copied ? "Copied" : "Copy link"}</Button><Button type="button" className="bg-emerald-400 text-[#071018] hover:bg-emerald-300" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Please open this JARVIS location-sharing link: ${sharingUrl}`)}`, "_blank")}>Share via WhatsApp</Button></div></section></div>}
      {managePeopleOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#02070b]/70 p-4 backdrop-blur-sm" role="presentation" onClick={() => setManagePeopleOpen(false)}><section className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b1823] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Manage people" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Trace settings</p><h2 className="mt-2 text-xl font-medium text-white">Manage people</h2></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white" onClick={() => setManagePeopleOpen(false)} aria-label="Close manage people dialog"><X className="size-4" /></button></div><p className="mt-3 text-sm text-slate-400">Remove people and their sharing links from this JARVIS workspace.</p><div className="mt-5 max-h-72 space-y-2 overflow-y-auto">{people.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">No people added yet.</p> : people.map((person) => <div key={person.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="grid size-9 place-items-center rounded-full bg-cyan-300/15 text-xs font-semibold text-cyan-200">{(person.displayName || person.name).slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-200">{person.displayName || person.name}</p><p className="text-[10px] capitalize text-slate-500">{person.category}</p></div><Button type="button" variant="ghost" size="icon-sm" className="text-rose-300 hover:bg-rose-300/10 hover:text-rose-200" disabled={removePerson.isPending} onClick={() => { if (window.confirm(`Remove ${person.displayName || person.name} and revoke their links?`)) removePerson.mutate({ personId: person.id }); }} aria-label={`Delete ${person.displayName || person.name}`}><Trash2 /></Button></div>)}</div><Button type="button" className="mt-5 w-full bg-cyan-300 text-[#071018] hover:bg-cyan-200" onClick={() => { setManagePeopleOpen(false); setAddPersonOpen(true); }}><UserRoundPlus className="size-4" /> Add person</Button></section></div>}
      {addPersonOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#02070b]/70 p-4 backdrop-blur-sm" role="presentation" onClick={() => setAddPersonOpen(false)}><form className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1823] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Add person" onSubmit={submitPerson} onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">New connection</p><h2 className="mt-2 text-xl font-medium text-white">Add a person</h2></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white" onClick={() => setAddPersonOpen(false)} aria-label="Close add person dialog"><X className="size-4" /></button></div><p className="mt-4 text-sm leading-6 text-slate-400">Create a profile, then connect an authorized sharing source when ready.</p><div className="mt-5 grid gap-3"><label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Full name<input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50" placeholder="e.g. Mom" autoFocus /></label><label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50" placeholder="Optional" /></label><label className="grid gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">Category<select value={personCategory} onChange={(event) => setPersonCategory(event.target.value as typeof personCategory)} className="h-11 rounded-lg border border-white/10 bg-[#122432] px-3.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-cyan-300/50"><option value="family">Family</option><option value="friends">Friends</option><option value="relatives">Relatives</option><option value="others">Others</option></select></label></div><div className="mt-5 flex items-start gap-2 rounded-lg bg-emerald-300/[0.07] p-3 text-[11px] leading-4 text-emerald-100/70"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" /> This is your private JARVIS owner workspace.</div>{formError && <p className="mt-3 text-xs text-rose-300">{formError}</p>}<Button type="submit" disabled={addPerson.isPending || createSharingLink.isPending} className="mt-5 w-full bg-cyan-300 text-[#071018] hover:bg-cyan-200">{addPerson.isPending ? "Creating..." : "Create person"}</Button></form></div>}
      <TraceAssistant />
    </main>
  );
}

type TraceRecognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type TraceRecognitionConstructor = new () => TraceRecognition;

function TraceAssistant() {
  const [command, setCommand] = useState("");
  const [reply, setReply] = useState("Ready for a Trace command.");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<TraceRecognition | null>(null);
  const chat = trpc.jarvis.chat.useMutation();

  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const ask = async (rawCommand: string) => {
    const text = rawCommand.trim();
    if (!text || chat.isPending) return;
    setCommand("");
    setReply("Thinking...");
    try {
      const result = await chat.mutateAsync({ messages: [{ role: "user", content: text }] });
      setReply(result.reply);
      speak(result.reply);
    } catch {
      const errorReply = "I could not connect right now. Please try again.";
      setReply(errorReply);
      speak(errorReply);
    }
  };

  const toggleListening = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const speechWindow = window as Window & { SpeechRecognition?: TraceRecognitionConstructor; webkitSpeechRecognition?: TraceRecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) { speak("Voice input is not supported in this browser."); return; }
    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let text = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) text += event.results[index]?.[0]?.transcript ?? "";
      setCommand(text);
      if (event.results[event.results.length - 1]?.isFinal) void ask(text);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return <>
    <div className={`fixed bottom-5 right-5 z-40 w-[min(390px,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-[#08131d]/90 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl ${speaking ? "ring-1 ring-violet-300/50" : ""}`}>
      <div className="mb-2 flex items-center gap-2"><div className={`trace-share-orb scale-[.35] origin-left -mr-7 ${listening || speaking ? "opacity-100" : "opacity-80"}`} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">JARVIS TRACE</p><p className="text-[10px] text-slate-500">{chat.isPending ? "Thinking..." : listening ? "Listening..." : speaking ? "Speaking..." : "Map assistant ready"}</p></div></div>
      <p className="mb-3 max-h-16 overflow-y-auto rounded-lg bg-white/[0.04] px-3 py-2 text-xs leading-5 text-slate-300">{reply}</p>
      <div className="flex items-center gap-2"><button type="button" onClick={toggleListening} className={`grid size-9 shrink-0 place-items-center rounded-lg ${listening ? "bg-rose-400 text-[#071018]" : "bg-cyan-300 text-[#071018]"}`} aria-label={listening ? "Stop listening" : "Talk to JARVIS"}>{listening ? <Square className="size-4" /> : <Mic className="size-4" />}</button><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(command); }} className="min-w-0 flex-1 bg-transparent px-1 text-xs text-slate-200 outline-none placeholder:text-slate-600" placeholder="Ask while monitoring..." /><button type="button" onClick={() => void ask(command)} className="grid size-8 place-items-center rounded-lg text-cyan-300 hover:bg-cyan-300/10" aria-label="Send Trace command"><Send className="size-4" /></button></div>
    </div>
  </>;
}
