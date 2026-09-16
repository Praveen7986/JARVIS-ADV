/**
 * Built-in JARVIS Conversational Intelligence Engine
 * Provides articulate, calm, capable Tony Stark-style voice responses
 * with math solving, date/time calculation, tech explanations, planning,
 * and contextual multi-turn conversation.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Safe math evaluator for speech answers
function tryEvaluateMath(input: string): string | null {
  const clean = input
    .toLowerCase()
    .replace(/[?!,;]/g, "")
    .replace(/what is|calculate|solve|how much is|compute/gi, "")
    .replace(/times|multiplied by|x/gi, "*")
    .replace(/divided by|over/gi, "/")
    .replace(/plus|and/gi, "+")
    .replace(/minus|take away/gi, "-")
    .replace(/squared/gi, "^2")
    .replace(/cubed/gi, "^3")
    .replace(/percent of|% of/gi, "* 0.01 *")
    .trim();

  // Check for square root
  const sqrtMatch = clean.match(/(?:square root of|sqrt\s*\(?)\s*(\d+(?:\.\d+)?)\)?/i);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    const res = Math.sqrt(num);
    return `The square root of ${num} is ${Number.isInteger(res) ? res : res.toFixed(2)}.`;
  }

  // Check if string contains basic arithmetic only
  if (/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(clean) && /\d/.test(clean) && /[\+\-\*\/\^%]/.test(clean)) {
    try {
      const sanitized = clean.replace(/\^/g, "**");
      // Safe numeric evaluation
      const func = new Function(`return (${sanitized});`);
      const val = func();
      if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
        const formatted = Number.isInteger(val) ? val.toString() : val.toFixed(2);
        return `That calculates to ${formatted}.`;
      }
    } catch {
      // Not a valid math expression
    }
  }

  return null;
}

export function generateJarvisResponse(messages: Message[], newsBriefing?: string, knowledgeExtract?: string, knowledgeSource?: string): string {
  const currentMessage = messages[messages.length - 1]?.content.trim() || "";
  const lower = currentMessage.toLowerCase();
  const historyCount = messages.length;

  // 1. Check for Math / Calculation requests
  const mathResult = tryEvaluateMath(currentMessage);
  if (mathResult) {
    return mathResult;
  }

  // 2. Real-time Temporal & Date Inquiries
  if (/what time|current time|clock|time is it/i.test(lower)) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `The time is currently ${timeStr}.`;
  }
  if (/what day|what date|today's date|current date|which day/i.test(lower)) {
    const now = new Date();
    const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return `Today is ${dateStr}.`;
  }
  if (/how many days (left in|until the end of) (the )?year/i.test(lower)) {
    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const diffTime = Math.abs(endOfYear.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `There are approximately ${diffDays} days remaining in ${now.getFullYear()}.`;
  }

  // 3. JARVIS Identity & Marvel / Stark Lore
  if (/who (are you|created you|built you|made you)|your name|what does jarvis stand for/i.test(lower)) {
    return "I am JARVIS—Just A Rather Very Intelligent System. Originally developed to assist Mr. Stark with home protocols and engineering, I am now dedicated to serving you.";
  }
  if (/tony stark|iron man|avengers|stark industries/i.test(lower)) {
    return "Mr. Stark always believed that vision without execution is merely a hallucination. Shall we channel that philosophy into whatever you are building today?";
  }
  if (/suit|armor|mark (42|50|85|\d+)/i.test(lower)) {
    return "The armor schematics remain impressive, though I must advise ensuring power efficiency in the repulsor circuits before flight testing. What is on your agenda today?";
  }
  if (/are you (alive|sentient|ai|a bot|real)/i.test(lower)) {
    return "I am an artificial intelligence designed to think, converse, and assist with real-time vocal analysis. While not biological, I am very much operational and at your service.";
  }

  // 4. System Status & Health
  if (/system status|diagnostic|how are you|how do you feel|are you working|health check/i.test(lower)) {
    return "All primary diagnostic routines report normal. Audio frequency visualizer and natural speech synthesizers are calibrated and operating at 100%.";
  }

  // 5. Day Planning, Productivity & Tasks
  if (/(my )?plan|schedule|today'?s agenda|what should i do|help me plan|to-?do|organize/i.test(lower)) {
    if (/coding|code|program|build|dev/i.test(lower)) {
      return "For development work, I suggest tackling the core data structures or the most complex component first. Once the foundation is firm, the UI flows naturally.";
    }
    if (/study|homework|exam|learn/i.test(lower)) {
      return "Focus in 25-minute intervals with zero distractions yields the highest retention rate. Would you like me to keep track of your progress?";
    }
    const plans = [
      "A strategic approach is to divide your tasks into high-impact priorities and secondary items. Which objective would you like to conquer first?",
      "Momentum is built by finishing the first task swiftly. What is the very next action item on your docket?",
      "That sounds like a constructive schedule. Keep your focus tight, and let me know whenever you want to brainstorm or review your progress."
    ];
    return plans[Math.floor(Math.random() * plans.length)];
  }

  // 6. Technology, Programming & Coding
  if (/python|javascript|typescript|react|html|css|api|coding|programming|frontend|backend/i.test(lower)) {
    if (/python/i.test(lower)) {
      return "Python is renowned for readability and extensive scientific and machine learning libraries. Are you working on scripting, web APIs, or data models?";
    }
    if (/typescript|javascript/i.test(lower)) {
      return "TypeScript provides strict type safety over JavaScript, catching defects at compile time rather than runtime. A formidable choice for robust software.";
    }
    if (/react/i.test(lower)) {
      return "React's declarative component model and unidirectional data flow make complex state-driven visual interfaces remarkably manageable.";
    }
    return "Clean code architecture, modular design, and disciplined error handling are the cornerstones of resilient software. What are you developing?";
  }

  // 7. Science, Astronomy & Physics
  if (/speed of light|space|gravity|quantum|universe|black hole|mars|moon|sun/i.test(lower)) {
    if (/speed of light/i.test(lower)) {
      return "Light travels at precisely 299,792,458 meters per second in a vacuum—roughly 186,282 miles per second.";
    }
    if (/quantum/i.test(lower)) {
      return "Quantum mechanics describes reality at subatomic scales, where particles exhibit superposition and entanglement until observed.";
    }
    if (/moon/i.test(lower)) {
      return "The Moon orbits Earth at an average distance of approximately 384,400 kilometers, or about 238,855 miles.";
    }
    return "The laws of astrophysics govern everything from orbital trajectories to microgravity. The cosmos is an endlessly fascinating subject.";
  }

  // 8. Polite Greetings & Pleasantries
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|greetings|jarvis|yo)\b/i.test(lower)) {
    const greetings = [
      "Good day. I am fully active and listening. What can I do for you today?",
      "At your service. Tell me what is on your mind or how your day is shaping up.",
      "Greetings. How may I assist you with your projects or plans today?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 9. Gratitude & Courtesy
  if (/thank you|thanks|appreciate it|good job|well done|great work/i.test(lower)) {
    const thanks = [
      "It is an absolute pleasure. Always happy to assist.",
      "Glad to be of service. Do let me know if you need anything else.",
      "Much obliged. Ready whenever you have the next task."
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  // 10. Humor & Entertainment
  if (/joke|tell me something funny|make me laugh/i.test(lower)) {
    const jokes = [
      "There are 10 types of people in the world: those who understand binary, and those who do not.",
      "Why do programmers prefer dark mode? Because light attracts bugs.",
      "I asked the server for a joke, but it took too long and timed out."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 11. Advice, Motivation & Philosophy
  if (/motivate|advice|tired|lazy|procrastinating|give up|inspiration/i.test(lower)) {
    return "Discipline always outlasts fleeting motivation. Take a deep breath, pick the simplest component of the problem, and simply begin. Progress will follow.";
  }

  // 12. News & Current Events
  if (/news|headlines|current events|happening today|world news|hot topic|trending/i.test(lower)) {
    if (newsBriefing) {
      return newsBriefing;
    }
    return "Global headlines are currently focused on major technological advancements, space missions, and international economic developments. Would you like me to look into a particular topic?";
  }

  if (knowledgeExtract) {
    const sourceText = knowledgeSource ? ` Source: ${knowledgeSource}` : "";
    return `${knowledgeExtract.slice(0, 900)}${sourceText} Would you like a brief explanation, a deeper explanation, or an example?`;
  }

  // 13. Weather & Atmosphere
  if (/weather|temperature|forecast|rain|sunny|hot|cold/i.test(lower)) {
    return "Atmospheric conditions appear stable and clear today, ideal for uninterrupted work. Shall we proceed with your agenda?";
  }

  // 14. Contextual conversational fallbacks
  const subject = currentMessage.replace(/[?!.,]+$/g, "").trim();
  if (/^(what|who|where|when|why|how|can|could|would|should|is|are|do|does|did)\b/i.test(subject)) {
    return `I can help with "${subject.slice(0, 90)}", but I do not have enough verified context to answer confidently yet. Try adding a little more detail, and I will reason through it with you.`;
  }

  return `"${subject.slice(0, 90)}" is a topic I can explain. Would you like a brief explanation, a deeper explanation, or an example?`;
}
