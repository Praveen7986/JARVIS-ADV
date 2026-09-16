import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const WELCOME_SPEECH =
  "Welcome. I am JARVIS, your personal assistant. Is there anything for me to do, or what about your day and your plans?";

interface JarvisOrbProps {
  active: boolean;
  speaking: boolean;
  level: number;
  bass: number;
  treble: number;
}

export function JarvisOrb({ active, speaking, level, bass, treble }: JarvisOrbProps) {
  return (
    <div
      className={`jarvis-orb ${active ? "jarvis-orb--active" : ""} ${speaking ? "jarvis-orb--speaking" : ""}`}
      style={{
        ["--voice-level" as any]: level.toFixed(3),
        ["--voice-bass" as any]: bass.toFixed(3),
        ["--voice-treble" as any]: treble.toFixed(3),
      }}
      aria-label="JARVIS holographic visualizer"
      role="img"
    >
      <div className="orb-shadow" />
      <div className="orb-halo orb-halo--outer" />
      <div className="orb-halo orb-halo--inner" />
      <div className="orb-rings">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="orb-ring" style={{ ["--i" as any]: i }} />
        ))}
      </div>
      <div className="orb-grid orb-grid--vertical" />
      <div className="orb-grid orb-grid--horizontal" />
      <div className="orb-core">
        <div className="orb-core-lens" />
        <div className="orb-core-pulse" />
      </div>
      <div className="orb-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{ ["--i" as any]: i }} />
        ))}
      </div>
      <div className="orb-scanline" />
    </div>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  topicImages?: { url: string; thumbnailUrl: string; title: string }[];
}

interface NewsArticle {
  title: string;
  link: string;
  source: string;
}

