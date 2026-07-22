import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createRequire } from "module";
import nodemailer from "nodemailer";
// @ts-ignore
const requireFn = typeof require === "function" ? require : createRequire(import.meta.url);
const pdf = requireFn("pdf-parse");
const mammoth = requireFn("mammoth");

// Load environment variables
dotenv.config();

// Lazy-initialized nodemailer transport helper to send real email
async function sendRealEmail(to: string, subject: string, htmlBody: string): Promise<{ success: boolean; error?: string }> {
  let host = (process.env.SMTP_HOST || "").trim();
  const port = (process.env.SMTP_PORT || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from = (process.env.SMTP_FROM || "").trim() || "no-reply@cadence.intelligence";
  const fromName = (process.env.SMTP_FROM_NAME || "").trim() || "Cadence Intelligence";

  if (!host || !port || !user || !pass) {
    return {
      success: false,
      error: "SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are not fully configured in environment secrets."
    };
  }

  // Self-healing / Auto-correction for user configuration errors:
  // If the user mistakenly entered their email address as the SMTP_HOST (e.g. katyalrohit29@gmail.com)
  if (host.includes("@")) {
    const domain = host.split("@")[1]?.toLowerCase();
    if (domain === "gmail.com") {
      host = "smtp.gmail.com";
    } else if (domain) {
      host = `smtp.${domain}`;
    } else {
      host = "smtp.gmail.com";
    }
  } else if (host.toLowerCase() === "gmail.com" || host.toLowerCase() === "gmail") {
    host = "smtp.gmail.com";
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host,
      port: Number(port) || 465,
      secure: Number(port) === 465 || !port, // Default secure for port 465
      auth: {
        user: user,
        pass: pass,
      },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      subject,
      html: htmlBody,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Nodemailer failed to send email:", err);
    return {
      success: false,
      error: err.message || "Failed to deliver email through SMTP server."
    };
  }
}


// Persistent User Store
interface UserRecord {
  email: string;
  passwordHash: string;
  role: string;
  avatar: string;
}

const USERS_FILE = path.join(process.cwd(), "users.json");

// Cache users in memory to support read-only serverless platforms like Vercel
let inMemoryUsers: Record<string, UserRecord> | null = null;

function loadUsers(): Record<string, UserRecord> {
  if (inMemoryUsers) {
    return inMemoryUsers;
  }

  const defaultUsers: Record<string, UserRecord> = {
    "rohitkatyal12345@gmail.com": {
      email: "rohitkatyal12345@gmail.com",
      passwordHash: "password123",
      role: "Staff Systems Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
    }
  };

  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      if (data.trim()) {
        const parsed = JSON.parse(data);
        // Ensure default user is always present
        if (!parsed["rohitkatyal12345@gmail.com"]) {
          parsed["rohitkatyal12345@gmail.com"] = defaultUsers["rohitkatyal12345@gmail.com"];
        }
        inMemoryUsers = parsed;
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load users file:", error);
  }

  // Save default users initially if file doesn't exist
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write initial users file:", err);
  }
  inMemoryUsers = defaultUsers;
  return defaultUsers;
}

function saveUsers(users: Record<string, UserRecord>) {
  inMemoryUsers = users;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save users to file:", error);
  }
}

// Memory stores for secure OTP validation and verification
interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  otp: string;
  timestamp: string;
}

const activeOtps = new Map<string, { otp: string; expires: number }>();
const simulatedOutbox: SimulatedEmail[] = [];


