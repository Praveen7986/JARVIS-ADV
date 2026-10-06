import { useEffect, useRef, useState } from "react";
import { Check, MapPin, Navigation, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function TraceShare() {
  const [, params] = useRoute("/trace/share/:token");
  const token = params?.token ?? "";
  const [sharing, setSharing] = useState(false);
  const [lastCoords, setLastCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  } | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const personQuery = trpc.trace.resolveSharingLink.useQuery(
    { token },
    { enabled: token.length > 0, retry: false }
  );
  const person = personQuery.data?.person;

  const updateLocation = trpc.trace.updateLocation.useMutation({
    onSuccess: () => {
      setLastSentAt(new Date());
      setStatusMessage("Live location shared with JARVIS");
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Failed to transmit location");
    },
  });

  const watchIdRef = useRef<number | null>(null);

  const sendCoords = async (pos: GeolocationPosition) => {
    const coords = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed ?? undefined,
    };
    setLastCoords(coords);

    let batteryLevel: number | undefined;
    try {
      if ("getBattery" in navigator) {
        const battery = await (navigator as any).getBattery();
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {
      // ignore
    }

    updateLocation.mutate({
      token,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
      batteryLevel,
    });
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      // Fallback to IP Geolocation if browser lacks Geolocation API
      fetchIpLocation();
      return;
    }

    setError("");
    setStatusMessage("Requesting GPS signal...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSharing(true);
        void sendCoords(pos);
      },
      (err) => {
        console.warn("[TraceShare] High accuracy GPS failed, falling back to standard accuracy:", err.message);
        // Fallback 1: try standard accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSharing(true);
            void sendCoords(pos);
          },
          () => {
            // Fallback 2: IP Geolocation
            fetchIpLocation();
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void sendCoords(pos);
      },
      (err) => {
        console.warn("Watch position notice:", err.message);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
    );
  };

  const fetchIpLocation = async () => {
    try {
      setStatusMessage("Acquiring cell / network coordinates...");
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setSharing(true);
          const coords = {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 500,
          };
          setLastCoords(coords);
          updateLocation.mutate({
            token,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: 500,
          });
          return;
        }
      }
    } catch {}
    setError("Please enable GPS/Location access on your mobile device to transmit coordinates.");
    setSharing(false);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    setStatusMessage("Location sharing paused.");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (personQuery.isLoading) {
    return (
      <ShareShell>
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying secure JARVIS link...</p>
        </div>
      </ShareShell>
    );
  }

  if (!person) {
    return (
      <ShareShell>
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-400">
          <WifiOff className="size-7" />
        </div>
        <p className="text-lg font-medium text-white">This sharing link is unavailable</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          It may have been revoked or copied incorrectly. Please ask the JARVIS owner for a new link.
        </p>
      </ShareShell>
    );
  }

  return (
    <ShareShell>
      <div className="relative mx-auto grid size-20 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-300">
        {sharing ? (
          <>
            <Radio className="size-9 animate-pulse text-emerald-400" />
            <span className="absolute inset-0 rounded-full border border-emerald-400/50 animate-ping" />
          </>
        ) : (
          <MapPin className="size-9" />
        )}
      </div>

      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
        JARVIS Trace Connection
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        {sharing ? "Live Location Active" : "Share Mobile Location"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Connecting <strong className="font-medium text-cyan-200">{person.displayName || person.name}</strong> to the JARVIS Workspace.
      </p>

      {sharing && lastCoords && (
        <div className="mt-5 space-y-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-300">
              <Wifi className="size-3.5" /> GPS Connected
            </span>
            <span className="text-[11px] text-slate-400">
              Accuracy: ±{Math.round(lastCoords.accuracy ?? 0)}m
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500">Lat:</span> {lastCoords.latitude.toFixed(5)}
            </div>
            <div>
              <span className="text-slate-500">Lng:</span> {lastCoords.longitude.toFixed(5)}
            </div>
          </div>
          {lastSentAt && (
            <p className="text-[10px] text-slate-400">
              Last synced with JARVIS at {lastSentAt.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-5 text-slate-300">
            Location is shared securely with your private JARVIS owner. You can pause or stop sharing at any time.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {sharing ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full border-rose-400/40 text-rose-300 hover:bg-rose-400/10"
            onClick={stopSharing}
          >
            Pause location sharing
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 w-full gap-2 bg-cyan-300 text-sm font-semibold text-[#071018] shadow-lg shadow-cyan-950/40 hover:bg-cyan-200"
            onClick={startSharing}
            disabled={updateLocation.isPending}
          >
            <Navigation className="size-4" /> Start Live Sharing
          </Button>
        )}
      </div>

      <p className="mt-4 text-[10px] leading-4 text-slate-500">
        Keep this tab open in the mobile browser for continuous live background tracking.
      </p>
    </ShareShell>
  );
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#071018] p-4 text-center selection:bg-cyan-300 selection:text-[#071018]">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1823]/95 p-7 shadow-2xl backdrop-blur-xl">
        {children}
      </section>
    </main>
  );
}