interface SourceLink {
  title: string;
  url: string;
  source: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWakePrompt, setShowWakePrompt] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[] | null>(null);
  const [showNewsBriefing, setShowNewsBriefing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Camera gestures off");
  const [screenActive, setScreenActive] = useState(false);
  const [screenStatus, setScreenStatus] = useState("Screen access off");
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ChatMessage | null>(null);

  const quickPrompts = [
    { label: "🔥 Today's Hot Topics", query: "What is the hot topic news today?" },
    { label: "🧭 For You", query: "Give me recent worldwide breaking news about my interests." },
    { label: "💻 Tech Headlines", query: "What are today's tech news headlines?" },
    { label: "🌐 World News", query: "What is happening in world news today?" },
    { label: "🚀 Science & Space", query: "What is the latest science and space news?" },
  ];

  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isPendingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptBufferRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const speechTimeoutRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const captionScrollRef = useRef<HTMLDivElement | null>(null);
  const captionEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dynamicsRef = useRef({ level: 0, bass: 0, treble: 0 });

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenActiveRef = useRef(false);
  const screenAutoAnalyzedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraAnimRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastGestureTimeRef = useRef(0);
  const prevMsgCountRef = useRef(0);

  const chatMutation = trpc.jarvis.chat.useMutation();
  const isPending = chatMutation.isPending;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  const stopMicrophone = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    analyserRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
  };

  const startMicrophone = async () => {
    if (!analyserRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        ctx.createMediaStreamSource(stream).connect(analyser);
        mediaStreamRef.current = stream;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch {}
    }
  };

  useEffect(() => {
    const dataArray = new Uint8Array(128);
    const updateAudioMeter = () => {
      if (isListeningRef.current && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let bassSum = 0;
        for (let i = 1; i <= 8; i++) bassSum += dataArray[i];
        const bassVal = Math.min(1, (bassSum / 2040) * 2.2);

        let trebleSum = 0;
        for (let i = 16; i <= 48; i++) trebleSum += dataArray[i];
        const trebleVal = Math.min(1, (trebleSum / 8160) * 2.5);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const levelVal = Math.min(1, (avg / 255) * 3.2);

        setLevel((prev) => prev * 0.4 + levelVal * 0.6);
        setBass((prev) => prev * 0.4 + bassVal * 0.6);
        setTreble((prev) => prev * 0.4 + trebleVal * 0.6);
      } else if (isSpeakingRef.current) {
        const now = performance.now();
        const baseLevel = dynamicsRef.current.level;
        const w1 = Math.sin(now / 85) * 0.28;
        const w2 = Math.sin(now / 145) * 0.22;
        const w3 = Math.cos(now / 48) * 0.16;
        const dynamicLevel = Math.max(0, Math.min(1, baseLevel + w1 + w2 + w3));
        const dynamicBass = Math.max(0, Math.min(1, dynamicLevel * 0.85 + Math.sin(now / 110) * 0.2));
        const dynamicTreble = Math.max(0, Math.min(1, dynamicLevel * 0.95 + Math.cos(now / 60) * 0.25));
        setLevel(dynamicLevel);
        setBass(dynamicBass);
        setTreble(dynamicTreble);
      } else {
        setLevel((p) => (p > 0.01 ? p * 0.85 : 0));
        setBass((p) => (p > 0.01 ? p * 0.85 : 0));
        setTreble((p) => (p > 0.01 ? p * 0.85 : 0));
      }
      animFrameRef.current = requestAnimationFrame(updateAudioMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateAudioMeter);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = messages.length;
    const frame = requestAnimationFrame(() => {
      captionScrollRef.current?.scrollTo({
        top: captionScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  const speakText = (text: string, restartListening = true) => {
    if (!("speechSynthesis" in window)) {
      if (restartListening) setTimeout(() => void startListening(), 400);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice =
      voices.find((v) => /Google UK English Male|Microsoft George|Daniel|Oliver/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices[0];

    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.rate = 0.98;
    utterance.pitch = 0.88;
    utterance.volume = 1;

    utterance.onboundary = () => {
      dynamicsRef.current = {
        level: 0.55 + Math.random() * 0.35,
        bass: 0.45 + Math.random() * 0.4,
        treble: 0.5 + Math.random() * 0.35,
      };
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setShowWakePrompt(false);
      dynamicsRef.current = { level: 0.65, bass: 0.6, treble: 0.55 };
    };

    const handleEnd = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      dynamicsRef.current = { level: 0, bass: 0, treble: 0 };
      utteranceRef.current = null;
      if (restartListening) {
        window.setTimeout(() => {
          if (!isSpeakingRef.current && !isPendingRef.current) {
            startListening();
          }
        }, 350);
      }
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      handleEnd();
    };

    window.setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Autoplay blocked:", e);
        setShowWakePrompt(true);
      }
    }, 40);
  };

  const captureScreenFrame = () => {
    const video = screenVideoRef.current;
    if (
      !screenActiveRef.current ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return undefined;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setScreenStatus("Screen frame captured. JARVIS is inspecting it.");
    return canvas.toDataURL("image/jpeg", 0.58);
  };

  const handleSendMessage = async (
    query: string,
    options: { showUserMessage?: boolean; screenAutoAnalyze?: boolean } = {}
  ) => {
    const text = query.trim();
    if (!text || isPendingRef.current) return;

    if (/^(?:hey\s+)?(?:jarvis\s+)?trace[.!]?$/i.test(text)) {
      setLocation("/trace");
      return;
    }

    const showUserMsg = options.showUserMessage !== false;
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    finalTranscriptRef.current = "";
    transcriptBufferRef.current = "";
    setInterimText("");
    setErrorMessage("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      id: `user-${Date.now()}-${Math.random()}`,
    };

    const nextMessages = showUserMsg ? [...messagesRef.current, userMsg] : messagesRef.current;
    const historyForAi = showUserMsg ? nextMessages : [...nextMessages, userMsg];

    if (showUserMsg) {
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
    }

    try {
      const history = historyForAi.slice(-15).map((m) => ({ role: m.role, content: m.content }));
      const screenImage = captureScreenFrame();

      const response = await chatMutation.mutateAsync({
        messages: history,
        ...(screenImage ? { screenImage } : {}),
        ...(options.screenAutoAnalyze ? { screenAutoAnalyze: true } : {}),
      });

      if (response.newsArticles && response.newsArticles.length > 0) {
        setNewsArticles(response.newsArticles);
        setShowNewsBriefing(true);
      }
      if (response.sourceLinks && response.sourceLinks.length > 0) {
        setSourceLinks(response.sourceLinks);
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.reply,
        id: `assistant-${Date.now()}-${Math.random()}`,
        topicImages: response.topicImages,
      };

      const finalMessages = [...messagesRef.current, assistantMsg];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
      speakText(response.reply, true);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "JARVIS could not connect.";
      setErrorMessage(msg);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      window.setTimeout(() => void startListening(), 600);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenActiveRef.current = false;
    screenAutoAnalyzedRef.current = false;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenActive(false);
    setScreenStatus("Screen access off");
  };

  const toggleScreenShare = async () => {
    if (screenActive) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenStatus("Screen sharing is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      screenActiveRef.current = true;
      setScreenActive(true);
      setScreenStatus("Screen shared. Ask JARVIS what you are looking at.");
      stream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play();
      }

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));

      if (screenStreamRef.current === stream && !screenAutoAnalyzedRef.current && !isPendingRef.current) {
        screenAutoAnalyzedRef.current = true;
        handleSendMessage("Inspect the shared screen and tell me what it contains.", {
          showUserMessage: false,
          screenAutoAnalyze: true,
        });
      }
    } catch {
      setScreenStatus("Screen access was cancelled");
    }
  };

  const stopCameraGestures = () => {
    if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current);
    cameraAnimRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    prevFrameRef.current = null;
    setCameraActive(false);
    setCameraStatus("Camera gestures off");
  };

  const toggleCameraGestures = async () => {
    if (cameraActive) {
      stopCameraGestures();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setCameraStatus("Show a quick wave left or right");
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }

      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const processGesture = () => {
        const video = cameraVideoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          cameraAnimRef.current = requestAnimationFrame(processGesture);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const prev = prevFrameRef.current;
        if (prev) {
          let diffPixels = 0;
          let sumX = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            if (Math.abs(imgData[i] - prev[i]) > 35) {
              const pixelIdx = i / 4;
              diffPixels += 1;
              sumX += pixelIdx % canvas.width;
            }
          }
          const now = Date.now();
          if (diffPixels > 120 && now - lastGestureTimeRef.current > 2200) {
            const avgX = sumX / diffPixels;
            const command =
              avgX < canvas.width * 0.42
                ? "open calculator"
                : avgX > canvas.width * 0.58
                ? "open browser"
                : "what time is it";
            lastGestureTimeRef.current = now;
            setCameraStatus(`Gesture detected: ${command}`);
            handleSendMessage(command);
          }
        }
        prevFrameRef.current = new Uint8ClampedArray(imgData);
        cameraAnimRef.current = requestAnimationFrame(processGesture);
      };
      cameraAnimRef.current = requestAnimationFrame(processGesture);
    } catch {
      setCameraStatus("Camera permission was denied");
      stopCameraGestures();
    }
  };

  const startListening = async () => {
    if (isPendingRef.current || isSpeakingRef.current || isListeningRef.current) return;
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Speech input is not supported in this browser. You can type anytime.");
      return;
    }
    await startMicrophone();
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage("");
        finalTranscriptRef.current = "";
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i]?.[0];
          if (res) {
            if (event.results[i].isFinal) finalChunk += res.transcript + " ";
            else interim += res.transcript;
          }
        }

        if (finalChunk.trim().match(/^(?:hey\s+)?(?:jarvis\s+)?(?:source|sources|show sources|show me the sources)$/i)) {
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          const lastUserMsg = [...messagesRef.current].reverse().find((m) => m.role === "user")?.content;
          if (lastUserMsg) handleSendMessage(`Show sources for: ${lastUserMsg}`);
          else setErrorMessage("Ask me about a topic first, then say source.");
          return;
        }

        if (finalChunk) finalTranscriptRef.current += finalChunk;
        const currentText = (finalTranscriptRef.current + " " + interim).trim();
        if (currentText) {
          transcriptBufferRef.current = currentText;
          setInterimText(currentText);
        }

        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = setTimeout(() => {
          const queryToSend = transcriptBufferRef.current.trim();
          if (queryToSend.length > 0 && !isPendingRef.current) {
            handleSendMessage(queryToSend);
          }
        }, 1200);
      };

      recognition.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions or type directly.");
          isListeningRef.current = false;
          setIsListening(false);
          stopMicrophone();
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;

        if (transcriptBufferRef.current.trim().length > 0 && !isPendingRef.current) {
          const query = transcriptBufferRef.current.trim();
          handleSendMessage(query);
          return;
        }

        if (!isSpeakingRef.current && !isPendingRef.current && !isInputFocused) {
          window.setTimeout(() => {
            if (!isSpeakingRef.current && !isPendingRef.current && !isListeningRef.current) {
              startListening();
            }
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
      stopMicrophone();
    }
  };

  const handleAwaken = () => {
    setShowWakePrompt(false);
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const welcomeMsg: ChatMessage = {
      role: "assistant",
      content: WELCOME_SPEECH,
      id: `welcome-${Date.now()}`,
    };
    messagesRef.current = [welcomeMsg];
    setMessages([welcomeMsg]);
    speakText(WELCOME_SPEECH, true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) {
        if (e.key === "Escape") {
          setInputText("");
          inputRef.current?.blur();
          setIsInputFocused(false);
          if (!isSpeakingRef.current && !isPendingRef.current) {
            startListening();
          }
        }
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !(e.key.length > 1 && e.key !== "Backspace")) {
        inputRef.current?.focus();
        setIsInputFocused(true);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
          recognitionRef.current = null;
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    const timer = window.setTimeout(() => {
      try {
        handleAwaken();
      } catch {
        setShowWakePrompt(true);
      }
    }, 450);

    const onUserInteraction = () => {
      if (!hasInitializedRef.current) handleAwaken();
    };

    window.addEventListener("pointerdown", onUserInteraction, { once: true });
    window.addEventListener("keydown", onUserInteraction, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      recognitionRef.current?.abort();
      stopCameraGestures();
      stopMicrophone();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const isOrbActive = isListening || isPending || isSpeaking;
  const isTyping = isInputFocused || inputText.length > 0;
  const statusLabel = isSpeaking
    ? "JARVIS Speaking"
    : isPending
    ? "JARVIS Thinking"
    : isTyping
    ? "Noticing Typing..."
    : isListening
    ? "JARVIS Listening"
    : "JARVIS Ready";

  const statusClass = isSpeaking
    ? "jarvis-status-badge--speaking"
    : isPending
    ? "jarvis-status-badge--thinking"
    : isTyping || isListening
    ? "jarvis-status-badge--listening"
    : "";

  return (
    <main
      className="jarvis-screen"
      onClick={() => {
        if (!hasInitializedRef.current) handleAwaken();
      }}
    >
      <div className="jarvis-backdrop" />

      {showWakePrompt && (
        <button
          className="wake-prompt"
          onClick={(e) => {
            e.stopPropagation();
            handleAwaken();
          }}
          aria-label="Wake JARVIS"
        >
          <span className="wake-dot" />
          <span>TAP TO AWAKEN JARVIS</span>
        </button>
      )}

      <section className="jarvis-stage" aria-label="JARVIS voice visualizer">
        <JarvisOrb
          active={isOrbActive}
          speaking={isSpeaking}
          level={level}
          bass={bass}
          treble={treble}
        />

        <div className={`jarvis-status-badge ${statusClass}`} aria-live="polite">
          <span className="jarvis-status-dot" />
          <span>{statusLabel}</span>
        </div>

        <div
          className={`jarvis-camera-panel ${cameraActive ? "jarvis-camera-panel--active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={cameraVideoRef}
            className="jarvis-camera-preview"
            muted
            playsInline
            aria-label="Camera gesture preview"
          />
          <div className="jarvis-camera-controls">
            <button
              type="button"
              className="jarvis-camera-toggle"
              onClick={() => void toggleCameraGestures()}
            >
              {cameraActive ? "Disable camera gestures" : "Enable camera gestures"}
            </button>
            <span>{cameraStatus}</span>
          </div>
        </div>

        <div
          className={`jarvis-screen-panel ${screenActive ? "jarvis-screen-panel--active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <video
            ref={screenVideoRef}
            className="jarvis-screen-preview"
            muted
            playsInline
            aria-label="Shared screen preview"
          />
          <div className="jarvis-screen-controls">
            <button
              type="button"
              className="jarvis-screen-toggle"
              onClick={() => void toggleScreenShare()}
            >
              {screenActive ? "Stop screen access" : "Share screen with JARVIS"}
            </button>
            <span>{screenStatus}</span>
          </div>
        </div>

        <div className="caption-area" aria-live="polite">
          <div className="caption-scroll" ref={captionScrollRef}>
            {messages.slice(-6).map((msg, index) => {
              const isLatest = index === messages.slice(-6).length - 1 && !isPending && !interimText;
              return msg.role === "assistant" ? (
                <button
                  key={msg.id}
                  type="button"
                  className={`caption-turn caption-turn--clickable ${
                    isLatest ? "caption-turn--latest" : "caption-turn--past"
                  } caption--assistant`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedResponse(msg);
                  }}
                  aria-label="Open full JARVIS response"
                >
                  {msg.content}
                </button>
              ) : (
                <p
                  key={msg.id}
                  className={`caption-turn ${
                    isLatest ? "caption-turn--latest" : "caption-turn--past"
                  } caption--user`}
                >
                  {msg.content}
                </p>
              );
            })}

            {isPending && (
              <p className="caption-turn caption-turn--latest caption--thinking">
                <span>JARVIS is processing</span>
                <span className="caption-thinking-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            )}

            {isListening && interimText && (
              <p className="caption-turn caption-turn--latest caption--listening">
                <span className="caption-streaming-word">{interimText}</span>
                <span className="caption-streaming-cursor" />
              </p>
            )}
            <div ref={captionEndRef} />
          </div>

          {errorMessage && <small className="caption-error">{errorMessage}</small>}
        </div>

        {showNewsBriefing && newsArticles && newsArticles.length > 0 && (
          <div className="jarvis-news-briefing-card" onClick={(e) => e.stopPropagation()}>
            <div className="news-briefing-header">
              <div className="news-briefing-title-group">
                <span className="news-pulse-dot" />
                <span className="news-briefing-tag">LIVE HOT TOPICS BRIEFING</span>
              </div>
              <button
                type="button"
                className="news-close-btn"
                onClick={() => setShowNewsBriefing(false)}
                aria-label="Dismiss news briefing"
              >
                ✕
              </button>
            </div>
            <div className="news-briefing-items">
              {newsArticles.slice(0, 5).map((article, idx) => (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-briefing-item"
                >
                  <div className="news-item-badge">
                    <span className="news-item-num">
                      {idx === 0 ? "🔥 TOP STORY" : `#${idx + 1}`}
                    </span>
                    <span className="news-item-source">{article.source}</span>
                  </div>
                  <p className="news-item-title">{article.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {sourceLinks.length > 0 && (
          <div className="jarvis-source-card" onClick={(e) => e.stopPropagation()}>
            <div className="news-briefing-header">
              <div className="news-briefing-title-group">
                <span className="news-pulse-dot" />
                <span className="news-briefing-tag">SOURCES FOR THIS ANSWER</span>
              </div>
              <button
                type="button"
                className="news-close-btn"
                onClick={() => setSourceLinks([])}
                aria-label="Dismiss sources"
              >
                ✕
              </button>
            </div>
            <div className="news-briefing-items">
              {sourceLinks.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-briefing-item"
                >
                  <div className="news-item-badge">
                    <span className="news-item-source">{src.source}</span>
                  </div>
                  <p className="news-item-title">{src.title}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="jarvis-input-container" onClick={(e) => e.stopPropagation()}>
          <form
            className={`jarvis-input-bar ${isTyping ? "jarvis-input-bar--active" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              if (inputText.trim()) {
                handleSendMessage(inputText);
                setInputText("");
                inputRef.current?.blur();
                setIsInputFocused(false);
              }
            }}
          >
            <span className="jarvis-input-icon">⌨</span>
            <input
              ref={inputRef}
              type="text"
              className="jarvis-input-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Speak naturally, or simply start typing anywhere..."
              aria-label="Ask JARVIS anything"
            />
            {inputText.trim().length > 0 && (
              <button type="submit" className="jarvis-send-btn" aria-label="Send message">
                ↵
              </button>
            )}
          </form>

          <div className={`jarvis-input-hint ${isTyping ? "jarvis-input-hint--visible" : ""}`}>
            <span>
              Press <kbd>Enter ↵</kbd> to send
            </span>
            <span>•</span>
            <span>
              <kbd>Esc</kbd> to return to voice
            </span>
          </div>

          <div className="jarvis-quick-prompts">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="jarvis-prompt-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendMessage(item.query);
                }}
                disabled={isPending || isSpeaking}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedResponse && (
        <div
          className="jarvis-response-overlay"
          role="presentation"
          onClick={() => setSelectedResponse(null)}
        >
          <article
            className="jarvis-response-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Full JARVIS response"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jarvis-response-modal-header">
              <span>JARVIS RESPONSE</span>
              <button
                type="button"
                className="news-close-btn"
                onClick={() => setSelectedResponse(null)}
                aria-label="Close full response"
              >
                ✕
              </button>
            </div>
            <div className="jarvis-response-modal-body">
              <p className="jarvis-response-full-text">{selectedResponse.content}</p>
              {selectedResponse.topicImages && selectedResponse.topicImages.length > 0 && (
                <div className="jarvis-topic-images">
                  {selectedResponse.topicImages.map((img) => (
                    <a
                      key={img.url}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="jarvis-topic-image-link"
                    >
                      <img src={img.thumbnailUrl} alt={img.title} loading="lazy" />
                      <span>{img.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