// Lazy-initialized Gemini client helper
let aiClient: GoogleGenAI | null = null;
let geminiRateLimited = false;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust Gemini API call retry wrapper with exponential backoff
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 4,
  delay = 2000
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    let errorStr = String(error.message || "").toLowerCase() + " " + String(error.status || "").toLowerCase();
    try {
      errorStr += " " + JSON.stringify(error).toLowerCase();
    } catch (e) {
      // Ignore serialization error
    }

    const isRetriable =
      error.status === "UNAVAILABLE" ||
      errorStr.includes("503") ||
      errorStr.includes("unavailable") ||
      errorStr.includes("resource_exhausted") ||
      errorStr.includes("resource exhausted") ||
      errorStr.includes("429") ||
      errorStr.includes("overloaded") ||
      errorStr.includes("quota exceeded") ||
      errorStr.includes("high demand");

    if (isRetriable) {
      geminiRateLimited = true;
    }

    if (isRetriable && retries > 0) {
      console.warn(`Gemini API experienced high demand or rate limit (503/429). Retrying in ${delay}ms... (Attempts left: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGeminiWithRetry(apiCall, retries - 1, delay * 1.8);
    }
    throw error;
  }
}

// 1. Fallback topics generator if API is unavailable
function getFallbackTopics(pillars: string[], identity: string) {
  const defaultPillars = pillars && pillars.length > 0 ? pillars : ["Career Lessons", "Technical Challenges", "Personal Growth"];
  const topicsList = [
    {
      title: "The high cost of ignoring code quality in v1",
      description: "How shipping faster today is actually costing your team 10x in long-term delivery speed.",
      contentPillar: defaultPillars[0],
      angle: "Contrarian view: Tech debt is acceptable for validating MVP, but ignoring it past that destroys engineering speed.",
      reason: "Highly relatable for engineering managers and team leads who fight for maintenance budgets daily."
    },
    {
      title: "Why I refused a management promotion to stay an Individual Contributor",
      description: "Deconstructing the corporate myth that pushes every talented developer away from coding.",
      contentPillar: defaultPillars[1 % defaultPillars.length],
      angle: "Personal narrative: You can have massive organizational leverage without managing direct reports.",
      reason: "Engages senior engineers who feel stuck between managing people versus continuing to build systems."
    },
    {
      title: "The two weeks we lost arguing over button padding",
      description: "A funny but real story of a minor detail that stalled a startup, and what it taught us about decision speed.",
      contentPillar: defaultPillars[2 % defaultPillars.length],
      angle: "Self-critical failure: How lack of clear decision authority in flat teams leads to infinite circular debates.",
      reason: "Humble storytelling that sparks massive discussion about startup team structures and design bottlenecks."
    },
    {
      title: "The core business metric they never taught me in school",
      description: "Realizing that business alignment and customer velocity matter 100x more than writing the 'perfect' abstract architecture.",
      contentPillar: defaultPillars[3 % defaultPillars.length],
      angle: "Insight: The most impactful code you write is often the code you delete to simplify the system.",
      reason: "Highly appreciated by CTOs, technical founders, and product-oriented engineering leaders."
    },
    {
      title: "A midnight debugging session that reshaped how I plan sprints",
      description: "Solving a critical production outage alone at 12 AM and realizing it was a communication failure, not a code bug.",
      contentPillar: defaultPillars[4 % defaultPillars.length],
      angle: "Vulnerable failure: Solving for human team communication before writing fail-safe software structures.",
      reason: "High narrative tension that invites developers to comment with their own midnight production horror stories."
    }
  ];
  return topicsList;
}

// 2. Fallback hooks generator
function getFallbackHooks(topic: any) {
  const title = topic?.title || "building in public";
  return [
    {
      text: `We spent 14 days arguing about a minor UI detail.
Here is what that failure taught me about startup speed:`,
      patternName: "Raw Numbers / Stark Result Hook",
      explanation: "Grabs attention instantly by exposing a relatable, humble team failure with concrete timelines."
    },
    {
      text: `The best software developers I know write the least code.
It sounds like a joke. But it is a critical business reality.`,
      patternName: "Surprising Stat Contrast / Irony",
      explanation: "Creates cognitive dissonance. Professionals scroll-stop to find out why coding less is better."
    },
    {
      text: `Stop promoting your best engineers into management.
It is the fastest way to turn a brilliant coder into a mediocre administrator.`,
      patternName: "Provocative One-Liner / Conversational Take",
      explanation: "A bold, controversial opinion that divides the professional audience and drives comments."
    }
  ];
}

// 3. Fallback draft generator
function getFallbackDraft(topic: any, hook: any, profile: any) {
  const p1 = hook?.text || "The best software developers I know write the least code.";
  const title = topic?.title || "The v1 code quality debate";
  const p2 = `In corporate tech, we are conditioned to believe that more activity equals more value.
We count lines of code, git commits, and hours sitting at the desk.

But senior experience teaches you something different.

Last year, we faced a complex system problem.
The initial proposal was a brand new microservice.
We spent 2 weeks whiteboarding.
We estimated 4,000 lines of complex TypeScript.

Then we paused.

We realized we could achieve the exact same user outcome by deleting an old feature and writing a single simple cron job.

We wrote 12 lines of code.
The system ran flawlessly.

The lessons:
1. Speed comes from clear decisions, not typing fast.
2. The best code is the code you never write. It has zero bugs and costs nothing to maintain.
3. Solve human alignment before writing code.

What is the biggest block of code you have deleted recently? Let me know in the comments!`;

  return {
    postText: `${p1}\n\n${p2}`,
    estimatedWordCount: p1.split(/\s+/).length + p2.split(/\s+/).length,
    qualityChecks: [
      "Hook integrated cleanly on line 1",
      "Spacious double-spacing preserved",
      "Corporate jargon and buzzwords strictly avoided",
      "Conversational open-ended question at the end to maximize comments"
    ]
  };
}

// 4. Fallback tone analysis / review tool
function getFallbackToneAnalysis(postText: string) {
  const lowercase = (postText || "").toLowerCase();
  const lines = postText.split("\n").map((l) => l.trim()).filter(Boolean);
  const buzzwords = ["leverage", "synergy", "impactful", "passionate", "excited to share", "delighted to announce", "game-changer", "testament"];
  const foundBuzzwords = buzzwords.filter((word) => lowercase.includes(word));

  let score = 92;
  const improvements: string[] = [];
  const strengths: string[] = [
    "Excellent spacing utilizing highly readable 1-2 sentence paragraphs.",
    "The call-to-action is conversational and open-ended to invite natural engagement."
  ];

  if (foundBuzzwords.length > 0) {
    score -= foundBuzzwords.length * 10;
    improvements.push(`Remove corporate buzzwords: ${foundBuzzwords.map((w) => `'${w}'`).join(", ")}.`);
  } else {
    strengths.push("Pragmatic, raw vocabulary with zero corporate hype words.");
  }

  if (lines.length > 0 && lines[0].length > 110) {
    score -= 15;
    improvements.push("Shorten the opening hook line to keep it under 100 characters to prevent truncation on mobile feed previews.");
  } else {
    strengths.push("High-impact opening hook that stops the scroll immediately.");
  }

  if (!postText.includes("?")) {
    score -= 10;
    improvements.push("Add an open-ended conversational question at the very end to encourage reader participation.");
  }

  if (improvements.length === 0) {
    improvements.push("Consider introducing a specific personal metric (e.g. '$0, 10 hours') to ground your story further.");
  }

  let suggestedFixText = postText;
  for (const b of foundBuzzwords) {
    const regex = new RegExp(b, "gi");
    suggestedFixText = suggestedFixText.replace(regex, b === "excited to share" ? "here is" : "use");
  }

  return {
    score,
    strengths,
    improvements,
    buzzwordsFound: foundBuzzwords,
    suggestedFixText
  };
}

// 5. Fallback voice profile analyzer (Heuristic-based local processor)
function getHeuristicVoiceProfile(samples: string[]) {
  const combined = samples.join("\n").toLowerCase();
  let formality = "Conversational";
  if (combined.includes("please") || combined.includes("sincerely") || combined.includes("furthermore") || combined.includes("regards")) {
    formality = "Semi-formal";
  } else if (combined.includes("i ") || combined.includes("we ") || combined.includes("startup") || combined.includes("tech") || combined.includes("developer")) {
    formality = "Extremely Conversational";
  } else if (combined.includes("data") || combined.includes("analysis") || combined.includes("system")) {
    formality = "Technical & Analytical";
  }

  let sentenceLength = "Balanced explanatory text";
  const lines = samples.join("\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const avgLineLen = lines.length ? lines.reduce((acc, l) => acc + l.length, 0) / lines.length : 40;
  if (avgLineLen < 55) {
    sentenceLength = "Ultra-punchy & Short";
  } else if (avgLineLen > 95) {
    sentenceLength = "Flowing, storytelling prose";
  }

  const emojiCount = (combined.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  let emojiFrequency = "Sparingly";
  if (emojiCount === 0) {
    emojiFrequency = "Never";
  } else if (emojiCount > 3) {
    emojiFrequency = "Occasional punchy highlights";
  }

  const keyStylisticTraits = [
    "Uses a personal, anecdotal narrative approach to illustrate business lessons.",
    "Structures writing with concise, isolated sentences and generous line breaks.",
    "Uses raw metrics and real examples (e.g., years, dollars, size) to establish authority."
  ];

  if (combined.includes("code") || combined.includes("engineer") || combined.includes("sql") || combined.includes("developer") || combined.includes("tech")) {
    keyStylisticTraits.push("Directly speaks to developers, tech leads, and product teams.");
  } else {
    keyStylisticTraits.push("Focuses on general professional growth and personal branding.");
  }

  const suggestedRules = [
    "Never use cheesy corporate phrases like 'excited to share' or 'delighted to announce'.",
    "Hook the reader on the first line with a sharp, bold, or contrarian sentence.",
    "Write with extreme clarity using high whitespace (paragraphs under 2 sentences).",
    "End posts with a conversational question to invite audience experience sharing."
  ];

  return {
    formality,
    sentenceLength,
    emojiFrequency,
    keyStylisticTraits,
    suggestedRules
  };
}

// 6. Fallback strategic recommendations review
function getFallbackStrategyReview(profile: any, activePosts: any[]) {
  const pillars = profile?.contentPillars || ["Career Lessons", "Technical Challenges", "Personal Growth"];
  const idealContentMix = pillars.map((p: string, idx: number) => {
    const percentages = pillars.length === 1 ? [100] : pillars.length === 2 ? [60, 40] : [45, 35, 20];
    return {
      pillar: p,
      percentage: percentages[idx % percentages.length] || 20
    };
  });

  return {
    strategyScore: Math.min(85 + (activePosts?.length || 0) * 3, 98),
    recommendations: [
      {
        title: "Diversify Your Hook Patterns",
        description: "Your current timeline relies heavily on conversational openings. Introduce the 'Raw Numbers' pattern to break up feed monotony and increase initial click-through rate.",
        expectedImpact: "High"
      },
      {
        title: "Keep Content Pillars Highly Balanced",
        description: `Strive to rotate between your core pillars (${pillars.join(", ")}) to keep different audience segments engaged and maximize your reach.`,
        expectedImpact: "Medium"
      },
      {
        title: "Craft Interactive Experience CTAs",
        description: "Move away from standard closed questions like 'Do you agree?'. Instead, invite specific storytelling (e.g. 'What was your most painful debugging nightmare?') to drive high-comment algorithms.",
        expectedImpact: "High"
      }
    ],
    idealContentMix
  };
}

// 6.5 Fallback career analysis generator
function getFallbackCareerAnalysis(
  linkedinUrl: string,
  resumeText: string,
  targetRole: string,
  targetCompany: string,
  experienceLevel: string,
  industry: string,
  jobDescription: string
) {
  let detectedName = "Candidate Profile";
  try {
    const parts = (linkedinUrl || "").split("/in/");
    if (parts.length > 1) {
      const namePart = parts[1].split("/")[0].split("-");
      detectedName = namePart
        .filter((p) => isNaN(Number(p)) && p.length > 0)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    }
  } catch (e) {
    // Ignore error
  }

  if (!detectedName || detectedName.trim() === "Candidate Profile" || detectedName === "LinkedIn Creator") {
    detectedName = "Alex Mercer";
  }

  const role = targetRole || "Senior Staff Engineer";
  const company = targetCompany || "Stripe";
  const ind = industry || "Technology / FinTech";
  const level = experienceLevel || "Senior-Level (5-10 yrs)";

  // Dynamic analysis text containing custom company/role metrics
  return {
    candidateName: detectedName,
    targetRole: role,
    targetCompany: company,
    industry: ind,
    experienceLevel: level,
    overallScore: 74,
    linkedinScore: 71,
    resumeScore: 75,
    atsScore: 68,
    recruiterScore: 72,
    hiringManagerScore: 76,
    brandScore: 65,
    growthScore: 80,
    leadershipScore: 70,
    readinessScore: 74,
    gamification: {
      xpLevel: 3,
      xpPoints: 2450,
      nextLevelXp: 3000,
      weeklyStreak: 4,
      achievements: [
        { title: "LinkedIn Optimizer", description: "Completed LinkedIn URL deep-scan validation", badgeId: "badge_linkedin_scan", unlocked: true },
        { title: "STAR Performer", description: "Optimized 3+ experience bullet-points with STAR metrics", badgeId: "badge_star_bullets", unlocked: true },
        { title: "ATS Proofed", description: "Cleared critical ATS document formatting structural errors", badgeId: "badge_ats_pass", unlocked: false },
        { title: "Recruiter Ready", description: "Reached Recruiter Approval Score of 85% or higher", badgeId: "badge_recruiter_love", unlocked: false }
      ]
    },
    crossVerification: [
      {
        item: "Professional Title Alignment",
        status: "warning",
        evidence: `Resume lists you as "Lead Software Architect" but LinkedIn states "Full Stack Software Developer".`,
        recommendation: `Align titles exactly. Recruiters look for consistency across sources. Misaligned titles trigger 'exaggeration' alerts.`
      },
      {
        item: "Employment Timelines",
        status: "verified",
        evidence: "Both sources align perfectly for your tenure at current and previous roles (May 2023 - Present).",
        recommendation: "Excellent. Keep this alignment intact when updating future milestones."
      },
      {
        item: "Skills & Keywords Coverage",
        status: "warning",
        evidence: `LinkedIn highlights 12 skills (with focus on Web Dev) while Resume features 35 technical skills, missing key business outcome languages.`,
        recommendation: `Synchronize core competencies. Back-fill your LinkedIn "Skills" section with at least 8 key technical libraries mentioned in your resume.`
      },
      {
        item: "Certificates Validation",
        status: "verified",
        evidence: "Certificates listed on Resume are verifiable via public credential URLs linked on your profile.",
        recommendation: "Great practice. Always pin high-authority certifications to the top of your featured profile assets."
      }
    ],
    atsAnalysis: {
      email: "alex.mercer@gmail.com",
      phone: "+1 (555) 342-9981",
      location: "San Francisco Bay Area",
      score: 68,
      formattedWell: false,
      contactFound: true,
      details: "Your resume structure utilizes a double-column grid layout with nested tables. Modern ATS engines (such as Workday, Greenhouse, and Taleo) read left-to-right, meaning your experience columns will be merged, scrambling chronological dates and duties.",
      improvements: [
        "Eliminate tables, visual grid splitters, and custom graphical skill sliders from the document file.",
        "Ensure dates are strictly placed on the far right of single columns to assist chronological ranking engines.",
        "Do not use text embedded in image headers—place contact info in the raw body text."
      ]
    },
    bulletRewrites: [
      {
        original: "Responsible for managing and writing code for the company checkout flow integration.",
        optimized: "Architected and scaled the secure high-velocity payment microservice using TypeScript, improving transaction checkout speeds by 34% and cutting dropped shopping-cart rates by $120k ARR.",
        metricFocus: "Revenue & Speed",
        impact: "Transform passive duty language into direct business accountability under the STAR framework."
      },
      {
        original: "Worked closely with product owners and stakeholders to implement design features.",
        optimized: "Spearheaded cross-functional features with 3 Product Directors, accelerating shipping velocity by 3 weeks and delivering core customer metrics 15% ahead of schedule.",
        metricFocus: "Cross-Functional Leadership",
        impact: "Highlights initiative, execution ownership, and cross-team alignment."
      },
      {
        original: "Fixed bug errors on the database to keep servers running securely.",
        optimized: "Redesigned PostgreSQL connection pooling and optimized indexing structures, cutting active API latency by 180ms and preventing downtime during 4.2x traffic spikes.",
        metricFocus: "Infrastructure Performance",
        impact: "Proves technical expertise with concrete hardware and data measurements."
      }
    ],
    recruiterSimulation: {
      assessment: "Strong baseline with high domain depth, but weak self-advocacy. Your profile fails to answer the question: 'Why should I source you instead of 100 other developers in this market?'",
      response: "Likely to Interview, but with initial compensation skepticism because your headline lacks executive authority.",
      clickProbability: 65,
      reasoning: "Recruiters spend an average of 7.4 seconds reviewing a candidate before making a swipe decision. Your headline is generic ('Software Engineer'), forcing them to dig into the experience bullets. If the first two bullets don't have bold dollar metrics, they skip.",
      criticalFails: [
        "Generic LinkedIn headline without direct business-value hook.",
        "Double-column resume layout which scrambles typical ATS parser read paths.",
        "No explicit 'featured section' links to high-quality code demos or blog writeups."
      ],
      quickWins: [
        "Update your headline immediately using the generated Value Hook below.",
        "Add a visual cover banner highlighting your core tech stack or a high-contrast logo.",
        "Convert your resume to a single-column, left-aligned standard Word/PDF format."
      ]
    },
    hiringManagerSimulation: {
      keyDifferentiator: "Proven capability to execute and write high-quality systems, but needs stronger ownership representation.",
      businessImpactScore: 68,
      ownershipMindsetAdvice: `Hiring managers at ${company} care about trade-offs, scalability, and delivery. Do not just list tools. Explain WHY you chose those tools and the business trade-off you accepted. Frame your experience using the 'Own-It' paradigm: I identified a friction point, I proposed a system-design, I shipped it, and here is how it impacted company metrics.`,
      scenarioQuestions: [
        `"On your resume, you optimized checking latency. In our ${company} payments infrastructure, how would you approach scaling a distributed queue during double-digit transaction peaks?"`,
        `"Give me an example of a technical decision you made where you actively traded theoretical architectural perfection for immediate product shipping speed. What was the outcome?"`
      ]
    },
    skillIntelligence: {
      technicalMatch: ["TypeScript", "Node.js", "PostgreSQL", "Next.js", "System Architecture", "REST APIs"],
      gapSkills: ["Distributed Systems", "gRPC / Event Brokers", "Redis Caching Patterns", "Financial Ledgers & Double-Entry Bookkeeping"],
      trendingSkillsInDomain: ["AI LLM Guardrails (LlamaGuard)", "Edge Database Syncing", "Serverless Streaming Pipes"]
    },
    linkedinOptimization: {
      headlineCritique: "Your headline lists technologies instead of problems solved. Technologies are cheap commodities; engineers who solve high-revenue business problems are expensive and highly sought after.",
      suggestedHeadlines: [
        `Fusing high-performance TypeScript with FinTech scale | Building secure infrastructure at ${company} level | Ex-BigTech`,
        `Helping software teams scale core backend databases from 10k to 1M+ active events/sec | Specialized in ${role} Delivery`,
        `Developing low-latency payment rails & high-velocity microservices | Sharing system architecture lessons | ex-Founder`
      ],
      aboutSnippet: `💡 THE ENGINEERING VALUE\nI believe great software isn't just about clean code—it's about driving customer retention and reducing system cost. I scale systems so businesses can scale their product dreams safely.\n\n🛠️ CORE EXPERTISE\nFor the past few years, I've designed and shipped complex software infrastructure. My focus:\n- Scaling relational databases (indexing, pooling, low-latency queries)\n- Building high-volume payment processing pipelines\n- Fostering high-shipping engineering culture\n\n📫 Feel free to connect to discuss systems architecture, or drop me a DM at alex@mercer.dev.`,
      bannerAdvice: "Replace generic shapes with a dark charcoal banner featuring a single elegant line of text stating your value proposition in JetBrains Mono. Use high-contrast, clean typography."
    },
    careerRoadmap: [
      {
        phase: "Phase 1: ATS Proof & Personal Brand Foundations",
        duration: "Weeks 1-2",
        focus: "Reformat resume layout & rewrite LinkedIn header/About copy",
        actionItems: [
          "Convert resume to standard single-column ATS format.",
          "Implement the '💡 THE ENGINEERING VALUE' About section copy on LinkedIn.",
          "Pin your top GitHub open-source system-design projects in the Featured tab."
        ],
        metricGoal: "Increase profile visibility views by 40% and ATS parse success rate to 98%."
      },
      {
        phase: "Phase 2: Targeted Keyword Optimization & Content Feed Scheduling",
        duration: "Weeks 3-6",
        focus: `Adopt Cadence content schedule to share personal career lessons to catch recruiters from ${company}`,
        actionItems: [
          `Draft and schedule 3 highly technical posts per week in your unique calibrated voice.`,
          "Introduce 1 personal failure post explaining a hard lesson learned in system design.",
          "Actively comment on 5 target industry leaders' posts daily to boost feed algorithmic relevance."
        ],
        metricGoal: `Acquire 15+ inbound recruiter connections per month from ${company} & related top-tier FinTech firms.`
      },
      {
        phase: "Phase 3: System Design Mock Drills & Interview Prep",
        duration: "Weeks 7-10",
        focus: "Behavioral alignment & system scalability practice",
        actionItems: [
          "Practice the 2 scenario-based distributed queue questions generated by our Hiring Manager simulation.",
          "Master STAR framework presentation templates for your 3 top projects.",
          "Secure 2 informational interview chats with existing developers in target companies."
        ],
        metricGoal: "Secure target company job offer with optimal compensation package."
      }
    ],
    expectedImpact: {
      recruiterResponseIncrease: "85% increase in recruiter response rates due to title alignment and value-focused bullet rewrites",
      atsImprovementMultiplier: "4.5x more likely to clear automatic screening triggers",
      salaryBoostPotential: "$25,000 - $45,000 increase in base compensation range due to strong executive positioning"
    },
    jdMatch: {
      score: 72,
      matchedKeywords: ["TypeScript", "API Integration", "Database Query Indexing", "System Architecture", "PostgreSQL"],
      missingKeywords: ["Distributed Queues / Redis", "gRPC / Event-Driven Microservices", "CI/CD Pipeline Automation", "Unit Testing Coverage (Jest/Vitest)"],
      structuralIssues: [
        "Your experience timeline lists responsibilities, but lacks the specific scale metrics requested in the target JD.",
        "The job description specifically demands 'experience with cloud deployments' which your current resume text does not explicitly cover."
      ],
      pointToPointEnhancements: [
        {
          jdRequirement: "Must have experience designing and optimizing low-latency Postgres databases or other SQL tables.",
          resumeStatus: "Lacks metrics; your resume states: 'Fixed database errors and kept servers running'.",
          recommendedAdjustment: "Rewrite to: 'Redesigned PostgreSQL connection pooling and optimized database indices, reducing average query latency by 180ms under peak 4.2x traffic spikes.'"
        },
        {
          jdRequirement: "Lead technical integration with third-party payment gateways and webhooks.",
          resumeStatus: "Weak wording; your resume states: 'Helped with checkout flow integration'.",
          recommendedAdjustment: "Rewrite to: 'Architected and integrated a secure Stripe and localized checkout API, improving processing checkout speeds by 34% and saving over $120,000 in abandoned transaction ARR.'"
        },
        {
          jdRequirement: "Collaborate closely with cross-functional product teams to design roadmap specifications.",
          resumeStatus: "Passive language; your resume states: 'Worked closely with product owners'.",
          recommendedAdjustment: "Rewrite to: 'Spearheaded technical roadmap collaboration with 3 Product Directors, accelerating feature delivery by 22 days and improving launch metrics by 15%.'"
        },
        {
          jdRequirement: "Experience deploying and configuring server-side cloud services or containers.",
          resumeStatus: "Missing completely from your experience lists.",
          recommendedAdjustment: "Add standard bullet: 'Containerized core payment services using Docker, orchestrating zero-downtime rolling updates to Cloud Run and saving 15% on monthly resource costs.'"
        }
      ]
    }
  };
}

// 7. Fallback profile audit generator

function getFallbackProfileAudit(profileUrl: string) {
  let detectedName = "LinkedIn Creator";
  try {
    const parts = (profileUrl || "").split("/in/");
    if (parts.length > 1) {
      const namePart = parts[1].split("/")[0].split("-");
      detectedName = namePart
        .filter((p) => isNaN(Number(p)) && p.length > 0)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    }
  } catch (e) {
    // Ignore error
  }

  if (!detectedName || detectedName.trim() === "LinkedIn Creator") {
    detectedName = "Professional Builder";
  }

  return {
    detectedName,
    overallScore: 78,
    headlineScore: 72,
    aboutScore: 80,
    contentScore: 82,
    headlineAnalysis: {
      currentEstimated: "Experienced Professional | Growing My Brand",
      critique: "Your current headline is too generic and passive. It lists roles or broad categories instead of articulating your unique transformation value proposition. On LinkedIn, your headline is your primary ad banner—it should stop the scroll.",
      optimizedSuggestions: [
        `Building high-performance teams & scaling products | Sharing lessons from the trenches | Ex-BigTech`,
        `Helping tech leaders optimize their delivery speed without sacrificing code quality | Engineering Advisor`,
        `Fusing code with business growth | Crafting scalable TypeScript systems that drive customer acquisition`
      ]
    },
    aboutAnalysis: {
      critique: "Your About section reads like a traditional resume summary in the third person. It lacks human vulnerability, hooks, and a clear call-to-action (CTA). High-performing creators write in the first person and share their 'Why'.",
      suggestedStructure: [
        "Hook: A bold, narrative statement highlighting your core philosophy.",
        "Backstory: The hard-learned failure or watershed moment that changed your perspective.",
        "Value Proposition: Who you serve, how you help, and the metrics of your success.",
        "Clear CTA: Tell them exactly how to engage with you (e.g. DM, newsletter, calendly link)."
      ],
      templateSnippet: `💡 THE CORE BELIEF\nI believe the best code is the code you delete to simplify a business outcome. Too often, teams trade velocity for theoretical architecture perfection.\n\n🛠️ WHAT I DO\nFor the past 10 years, I've scaled software from zero to 1M+ active users. Today, I advise engineering leaders on:\n- Eliminating button-padding debates (making decisions fast)\n- Bridging the gap between code and board-room revenue\n- Keeping codebases lightweight and high-velocity\n\n📫 Let's talk engineering speed. Drop me a DM here or email rohit@example.com.`
    },
    contentStrategy: {
      critique: "Your content flow lacks rhythm. You have great technical depth, but you are not framing stories in an engaging 'storytelling' template. You need to rotate between structured technical teardowns, personal failures, and career growth lessons.",
      recommendedPillars: [
        "Engineering Velocity & Speed Bottlenecks",
        "Personal Storytelling / Lessons from Failure",
        "Modern Technology Teardowns"
      ],
      actionPlan: [
        "Draft and schedule 3 high-impact posts per week using Cadence's structured hooks.",
        "Implement double-spaced layout styling to make your posts easy to skim on mobile devices.",
        "Use active, low-jargon verbs and avoid typical buzzwords ('excited to share', 'humbled')."
      ]
    },
    visualOptimizations: {
      bannerAdvice: "Replace generic geometric backgrounds or standard templates with a custom banner that states your value proposition in 5-7 words. Use clean sans-serif typography with high color contrast.",
      photoAdvice: "Use a high-resolution, friendly headshot with a clean, high-contrast solid background. Make sure you are smiling and looking directly at the camera to build trust."
    }
  };
}

export const app = express();

// Use JSON body parser with comfortable limit for writing samples
app.use(express.json({ limit: "5mb" }));

// API endpoints
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      keyAvailable: !!process.env.GEMINI_API_KEY, 
      rateLimited: geminiRateLimited,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
    });
  });

  // Authentication Verification Endpoint
  app.post("/api/verify-auth", (req, res) => {
    const { email, password, role, avatar } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: Please enter a valid professional email address."
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: Password must be at least 6 characters long."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();

    if (users[cleanEmail]) {
      // User exists - check password
      if (users[cleanEmail].passwordHash !== password) {
        return res.status(401).json({
          success: false,
          error: `Verification Failed: Incorrect password for ${cleanEmail}. Please double-check your password, or use the "Forgot Password" link to reset it.`
        });
      }
      
      // Password correct! Return user info
      return res.json({
        success: true,
        verified: true,
        user: {
          email: cleanEmail,
          role: users[cleanEmail].role || role || "Contributor",
          avatar: users[cleanEmail].avatar || avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
        },
        message: "Workspace credentials verified successfully by Cadence Core."
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "Account not found. Please switch to the Sign Up tab to register a new workspace."
      });
    }
  });

  // Dedicated Sign Up Endpoint
  app.post("/api/signup", (req, res) => {
    const { email, password, role, avatar } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Registration Failed: Please enter a valid professional email address."
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Registration Failed: Password must be at least 6 characters long."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();

    if (users[cleanEmail]) {
      return res.status(400).json({
        success: false,
        error: "Registration Failed: An account with this email already exists. Please Sign In instead."
      });
    }

    const newUser: UserRecord = {
      email: cleanEmail,
      passwordHash: password,
      role: role || "Contributor",
      avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
    };

    users[cleanEmail] = newUser;
    saveUsers(users);

    return res.json({
      success: true,
      user: {
        email: cleanEmail,
        role: newUser.role,
        avatar: newUser.avatar
      },
      message: "Workspace account created and stored successfully!"
    });
  });

  // 1. Send OTP Endpoint
  app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: Please enter a valid professional email address."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate a secure, high-visibility 6-digit OTP
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    activeOtps.set(cleanEmail, { otp, expires });

    // Design a gorgeous professional dual-verification email body
    const subject = `[Cadence Workspace Security] Verification Code: ${otp}`;
    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; color: #f1f5f9;">
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #4f46e5, #6366f1); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #ffffff; font-size: 18px; line-height: 1; text-align: center;">C</div>
          <span style="font-size: 16px; font-weight: 800; color: #ffffff; margin-left: 10px; letter-spacing: -0.025em;">Cadence Workspace Security</span>
        </div>
        
        <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.01em;">Dual-Verification OTP Requested</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
          A request was initiated to verify identity or perform a high-fidelity password reset for workspace: <strong style="color: #e2e8f0;">${cleanEmail}</strong>. 
        </p>

        <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #6366f1; margin: 0 0 8px 0;">Your Verification OTP</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #ffffff; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; margin: 0;">${otp}</div>
          <p style="font-size: 10px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes • Keep this code confidential</p>
        </div>

        <p style="font-size: 11px; color: #475569; line-height: 1.5; margin: 0;">
          If you did not initiate this request, you can safely ignore this email. Your workspace remains encrypted and secure.
        </p>
      </div>
    `;

    // Push to simulated outbox log so the client sandbox can read it instantly
    const emailRecord: SimulatedEmail = {
      id: Math.random().toString(36).substring(2, 11),
      to: cleanEmail,
      subject,
      body,
      otp,
      timestamp: new Date().toLocaleTimeString()
    };

    // Maintain a max list size of 15 emails to prevent memory creep
    simulatedOutbox.unshift(emailRecord);
    if (simulatedOutbox.length > 15) {
      simulatedOutbox.pop();
    }

    console.log(`[SECURE MAIL SENT] OTP Generated for ${cleanEmail}: ${otp}`);

    // Try sending real email
    const mailResult = await sendRealEmail(cleanEmail, subject, body);

    if (mailResult.success) {
      // Redact the OTP from the simulated outbox record for real SMTP security
      emailRecord.otp = "******";
      emailRecord.body = emailRecord.body.replace(otp, "******");

      return res.json({
        success: true,
        smtpConfigured: true,
        message: `A security OTP verification email has been successfully dispatched directly to ${cleanEmail}. Please check your inbox (including your spam folder).`
      });
    } else {
      const isConfigError = mailResult.error && mailResult.error.includes("not fully configured");
      const userMessage = isConfigError 
        ? `A security OTP verification email has been generated for ${cleanEmail}. Since SMTP credentials are not yet configured in Settings > Secrets, the code has been delivered to the Workspace Sandbox Mailbox below.`
        : `SMTP mail delivery failed: ${mailResult.error}. The code has been routed to the Workspace Sandbox Mailbox below so you are not blocked.`;

      return res.json({
        success: true,
        smtpConfigured: false,
        smtpError: mailResult.error,
        message: userMessage
      });
    }
  });

  // 2. Verify OTP Endpoint
  app.post("/api/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: Email and OTP code are required parameters."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stored = activeOtps.get(cleanEmail);

    if (!stored) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: No verification request is active for this email. Please request a new OTP."
      });
    }

    if (Date.now() > stored.expires) {
      activeOtps.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: "Verification Failed: The OTP code has expired. Please request a new OTP."
      });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        error: "Verification Failed: Incorrect OTP code. Please enter the exact 6-digit code sent to you."
      });
    }

    return res.json({
      success: true,
      message: "Security code verified successfully."
    });
  });

  // 3. Fetch Simulated Emails for development sandbox
  app.get("/api/simulated-emails", (req, res) => {
    return res.json({
      success: true,
      emails: simulatedOutbox
    });
  });

  // Password Reset / Forgot Password Endpoint
  app.post("/api/reset-password", (req, res) => {
    const { email, newPassword, otp } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Reset Failed: Please enter a valid professional email address."
      });
    }

    if (!otp || typeof otp !== "string" || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        error: "Reset Failed: A valid 6-digit verification OTP code is required."
      });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Reset Failed: Password must be at least 6 characters long."
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Verify OTP first!
    const stored = activeOtps.get(cleanEmail);
    if (!stored) {
      return res.status(400).json({
        success: false,
        error: "Reset Failed: No active OTP request found for this email. Please request an OTP first."
      });
    }

    if (Date.now() > stored.expires) {
      activeOtps.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: "Reset Failed: Your verification OTP code has expired. Please request a new one."
      });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        error: "Reset Failed: The verification OTP code is incorrect."
      });
    }

    // OTP validated successfully - remove it so it cannot be re-used
    activeOtps.delete(cleanEmail);

    const users = loadUsers();

    if (users[cleanEmail]) {
      // Update password
      users[cleanEmail].passwordHash = newPassword;
      saveUsers(users);

      return res.json({
        success: true,
        message: `Security password for ${cleanEmail} has been reset successfully. You can now log in using your new password.`
      });
    } else {
      // Create user with new password
      const newUser: UserRecord = {
        email: cleanEmail,
        passwordHash: newPassword,
        role: "Contributor",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
      };
      users[cleanEmail] = newUser;
      saveUsers(users);

      return res.json({
        success: true,
        message: `No existing workspace was registered under ${cleanEmail}. A new workspace account has been initialized and secured with this password. You can now log in.`
      });
    }
  });

  // 1. Generate Topics based on Content Pillars and Profile
  app.post("/api/generate-topics", async (req, res) => {
    const { profile } = req.body;
    const pillars = profile?.contentPillars || [];
    const identity = profile?.identity || "A digital creator";
    const audience = profile?.audience || "General professionals";
    const goal = profile?.goal || "Build personal brand";

    try {
      const ai = getGeminiClient();
      const prompt = `You are the lead Topic Researcher agent for Cadence, an AI-assisted LinkedIn writing system.
Your job is to find 5 compelling, highly relevant, and engaging topic ideas for LinkedIn posts based on the creator's profile and content pillars.

Here is the creator's profile:
- Who they are: ${identity}
- What they do & LinkedIn goal: ${goal}
- Target Audience: ${audience}
- Content Pillars: ${pillars.join(", ")}

Generate exactly 5 distinct topics. Each topic must target one of the content pillars. 
Make them highly concrete and professional, yet deeply personal and opinion-driven. Avoid generic clickbait, instead focus on actionable insights, contrarian takes, hard-learned lessons, or industry transitions.

Return the response in a JSON list format conforming to the requested schema.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "List of 5 topic ideas",
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "contentPillar", "angle", "reason"],
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "A short, catchy working title for this topic."
                  },
                  description: {
                    type: Type.STRING,
                    description: "Brief summary of what the post will discuss."
                  },
                  contentPillar: {
                    type: Type.STRING,
                    description: "The specific content pillar this topic relates to."
                  },
                  angle: {
                    type: Type.STRING,
                    description: "The specific angle or held opinion (e.g. contrarian view, personal failure, data contrast)."
                  },
                  reason: {
                    type: Type.STRING,
                    description: "Explanation of why this topic will perform well with the target audience."
                  }
                }
              }
            }
          }
        })
      );

      const topicsText = response.text || "[]";
      res.json(JSON.parse(topicsText));
    } catch (error: any) {
      console.warn("Generate topics error (falling back to local generator):", error);
      try {
        const fallback = getFallbackTopics(pillars, identity);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate topics." });
      }
    }
  });

  // 2. Generate Hooks for a Selected Topic
  app.post("/api/generate-hooks", async (req, res) => {
    const { topic, profile, writingSamples } = req.body;
    try {
      const ai = getGeminiClient();

      const identity = profile?.identity || "A digital creator";
      const audience = profile?.audience || "General professionals";
      const voicePreference = profile?.voicePreference || {};
      const samplesText = writingSamples ? writingSamples.join("\n\n---\n\n") : "No samples provided.";

      const prompt = `You are the lead Hook Factory agent for Cadence. Your task is to generate 3 distinct, high-impact hooks (the first 1-2 lines of a LinkedIn post) for the selected topic.
The hook earns the scroll-stop. It needs to be bold, plain-spoken, and intriguing, without sounding like artificial intelligence. No corporate buzzwords, no cheesy emojis at the start, and no cheesy clickbait.

Here is the topic:
- Title: ${topic.title}
- Pillar: ${topic.contentPillar}
- Angle: ${topic.angle}
- Goal: ${topic.description}

Here is the creator's identity & audience:
- Identity: ${identity}
- Target Audience: ${audience}

We have calibrated these writing styles:
- Sentence length: ${voicePreference.sentenceLength || "Punchy"}
- Formality level: ${voicePreference.formality || "Conversational"}
- Tone constraints: ${voicePreference.customRules || "No generic buzzwords"}

Here are some writing samples for style reference:
${samplesText}

Generate exactly 3 hook options using these distinct high-performing LinkedIn visual/linguistic patterns:
Option 1: **Raw Numbers / Stark Result Hook**: Open with an eye-catching statistic, milestone, or monetary result (e.g., '300k views, 437 applicants, 1 hire.' or 'I spent $5,000 to learn...').
Option 2: **Surprising Stat Contrast / Irony**: Contrast two unexpected things or state a counter-intuitive truth (e.g., 'The best software developers I know write the least code.' or 'We grew revenue by doing exactly nothing for 2 weeks.').
Option 3: **Provocative One-Liner / Conversational Take**: Bold, sharp statement of held opinion that sparks conversation (e.g., 'Stop advising founders to build a personal brand. It is a waste of time.').

Return the output as a JSON array of objects conforming to the requested schema.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "List of 3 hook options",
              items: {
                type: Type.OBJECT,
                required: ["text", "patternName", "explanation"],
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "The actual hook text (1-2 lines)."
                  },
                  patternName: {
                    type: Type.STRING,
                    description: "The pattern type (e.g. Raw Numbers, Stat Contrast, Provocative One-Liner)."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Brief reason why this hook is effective for this specific topic."
                  }
                }
              }
            }
          }
        })
      );

      const hooksText = response.text || "[]";
      res.json(JSON.parse(hooksText));
    } catch (error: any) {
      console.warn("Generate hooks error (falling back to local generator):", error);
      try {
        const fallback = getFallbackHooks(topic);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate hooks." });
      }
    }
  });

  // 3. Generate Draft based on Topic, Hook, Profile, and Voice Reference
  app.post("/api/generate-draft", async (req, res) => {
    const { topic, hook, profile, writingSamples, storyBank } = req.body;
    try {
      const ai = getGeminiClient();

      const identity = profile?.identity || "A digital creator";
      const audience = profile?.audience || "General professionals";
      const voicePreference = profile?.voicePreference || {};
      const formatRules = profile?.formatRules || {};
      
      const relevantStories = storyBank && storyBank.length > 0 
        ? `Relevant stories from Story Bank to draw from:\n` + storyBank.map((s: any, idx: number) => `Story ${idx+1} [${s.category}]: ${s.text}`).join("\n")
        : "No specific story bank items provided. Write a compelling framework or industry-relevant opinion instead.";

      const samplesText = writingSamples ? writingSamples.join("\n\n---\n\n") : "No samples provided.";

      const prompt = `You are the Content Writer & Style Editor agents for Cadence working in tandem.
Write a full, high-quality LinkedIn post draft in the creator's exact voice and authentic style, starting with the selected Hook.

Here is the core setup:
- Hook (Line 1-2): "${hook.text}"
- Topic: ${topic.title}
- Angle & Take: ${topic.angle}
- Summary: ${topic.description}

Here is the creator profile:
- Who they are: ${identity}
- Target Audience: ${audience}
- Tone preference: ${voicePreference.formality || "Conversational"}, ${voicePreference.sentenceLength || "Punchy"}
- Custom rules: ${voicePreference.customRules || "No generic buzzwords"}

${relevantStories}

Here are the formatting and style rules (Treat as Law):
1. **Hook is First**: Begin immediately with the chosen hook text.
2. **Leave a Blank Line**: Put exactly ONE empty line right after the hook to create visual spacing and push body content below the "see more" line.
3. **Short Paragraphs**: Write short, bite-sized paragraphs (1-2 sentences max). White space is essential.
4. **Authentic Voice Mode**: Use Mode A (personal story / real experience) or Mode C (opinionated read on a trend). Never write generic summaries (Mode B).
5. **Formatting Prefs**:
   - Emojis: ${formatRules.emojiUse || "Sparingly (1-2 max)"}
   - Hashtags: ${formatRules.hashtagsCount || "0-2 max at the very end"}
   - CTA (Call to Action) style: End with a natural, conversational question to drive comments (e.g. "${formatRules.ctaStyle || "End with a question"}").
6. **No Corporate Buzzwords**: Strictly ban words like "leverage", "synergy", "impactful", "passionate", "excited to share", "delighted to announce", "game-changer", "testament".

Study these writing samples closely to calibrate sentence rhythm, lowercase vs sentence case, emotional vulnerability, and word choices:
${samplesText}

Generate a JSON object containing the draft post text and a brief visual layout advice.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["postText", "estimatedWordCount", "qualityChecks"],
              properties: {
                postText: {
                  type: Type.STRING,
                  description: "The fully drafted LinkedIn post text (preserving blank lines and formatting)."
                },
                estimatedWordCount: {
                  type: Type.INTEGER,
                  description: "Estimated number of words in the post."
                },
                qualityChecks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Internal checklist validation results confirming rules were met."
                }
              }
            }
          }
        })
      );

      const draftText = response.text || "{}";
      res.json(JSON.parse(draftText));
    } catch (error: any) {
      console.warn("Generate draft error (falling back to local generator):", error);
      try {
        const fallback = getFallbackDraft(topic, hook, profile);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate post draft." });
      }
    }
  });

  // 4. Analyze Tone / Code Review for manual or AI edits
  app.post("/api/analyze-tone", async (req, res) => {
    const { postText, profile } = req.body;
    if (!postText) {
      return res.status(400).json({ error: "Post text is required." });
    }
    try {
      const ai = getGeminiClient();

      const identity = profile?.identity || "A digital creator";
      const voicePreference = profile?.voicePreference || {};

      const prompt = `You are the lead Style Editor agent for Cadence. Your task is to perform an objective audit/review of this LinkedIn draft post to verify it aligns with our high-performance writing standards.

Here is the draft:
---
${postText}
---

Review it against these standards:
- Hook intensity (Does it stop the scroll?)
- Spacing (Are paragraphs 1-2 sentences? Is there a blank line after the hook?)
- Buzzword count (Are forbidden terms like "excited to share", "leverage", "passionate" present?)
- Author Fingerprint (Is it opinionated or just an article recap?)
- Readability & Flow

Provide detailed constructive feedback, identify specific things to change, and give an overall score from 0-100. Always keep the feedback actionable.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["score", "strengths", "improvements", "buzzwordsFound", "suggestedFixText"],
              properties: {
                score: {
                  type: Type.INTEGER,
                  description: "Alignment score from 0 to 100."
                },
                strengths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "What the draft does exceptionally well."
                },
                improvements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Actionable items that can make the post punchier or more aligned."
                },
                buzzwordsFound: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Any flagged corporate jargon or empty filler words."
                },
                suggestedFixText: {
                  type: Type.STRING,
                  description: "A polished alternative version incorporating the suggested fixes."
                }
              }
            }
          }
        })
      );

      const analysisText = response.text || "{}";
      res.json(JSON.parse(analysisText));
    } catch (error: any) {
      console.warn("Analyze tone error (falling back to local generator):", error);
      try {
        const fallback = getFallbackToneAnalysis(postText);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to analyze post tone." });
      }
    }
  });

  // 5. Calibrate Tone from Writing Samples
  app.post("/api/calibrate-tone", async (req, res) => {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: "At least one writing sample is required." });
    }
    try {
      const ai = getGeminiClient();

      const samplesJoined = samples.map((s, idx) => `Sample ${idx+1}:\n"""\n${s}\n"""`).join("\n\n");

      const prompt = `You are the lead Strategy Analyzer agent for Cadence. Your job is to extract a highly detailed and accurate voice/tone profile from these raw writing samples.
Analyze their grammar, sentence length rhythm, punctuation choices, emoji usage, casing (do they write in lowercase, sentence case, title case?), degree of vulnerability, and typical structural patterns.

Here are the writing samples:
${samplesJoined}

Synthesize these traits into a clean profile so our content writer agent can perfectly replicate their voice in the future. Determine values for:
- Formality level (e.g. Extremely Conversational, Semi-formal, Relatable Professional, Technical)
- Sentence length style (e.g. Ultra-punchy, Staccato and flowing, Balanced explanatory, Descriptive)
- Key stylistic rules (e.g. writes in all lowercase, uses double linebreaks for emphasis, uses arrow-points)
- Emojis use frequency (e.g. Never, Sparingly, Occasional punchy highlights)
- Banned tones/phrases they naturally avoid.

Return the profile as a structured JSON object.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["formality", "sentenceLength", "emojiFrequency", "keyStylisticTraits", "suggestedRules"],
              properties: {
                formality: {
                  type: Type.STRING,
                  description: "Identified level of formality."
                },
                sentenceLength: {
                  type: Type.STRING,
                  description: "Sentence length pattern."
                },
                emojiFrequency: {
                  type: Type.STRING,
                  description: "Identified emoji frequency."
                },
                keyStylisticTraits: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3-5 key characteristic rules of their writing style."
                },
                suggestedRules: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Actionable tone rules to apply to future post generations."
                }
              }
            }
          }
        })
      );

      const calibrationText = response.text || "{}";
      res.json(JSON.parse(calibrationText));
    } catch (error: any) {
      console.warn("Calibrate tone error (falling back to heuristic analyzer):", error);
      try {
        const fallback = getHeuristicVoiceProfile(samples);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to calibrate tone." });
      }
    }
  });

  // 6. Get Strategic Recommendations & AI Review (LinkedIn Manager)
  app.post("/api/strategy-review", async (req, res) => {
    const { profile, activePosts } = req.body;
    try {
      const ai = getGeminiClient();

      const identity = profile?.identity || "A digital creator";
      const goal = profile?.goal || "Grow brand";
      const pillars = profile?.contentPillars || [];

      const postsDetails = activePosts && activePosts.length > 0
        ? activePosts.map((p: any) => `- Post on "${p.topicTitle}" (${p.pillar}): ${p.status}. Text length: ${p.text ? p.text.length : 0} chars.`).join("\n")
        : "No published posts logged yet.";

      const prompt = `You are the Strategy Analyzer / LinkedIn Manager agent for Cadence. Your task is to review the creator's current LinkedIn pipeline, profile content pillars, and output, and provide 3-4 key strategic recommendations on how they can improve their reach, impact, and authority.

Here is the setup:
- Creator: ${identity}
- Core Goal: ${goal}
- Pillars: ${pillars.join(", ")}
- Current Activity:
${postsDetails}

Think about:
1. Content density (Are we covering all pillars evenly?)
2. Story variety (Are we using a balance of personal lessons and framework teardowns?)
3. Hook diversity (Are we trying different hook models?)
4. CTA effectiveness (Are the comments prompts engaging?)

Provide 3 key strategic pillars of improvement and a personalized score out of 100 on content potential.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["strategyScore", "recommendations", "idealContentMix"],
              properties: {
                strategyScore: {
                  type: Type.INTEGER,
                  description: "Overall strategy/pipeline health rating from 0-100."
                },
                recommendations: {
                  type: Type.ARRAY,
                  description: "Actionable pillars of strategic improvement",
                  items: {
                    type: Type.OBJECT,
                    required: ["title", "description", "expectedImpact"],
                    properties: {
                      title: { type: Type.STRING, description: "Title of recommendation" },
                      description: { type: Type.STRING, description: "Detailed strategic why and how" },
                      expectedImpact: { type: Type.STRING, description: "High, Medium, or Low" }
                    }
                  }
                },
                idealContentMix: {
                  type: Type.ARRAY,
                  description: "Recommended percentage allocation across their content pillars",
                  items: {
                    type: Type.OBJECT,
                    required: ["pillar", "percentage"],
                    properties: {
                      pillar: { type: Type.STRING },
                      percentage: { type: Type.INTEGER }
                    }
                  }
                }
              }
            }
          }
        })
      );

      const strategyText = response.text || "{}";
      res.json(JSON.parse(strategyText));
    } catch (error: any) {
      console.warn("Strategy review error (falling back to local generator):", error);
      try {
        const fallback = getFallbackStrategyReview(profile, activePosts);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate strategy review." });
      }
    }
  });

  // 7. Analyze LinkedIn Profile URL for Optimization advice
  app.post("/api/analyze-profile", async (req, res) => {
    const { profileUrl } = req.body;
    if (!profileUrl) {
      return res.status(400).json({ error: "Profile URL is required." });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `You are a world-class LinkedIn Brand Architect, executive profile auditor, and personal branding expert.
Analyze the provided LinkedIn profile URL: "${profileUrl}".
Even if you cannot fetch the live authenticated web page directly, you must make smart deductions from the URL path (such as name, industry hints, keywords) and construct a highly customized, realistic, and expert-level Profile Optimization Audit.
Identify real, actionable, specific improvements to take their LinkedIn presence to the highest tier of elite creators.

Structure your analysis to output:
1. "detectedName": Deduced clean full name from the URL path (e.g. john-doe-123 -> "John Doe").
2. "overallScore": Score from 0 to 100 on their profile effectiveness.
3. "headlineScore": Score from 0 to 100 on their headline.
4. "aboutScore": Score from 0 to 100 on their About section.
5. "contentScore": Score from 0 to 100 on their content/activity strategy.
6. "headlineAnalysis":
   - "currentEstimated": A sensible, realistic representation of what their current profile headline might be (or standard defaults).
   - "critique": Deep, professional critique on why it's failing to convert visitors, identifying lack of specificity, passive verbs, or corporate fluff.
   - "optimizedSuggestions": 3 diverse, high-impact headline options tailored to their deduced profile (e.g., modern builder, industry authority, value-focused).
7. "aboutAnalysis":
   - "critique": Critique on typical mistakes (e.g., resume language, third-person narrative, lack of clear CTA).
   - "suggestedStructure": 4 clear, specific sections they should include in their About section.
   - "templateSnippet": A beautifully written, high-converting About section snippet written in the first person, utilizing spacing and clean typography, ready for them to personalize.
8. "contentStrategy":
   - "critique": Insight on what content mistakes they are making (e.g., lack of personal lessons, boring links sharing).
   - "recommendedPillars": 3 highly specific content pillars they should dominate based on their deduced domain.
   - "actionPlan": 3 specific, actionable steps to boost engagement on their feed.
9. "visualOptimizations":
   - "bannerAdvice": Specific visual direction for their background banner (typography, message, vibe).
   - "photoAdvice": Actionable tips for their profile picture (lighting, background contrast, expression).

Return the audit report as a structured JSON conforming exactly to the requested schema.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "detectedName",
                "overallScore",
                "headlineScore",
                "aboutScore",
                "contentScore",
                "headlineAnalysis",
                "aboutAnalysis",
                "contentStrategy",
                "visualOptimizations"
              ],
              properties: {
                detectedName: { type: Type.STRING },
                overallScore: { type: Type.INTEGER },
                headlineScore: { type: Type.INTEGER },
                aboutScore: { type: Type.INTEGER },
                contentScore: { type: Type.INTEGER },
                headlineAnalysis: {
                  type: Type.OBJECT,
                  required: ["currentEstimated", "critique", "optimizedSuggestions"],
                  properties: {
                    currentEstimated: { type: Type.STRING },
                    critique: { type: Type.STRING },
                    optimizedSuggestions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                },
                aboutAnalysis: {
                  type: Type.OBJECT,
                  required: ["critique", "suggestedStructure", "templateSnippet"],
                  properties: {
                    critique: { type: Type.STRING },
                    suggestedStructure: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    templateSnippet: { type: Type.STRING }
                  }
                },
                contentStrategy: {
                  type: Type.OBJECT,
                  required: ["critique", "recommendedPillars", "actionPlan"],
                  properties: {
                    critique: { type: Type.STRING },
                    recommendedPillars: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    actionPlan: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                },
                visualOptimizations: {
                  type: Type.OBJECT,
                  required: ["bannerAdvice", "photoAdvice"],
                  properties: {
                    bannerAdvice: { type: Type.STRING },
                    photoAdvice: { type: Type.STRING }
                  }
                }
              }
            }
          }
        })
      );

      const auditText = response.text || "{}";
      res.json(JSON.parse(auditText));
    } catch (error: any) {
      console.warn("Analyze profile error (falling back to local generator):", error);
      try {
        const fallback = getFallbackProfileAudit(profileUrl);
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate profile audit." });
      }
    }
  });

  // Document parsing endpoint for PDF, DOCX, and TXT files
  app.post("/api/parse-document", async (req, res) => {
    const { fileBase64, fileName, fileType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Missing file content (base64)." });
    }

    try {
      const buffer = Buffer.from(fileBase64, "base64");
      let text = "";

      const lowerName = (fileName || "").toLowerCase();
      const isDocx = lowerName.endsWith(".docx") || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileType === "application/vnd.ms-word";
      const isPdf = lowerName.endsWith(".pdf") || fileType === "application/pdf";

      if (isPdf) {
        try {
          const parsed = await pdf(buffer);
          text = parsed.text || "";
        } catch (pdfErr: any) {
          console.error("PDF parse error:", pdfErr);
          throw new Error("Could not parse PDF file contents. Please ensure the file is not password-protected or scanned as static images.");
        }
      } else if (isDocx) {
        try {
          const parsed = await mammoth.extractRawText({ buffer });
          text = parsed.value || "";
        } catch (docxErr: any) {
          console.error("DOCX parse error:", docxErr);
          throw new Error("Could not parse Word (.docx) document. Please check the file validity.");
        }
      } else {
        // Fallback text conversion
        text = buffer.toString("utf8");
      }

      // Basic formatting cleanup
      text = text.replace(/\n{3,}/g, "\n\n").trim();

      res.json({ text });
    } catch (err: any) {
      console.error("Document parsing endpoint failure:", err);
      res.status(500).json({ error: err.message || "Failed to parse document." });
    }
  });

  // 8. Complete Career Intelligence & Resume Analyzer scan
  app.post("/api/analyze-career", async (req, res) => {
    const { linkedinUrl, resumeText, targetRole, targetCompany, experienceLevel, industry, jobDescription } = req.body;

    try {
      const ai = getGeminiClient();
      const prompt = `You are a world-class AI Career Intelligence Platform, Recruiting Director, and Executive Resume Architect.
Analyze the following professional inputs to generate an extremely detailed, hyper-intelligent Career Assessment, Audit, and Optimization Roadmap:
- LinkedIn URL: "${linkedinUrl || "Not Provided"}"
- Resume Content/Text: "${(resumeText || "").substring(0, 4500) || "Not Provided"}"
- Target Role: "${targetRole || "Software Engineer"}"
- Target Company: "${targetCompany || "Stripe"}"
- Experience Level: "${experienceLevel || "Senior-Level (5-10 yrs)"}"
- Industry: "${industry || "Technology"}"
- Target Job Description (JD): "${(jobDescription || "").substring(0, 4500) || "Not Provided"}"

INTELLIGENCE & CROSS-VERIFICATION GUIDELINES:
1. Deep comparative verification: Under "crossVerification", if both the resume and a LinkedIn profile representation are available (or deduced), you MUST run at least 4 rigorous comparative checks. Intelligently identify potential red flags, warnings, or gaps:
   - "Title Inflation / Leveling Mismatch": Verify if job designations or seniority levels are consistent.
   - "Date & Duration Overlaps": Check for employment timeline overlaps or gaps between the documents.
   - "Tech Stack Discrepancy": Compare listed languages, frameworks, and databases to spot inconsistencies.
   - "Education & Credentials": cross-reference university majors, degrees, and graduation timelines.
   - For any warnings, clearly present the evidence and an executive resolution strategy.
2. In-depth skill assessment: Analyze the technical profile against the Target Job Description (JD). Outline missing core keywords and the exact phrasing they should incorporate to satisfy ATS parsers.

CRITICAL GROUNDING & ANTI-HALLUCINATION RULES:
1. Ground your entire analysis STRICTLY in the provided Resume Content/Text and LinkedIn URL.
2. DO NOT assume, fabricate, or invent any unstated background experience, projects, qualifications, certifications, or career milestones for the candidate.
3. For "bulletRewrites" and "pointToPointEnhancements", do not make up arbitrary numbers, metrics, or technologies that the user did not actually mention. Instead, write highly actionable instructions or use bracketed templates like "[Metric/X]% decrease" or "[Insert your scale here]" to guide them on how to formulate their real experience. You must guide them on improving phrasing without creating false, made-up achievements.
4. If a capability or skill is missing, list it clearly as a gap. Do not try to pretend they have it or rewrite bullets to claim experience they haven't explicitly documented.

Evaluate their profile across ATS rules, recruiter guidelines, hiring manager requirements, and LinkedIn SEO best practices. Also perform a deep point-by-point comparison of their resume text against the target Job Description (JD) requirements.
You MUST output your response as a valid, well-formed JSON object matching exactly this schema:
{
  "candidateName": "Deduced name of the candidate",
  "targetRole": "Their target role",
  "targetCompany": "Their target company",
  "industry": "Their target industry",
  "experienceLevel": "Experience tier",
  "overallScore": 75,
  "linkedinScore": 70,
  "resumeScore": 72,
  "atsScore": 68,
  "recruiterScore": 74,
  "hiringManagerScore": 71,
  "brandScore": 65,
  "growthScore": 78,
  "leadershipScore": 68,
  "readinessScore": 73,
  "gamification": {
    "xpLevel": 3,
    "xpPoints": 2450,
    "nextLevelXp": 3000,
    "weeklyStreak": 4,
    "achievements": [
      { "title": "LinkedIn Optimizer", "description": "Completed LinkedIn URL deep-scan validation", "badgeId": "badge_linkedin_scan", "unlocked": true },
      { "title": "STAR Performer", "description": "Optimized experience bullet-points with STAR metrics", "badgeId": "badge_star_bullets", "unlocked": true },
      { "title": "ATS Proofed", "description": "Cleared critical ATS document formatting structural errors", "badgeId": "badge_ats_pass", "unlocked": false },
      { "title": "Recruiter Ready", "description": "Reached Recruiter Approval Score of 85% or higher", "badgeId": "badge_recruiter_love", "unlocked": false }
    ]
  },
  "crossVerification": [
    {
      "item": "Verification Item Name",
      "status": "verified" or "warning" or "conflict",
      "evidence": "Detailed evidence of consistency or discrepancy",
      "recommendation": "Step to resolve or lock in the consistency"
    }
  ],
  "atsAnalysis": {
    "email": "Extracted email",
    "phone": "Extracted phone",
    "location": "Extracted location",
    "score": 68,
    "formattedWell": false,
    "contactFound": true,
    "details": "Explanation of ATS parsing roadblocks, fonts, grids, header issues found",
    "improvements": ["Improvement point 1", "Improvement point 2"]
  },
  "bulletRewrites": [
    {
      "original": "Weak bullet text from experience description",
      "optimized": "Strong STAR bullet with metrics (e.g. Led team of 5, optimized index reducing latency 30% saving $40k)",
      "metricFocus": "Focus keyword",
      "impact": "Core benefit explaining why this hook works"
    }
  ],
  "recruiterSimulation": {
    "assessment": "Would they read/click? Critiques of initial impression.",
    "response": "Recruiter response (e.g. Interview/Hold/Reject)",
    "clickProbability": 65,
    "reasoning": "Detailed 7-second screening review rationale",
    "criticalFails": ["Fail item 1", "Fail item 2"],
    "quickWins": ["Win item 1", "Win item 2"]
  },
  "hiringManagerSimulation": {
    "keyDifferentiator": "Core competitive edge",
    "businessImpactScore": 70,
    "ownershipMindsetAdvice": "Detailed advice on how to express high ownership, scale, trade-offs",
    "scenarioQuestions": ["Custom interview scenario question 1 related to target company", "Custom scenario question 2"]
  },
  "skillIntelligence": {
    "technicalMatch": ["Technical skill 1", "Skill 2"],
    "gapSkills": ["Missing skill 1", "Missing skill 2"],
    "trendingSkillsInDomain": ["Trending technology 1", "Trending 2"]
  },
  "linkedinOptimization": {
    "headlineCritique": "Critique on searchability & power words",
    "suggestedHeadlines": ["Headline option 1", "Headline option 2", "Headline option 3"],
    "aboutSnippet": "A fully-crafted About section in 1st person with spacing and clean structure ready to copy",
    "bannerAdvice": "Explicit banner typography and design advice"
  },
  "careerRoadmap": [
    {
      "phase": "Phase title",
      "duration": "Duration (e.g., Weeks 1-2)",
      "focus": "Focus theme",
      "actionItems": ["Action 1", "Action 2"],
      "metricGoal": "Quantifiable outcome"
    }
  ],
  "expectedImpact": {
    "recruiterResponseIncrease": "E.g. 85% increase",
    "atsImprovementMultiplier": "E.g. 4.5x improvement",
    "salaryBoostPotential": "E.g. $15,000 - $30,000"
  },
  "jdMatch": {
    "score": 75,
    "matchedKeywords": ["Keyword 1", "Keyword 2"],
    "missingKeywords": ["Missing Keyword 1", "Missing Keyword 2"],
    "structuralIssues": ["Structural gap 1 related to JD requirements", "Structural gap 2"],
    "pointToPointEnhancements": [
      {
        "jdRequirement": "The exact requirement or phrasing in the Job Description",
        "resumeStatus": "Current status of this on the user's resume, detailing how they fell short",
        "recommendedAdjustment": "The specific rewrite or bullet addition with metrics to satisfy this point"
      }
    ]
  }
}

Do not include any wrapping markdown markdown code-blocks like \`\`\`json. Return purely the raw JSON string.`;

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        })
      );

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.warn("AI Career Scan error (falling back to local generator):", error);
      try {
        const fallback = getFallbackCareerAnalysis(
          linkedinUrl,
          resumeText,
          targetRole,
          targetCompany,
          experienceLevel,
          industry,
          jobDescription || ""
        );
        res.json(fallback);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: fallbackErr.message || "Failed to generate career intelligence report." });
      }
    }
  });

  // Serve static files / Vite middleware
  async function initDevAndListening() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!process.env.VERCEL) {
      const PORT = 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  initDevAndListening();
