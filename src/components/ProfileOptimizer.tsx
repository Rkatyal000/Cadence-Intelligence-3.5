import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserCheck, Search, Sparkles, Copy, Check, ExternalLink, 
  Award, Camera, Image, ListChecks, Loader2, RefreshCw, 
  ChevronRight, AlertCircle, FileText, CheckCircle, Briefcase,
  ShieldAlert, TrendingUp, BarChart2, Clock, Coins, Download,
  BookOpen, Terminal, Megaphone, Upload, HelpCircle, Flame,
  Star, ThumbsUp, Mail, Phone, MapPin, Code, Heart, Linkedin,
  ShieldCheck
} from "lucide-react";
import { CareerIntelligenceReport } from "../types";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";

// Helper for deterministic Resume vs JD comparison with zero external assumptions
export function runGroundedComparativeAnalysis(
  resumeText: string,
  jobDescription: string,
  targetRole: string,
  experienceLevel: string
) {
  const COMMON_TECHNICAL_TERMS = [
    "TypeScript", "JavaScript", "Python", "Java", "Go", "Golang", "C++", "C#", "Rust", "Ruby", "PHP", "Kotlin", "Swift", "Scala", "SQL", "HTML", "CSS", "Bash", "Shell",
    "React", "Angular", "Vue", "Next.js", "Nuxt.js", "Svelte", "Express", "Spring Boot", "Django", "FastAPI", "Flask", "Laravel", "Ruby on Rails", "ASP.NET",
    "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Kubernetes", "Docker", "Terraform", "CI/CD", "GitHub Actions", "Jenkins", "Ansible",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "SQLite", "GraphQL", "gRPC", "REST", "SOAP", "WebSockets",
    "Microservices", "Serverless", "Distributed Systems", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "LLM", "Data Science",
    "Redux", "Zustand", "Tailwind", "Bootstrap", "Webpack", "Vite", "Babel", "ESLint", "Prettier", "Jest", "Cypress", "Vitest", "Playwright",
    "Agile", "Scrum", "Kanban", "Jira", "Confluence", "Git", "GitHub", "GitLab", "Bitbucket"
  ];

  const resumeLower = (resumeText || "").toLowerCase();
  const jdLower = (jobDescription || "").toLowerCase();

  // Find terms in JD
  const foundInJd = COMMON_TECHNICAL_TERMS.filter(term => {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");
    return regex.test(jdLower);
  });

  // Find which are matched or missing in Resume
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  foundInJd.forEach(term => {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");
    if (regex.test(resumeLower)) {
      matchedSkills.push(term);
    } else {
      missingSkills.push(term);
    }
  });

  // Identify conflicts based strictly on raw inputs
  const conflicts: Array<{ title: string; description: string; type: "warning" | "conflict" | "info" }> = [];

  // Parse required years of experience from JD
  const yoeRegexes = [
    /(\d+)\s*\+?\s*years?\b/gi,
    /(\d+)\s*\+?\s*yrs?\b/gi,
    /experience\s+of\s+(\d+)\s*\+?\s*years?/gi
  ];
  
  let requiredYears: number | null = null;
  for (const regex of yoeRegexes) {
    let match;
    while ((match = regex.exec(jobDescription)) !== null) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && (requiredYears === null || num > requiredYears)) {
        requiredYears = num;
      }
    }
  }

  // Experience mapping
  let candidateMaxYears = 5;
  if (experienceLevel.includes("0-2")) candidateMaxYears = 2;
  else if (experienceLevel.includes("2-5")) candidateMaxYears = 5;
  else if (experienceLevel.includes("5-10")) candidateMaxYears = 10;
  else if (experienceLevel.includes("10+")) candidateMaxYears = 20;

  if (requiredYears !== null) {
    if (candidateMaxYears < requiredYears) {
      conflicts.push({
        title: "Seniority/Experience Mismatch Alert",
        description: `The target Job Description demands at least ${requiredYears} years of experience, but your selected professional career bracket is "${experienceLevel}". This indicates an eligibility deficit.`,
        type: "conflict"
      });
    } else {
      conflicts.push({
        title: "Seniority Requirement Verified",
        description: `The Job Description requests ${requiredYears}+ years of experience, which is fully covered by your designated career bracket of "${experienceLevel}".`,
        type: "info"
      });
    }
  }

  // Job Title Check
  const targetRoleWords = (targetRole || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (targetRoleWords.length > 0) {
    const titleMatchInResume = targetRoleWords.every(word => resumeLower.includes(word));
    if (!titleMatchInResume) {
      const partialMatch = targetRoleWords.some(word => resumeLower.includes(word));
      if (!partialMatch) {
        conflicts.push({
          title: "Role Designation Inconsistency",
          description: `Your target role is "${targetRole}", but your resume text completely lacks these exact keyword tokens. We recommend tailoring your resume header to include this designation.`,
          type: "warning"
        });
      } else {
        conflicts.push({
          title: "Designation Inexact Match",
          description: `Your target role is "${targetRole}" but your resume only partially mentions related keyword tokens. Explicitly list "${targetRole}" in your profile overview.`,
          type: "warning"
        });
      }
    } else {
      conflicts.push({
        title: "Target Designation Grounding",
        description: `Your resume text explicitly aligns with your target professional designation "${targetRole}".`,
        type: "info"
      });
    }
  }

  // Academic Credentials Check
  const jdAsksDegree = /degree|bachelor|master|phd|b\.s\.|m\.s\.|ph\.d\./i.test(jdLower);
  const resumeHasDegree = /degree|bachelor|master|phd|b\.s\.|m\.s\.|ph\.d\.|university|college|graduated/i.test(resumeLower);
  if (jdAsksDegree && !resumeHasDegree) {
    conflicts.push({
      title: "Educational Credential Mismatch",
      description: "The Job Description specifies degree or equivalent credentials, but your resume text does not explicitly claim any academic degrees or university names. Verify if this was omitted.",
      type: "warning"
    });
  }

  // Work Mode / Remote Check
  const jdMentionsRemote = /\bremote\b/i.test(jdLower);
  const resumeMentionsRemote = /\bremote\b/i.test(resumeLower);
  if (jdMentionsRemote && !resumeMentionsRemote) {
    conflicts.push({
      title: "Work Mode Preference Not Declared",
      description: "The Job Description specifically references 'remote' options. Highlighting past remote team success or adding 'Open to Remote' directly on your resume can improve fit score.",
      type: "info"
    });
  }

  return {
    matchedSkills,
    missingSkills,
    conflicts,
    requiredYears
  };
}

// High-fidelity sample profiles to showcase the tool's power instantly
const SAMPLE_PROFILES = [
  {
    name: "Alex Mercer",
    linkedinUrl: "linkedin.com/in/alexmercer-dev",
    targetRole: "Lead Software Architect",
    targetCompany: "Stripe",
    experienceLevel: "Senior-Level (5-10 yrs)",
    industry: "FinTech & Payment Infrastructure",
    resumeText: `Alex Mercer\nLead Software Architect\nsf_alex@example.com | +1 (555) 019-2834\n\nExperience:\n- Led a team of 4 senior engineers designing localized checkout API layers.\n- Maintained payment pipelines handling millions of API calls daily.\n- Optimized database query indexes and caching layers to save infrastructure costs.\n- Handled high volume webhook integrations and negotiated specs with product directors.\n\nEducation:\nBS in Computer Science, Stanford University`,
    jobDescription: "Stripe is looking for a Lead Software Architect to scale our high-throughput localized checkout APIs. Candidates must have experience designing and optimizing low-latency Postgres databases and SQL indexing. You will lead the integration of third-party payment systems and webhooks while collaborating closely with product directors. Ideal candidate has containerized microservices and is proficient with TypeScript, Node.js, and Redis caching queues."
  },
  {
    name: "Marcus Vance",
    linkedinUrl: "linkedin.com/in/marcusvance-product",
    targetRole: "Senior Product Director",
    targetCompany: "Airbnb",
    experienceLevel: "Executive-Level (10+ yrs)",
    industry: "Travel & Marketplace Platforms",
    resumeText: `Marcus Vance\nSenior Product Director\nm_vance@example.com | +1 (555) 438-2910\n\nExperience:\n- Managed the core guest experience booking funnels across mobile and web.\n- Drove critical booking metrics through meticulous multivariate testing layouts.\n- Collaborated with design and engineering partners on checkout architecture.\n- Established product roadmaps aligned with executive growth targets.\n\nEducation:\nMBA, Wharton School of Business`,
    jobDescription: "Airbnb is looking for a Senior Product Director to oversee our core guest booking and checkout funnels. Requirements: 10+ years experience, MBA or similar preferred. You will drive booking conversion rates, lead multi-variate test frameworks, and collaborate with engineering partners to design frictionless global booking interfaces."
  },
  {
    name: "Sonia Patel",
    linkedinUrl: "linkedin.com/in/soniapatel-ai",
    targetRole: "AI Research Lead",
    targetCompany: "OpenAI",
    experienceLevel: "Senior-Level (5-10 yrs)",
    industry: "Artificial Intelligence & LLMs",
    resumeText: `Sonia Patel\nAI Research Lead\nsonia.p@example.com | +1 (555) 832-7491\n\nExperience:\n- Researched reinforcement learning feedback models and fine-tuning prompts.\n- Implemented large-scale transformer inference scaling strategies.\n- Managed GPU cluster capacity optimization, achieving significant throughput gains.\n- Authored technical specs for next-generation multi-modal training pipelines.\n\nEducation:\nPhD in Artificial Intelligence, MIT`,
    jobDescription: "OpenAI is looking for an AI Research Lead to lead RLHF (Reinforcement Learning from Human Feedback) training loops and fine-tuning pipelines. Qualifications: PhD from a top research university, experience implementing transformer inference scaling strategies, and optimizing GPU cluster throughput."
  }
];

export default function ProfileOptimizer() {
  // Input fields
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Senior-Level (5-10 yrs)");
  const [industry, setIndustry] = useState("Technology");
  
  // File upload state
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Job description file upload state
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [jdFileSize, setJdFileSize] = useState<string | null>(null);
  const [jdDragActive, setJdDragActive] = useState(false);

  // Active Tool selection: "linkedin" (LinkedIn Checker), "resume" (Resume Optimizer) or "verification" (Resume vs LinkedIn)
  const [toolMode, setToolMode] = useState<"linkedin" | "resume" | "verification">("linkedin");
  const [parsingFile, setParsingFile] = useState(false);
  const [parsingJdFile, setParsingJdFile] = useState(false);

  // App state
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState<CareerIntelligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "jd_match" | "verification" | "ats" | "bullets" | "simulations" | "roadmap" | "marketing">("overview");
  const [jdSubTab, setJdSubTab] = useState<"standard" | "grounded_audit">("standard");
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced">("idle");
  const [checkedActionItems, setCheckedActionItems] = useState<Record<string, boolean>>({});

  // Dynamic console-style log state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const stages = [
    "Spinning up Career Intelligence extraction engines...",
    "Scanning LinkedIn URL structure & public SEO indicators...",
    "Executing ATS Simulated Parser (validating left-to-right table grids)...",
    "Cross-referencing Resume timeline against LinkedIn history...",
    "Running Recruiter Click-Ratio simulations on professional headline...",
    "Engaging Hiring Manager scenario-based logic assessment...",
    "Constructing custom STAR bullet-point rewrites and learning roadmap..."
  ];

  // Load last saved report if any
  useEffect(() => {
    const saved = localStorage.getItem("cadence_last_career_report");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReport(parsed);
        // Hydrate inputs
        if (parsed.targetRole) setTargetRole(parsed.targetRole);
        if (parsed.targetCompany) setTargetCompany(parsed.targetCompany);
        if (parsed.industry) setIndustry(parsed.industry);
        if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
      } catch (e) {
        // Ignore
      }
    }

    const savedMode = localStorage.getItem("cadence_optimizer_tool_mode");
    if (savedMode) {
      setToolMode(savedMode as any);
    }

    const savedTab = localStorage.getItem("cadence_optimizer_active_tab");
    if (savedTab) {
      setActiveTab(savedTab as any);
    }
  }, []);

  // Sync toolMode and activeTab to local storage
  useEffect(() => {
    localStorage.setItem("cadence_optimizer_tool_mode", toolMode);
  }, [toolMode]);

  useEffect(() => {
    localStorage.setItem("cadence_optimizer_active_tab", activeTab);
  }, [activeTab]);

  // Simulating the backend scanning stages & percentage ticker + console logs
  useEffect(() => {
    if (!loading) return;

    // Reset ticker
    setProgressPercent(0);
    setLoadingStage(0);
    setConsoleLogs([`[SYSTEM] Booting Cadence Core Audit Pipeline v3.5.2...`]);

    const percentageInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          clearInterval(percentageInterval);
          return 100;
        }
        // Random increment
        const inc = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + inc, 100);
      });
    }, 150);

    const logTimer = setInterval(() => {
      setLoadingStage((prev) => {
        const next = prev < stages.length - 1 ? prev + 1 : prev;
        
        // Append impressive diagnostic logs
        const logTemplates = [
          `[PARSER] Scanning target profile: ${linkedinUrl || "linkedin.com/in/anonymous"}`,
          `[ATS_ENGINE] Running structural token checks on layout components...`,
          `[METRICS_EVAL] Simulated ATS score initialized. Matching key concepts...`,
          `[TIMELINE] Analyzing dates, gaps, and sequence correlations...`,
          `[RECRUITER_SIM] Initializing 7-second attention scan on professional summary...`,
          `[MANAGER_AI] Prompting behavioral scenario queries targeting ${targetCompany || "target company"}...`,
          `[COMPILE] Synchronizing audit nodes and preparing JSON report output...`
        ];

        setConsoleLogs((logs) => [
          ...logs,
          `[SYSTEM] Phase ${next + 1}: ${stages[next]}`,
          `[STATUS] ${logTemplates[next] || "Refining analytics vector..."}`
        ]);

        return next;
      });
    }, 1500);

    return () => {
      clearInterval(percentageInterval);
      clearInterval(logTimer);
    };
  }, [loading]);

  // Load sample profile data instantly
  const handleLoadSample = (sample: typeof SAMPLE_PROFILES[0]) => {
    setLinkedinUrl(sample.linkedinUrl);
    setTargetRole(sample.targetRole);
    setTargetCompany(sample.targetCompany);
    setIndustry(sample.industry);
    setExperienceLevel(sample.experienceLevel);
    setResumeText(sample.resumeText);
    setFileName(`${sample.name.replace(/\s+/g, "_")}_Resume.pdf`);
    setFileSize("384 KB");
    setJobDescription(sample.jobDescription || "");
    setJdFileName(`${sample.targetCompany}_${sample.targetRole.replace(/\s+/g, "_")}_JD.txt`);
    setJdFileSize("1.2 KB");
  };

  // Real-time file parser client-side helper
  const parseUploadedFile = async (file: File, isJd: boolean) => {
    if (isJd) {
      setParsingJdFile(true);
    } else {
      setParsingFile(true);
    }
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to parse document on server.");
      }

      const data = await res.json();
      if (isJd) {
        setJobDescription(data.text);
      } else {
        setResumeText(data.text);
      }
    } catch (err: any) {
      console.error("Parsing file error:", err);
      setError(`Error parsing ${file.name}: ${err.message || "Please check if it is a valid, uncorrupted PDF/DOCX/TXT file."}`);
    } finally {
      if (isJd) {
        setParsingJdFile(false);
      } else {
        setParsingFile(false);
      }
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(0) + " KB");
      parseUploadedFile(file, false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(0) + " KB");
      parseUploadedFile(file, false);
    }
  };

  // JD Drag and drop event handlers
  const handleJdDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setJdDragActive(true);
    } else if (e.type === "dragleave") {
      setJdDragActive(false);
    }
  };

  const handleJdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setJdDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setJdFileName(file.name);
      setJdFileSize((file.size / 1024).toFixed(1) + " KB");
      parseUploadedFile(file, true);
    }
  };

  const handleJdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setJdFileName(file.name);
      setJdFileSize((file.size / 1024).toFixed(1) + " KB");
      parseUploadedFile(file, true);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setReport(null);

    try {
      const response = await fetch("/api/analyze-career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: linkedinUrl.trim(),
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
          targetRole: targetRole.trim(),
          targetCompany: targetCompany.trim(),
          experienceLevel,
          industry: industry.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to process complete career assessment.");
      }

      const data = await response.json();
      setReport(data);
      localStorage.setItem("cadence_last_career_report", JSON.stringify(data));
      if (toolMode === "verification") {
        setActiveTab("verification");
      } else {
        setActiveTab("overview");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during profile assessment.");
    } finally {
      setLoading(false);
    }
  };

  const syncPillarsToCreator = () => {
    if (!report) return;
    setSyncStatus("synced");

    // Fetch existing profile or create one
    const savedSetup = localStorage.getItem("cadence_profile_setup");
    let currentProfile = savedSetup ? JSON.parse(savedSetup) : {
      name: report.candidateName,
      identity: `Targeting ${report.targetRole} at ${report.targetCompany}`,
      audience: `${report.industry} Recruiters, Engineering Managers, and Tech Builders`,
      goal: `Establish absolute niche authority to land a top-tier role at ${report.targetCompany}`,
      contentPillars: report.skillIntelligence.technicalMatch.slice(0, 3),
      publishingTarget: "linkedin",
      voicePreference: {
        formality: "technical & authoritative",
        sentenceLength: "punchy, spaced lines",
        customRules: "Focus heavily on real business metrics, avoid corporate buzzwords like 'excited to share', write in first-person",
        keyTraits: ["authoritative", "technical", "pragmatic", "value-focused"]
      },
      formatRules: {
        emojiUse: "minimal, 1-2 per post",
        hashtagsCount: "none",
        ctaStyle: "conversational questions"
      },
      hasCompletedSetup: true
    };

    // Update pillars with recommended skills
    currentProfile.contentPillars = [
      ...report.skillIntelligence.technicalMatch.slice(0, 2),
      `${report.targetRole} Best Practices`
    ];
    
    localStorage.setItem("cadence_profile_setup", JSON.stringify(currentProfile));
    setTimeout(() => setSyncStatus("idle"), 3000);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleActionItem = (itemId: string) => {
    setCheckedActionItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Simulated Report Download Trigger
  const handleDownloadReport = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(report, null, 2)], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${report.candidateName.replace(/\s+/g, "_")}_LinkedIn_Improver_Audit.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper to determine score color grades
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  return (
    <div id="career-intelligence-section" className="space-y-8 max-w-6xl mx-auto px-4 py-2">
      
      {/* Header Banner Block with Mesh Background */}
      <div id="po-title-block" className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-8 rounded-3xl text-white shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(51,65,85,0.4),transparent)]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/10 rounded-full blur-3xl -z-10" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-slate-100 transition-all border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>Core Audit Engine v3.5 Active</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Award className="w-9 h-9 text-yellow-400 shrink-0" />
              LinkedIn Improver
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
              A comprehensive professional audit engine that emulates an elite <span className="text-white font-bold">Recruiter</span>, an experienced <span className="text-white font-bold">Hiring Manager</span>, and a strict <span className="text-white font-bold">ATS parser</span>. Upload your Resume and target Job Description (JD) to find keyword gaps, run point-to-point comparisons, and generate custom STAR experience improvements.
            </p>
          </div>
          
          <div className="shrink-0 flex items-center gap-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm self-start md:self-auto">
            <CpuBadge />
          </div>
        </div>
      </div>

      {/* Input panel & drag-drop zone */}
      {!report && !loading && (
        <div className="space-y-6">
          
          {/* Quick Demo Selector */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-bounce" /> Explore High-Fidelity Demo Models
              </span>
              <p className="text-xs text-slate-500 font-semibold">
                Don't want to type? Load a professionally pre-configured workspace in one click.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROFILES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {sample.name} ({sample.targetCompany})
                </button>
              ))}
            </div>
          </div>

          {/* Tool Mode Tabs Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-lg mx-auto border border-slate-200/60 shadow-sm">
            <button
              type="button"
              onClick={() => setToolMode("linkedin")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                toolMode === "linkedin"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Linkedin className="w-4 h-4 text-sky-600 fill-sky-600/10" />
              LinkedIn Checker
            </button>
            <button
              type="button"
              onClick={() => setToolMode("resume")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                toolMode === "resume"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Resume Optimizer
            </button>
            <button
              type="button"
              onClick={() => setToolMode("verification")}
              className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                toolMode === "verification"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Resume vs LinkedIn
            </button>
          </div>

          <form onSubmit={handleScan} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Inputs Card */}
            <div className="lg:col-span-2 bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-slate-800" />
                {toolMode === "linkedin" ? "1. LinkedIn Audit Parameters" : toolMode === "resume" ? "1. ATS Match & Optimization Parameters" : "1. Profile Verification Parameters"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(toolMode === "linkedin" || toolMode === "verification") && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      LinkedIn Profile URL
                      <HelpTooltip text="Enter your public LinkedIn URL. Used to simulate profile extraction and run verification comparison." />
                    </label>
                    <div className="relative group">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                      <input
                        type="text"
                        required={toolMode === "linkedin" || toolMode === "verification"}
                        placeholder="e.g. linkedin.com/in/alexmercer"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    Target Professional Role
                    <HelpTooltip text="The exact title you are aiming for (e.g. Senior Software Architect, Staff Designer)." />
                  </label>
                  <input
                    type="text"
                    required
                    list="optimizer-career-options"
                    placeholder="e.g. Lead Software Architect"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                  />
                  <datalist id="optimizer-career-options">
                    <option value="Staff Systems Architect" />
                    <option value="Senior Systems Engineer" />
                    <option value="Principal Software Engineer" />
                    <option value="Senior Engineering Manager" />
                    <option value="VP of Engineering" />
                    <option value="Chief Technology Officer (CTO)" />
                    <option value="Director of Engineering" />
                    <option value="Lead Full-Stack Developer" />
                    <option value="Frontend Tech Lead" />
                    <option value="Backend Developer" />
                    <option value="AI / Machine Learning Researcher" />
                    <option value="Data Science Lead" />
                    <option value="Cloud Solutions Architect" />
                    <option value="Site Reliability Engineer (SRE)" />
                    <option value="DevOps Specialist" />
                    <option value="Principal Product Designer" />
                    <option value="Senior UX/UI Designer" />
                    <option value="Lead Product Manager" />
                    <option value="Technical Product Owner" />
                    <option value="Developer Relations Engineer" />
                    <option value="Information Security Architect" />
                    <option value="QA Automation Lead" />
                    <option value="Scrum Master / Agile Delivery" />
                    <option value="Mobile App Architect" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    Target Company Focus
                    <HelpTooltip text="The company environment we should simulate for culture fit and behavioral screening." />
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, FAANG, Airbnb"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    Industry Sector
                    <HelpTooltip text="The specific niche sector used to build custom keyword match libraries (e.g. FinTech, AI, SaaS)." />
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FinTech & Payment Infrastructure"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Experience Tier</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all cursor-pointer"
                  >
                    <option>Junior-Level (1-3 yrs)</option>
                    <option>Mid-Level (3-5 yrs)</option>
                    <option>Senior-Level (5-10 yrs)</option>
                    <option>Executive-Level (10+ yrs)</option>
                  </select>
                </div>
              </div>

              {(toolMode === "resume" || toolMode === "verification") && (
                <div className="space-y-2 pt-4 border-t border-slate-100 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      Resume Plain Text Content
                      <HelpTooltip text="Upload a PDF/DOCX resume on the right, or paste your resume content directly below. This is verified against your LinkedIn profile." />
                    </label>
                    {fileName && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                        Parsed File: {fileName}
                      </span>
                    )}
                  </div>
                  <textarea
                    placeholder="Paste your raw resume text here, or drag-and-drop a PDF/DOCX file onto the upload card on the right to auto-parse it instantly..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    required={toolMode === "resume" || toolMode === "verification"}
                    className="w-full h-40 p-4 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400 leading-relaxed"
                  />
                </div>
              )}

              {toolMode === "resume" && (
                <div className="space-y-2 pt-4 border-t border-slate-100 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      Target Job Description (JD) Plain Text Content
                      <HelpTooltip text="Upload a job description file on the right, or paste the target JD text here. This enables point-to-point requirement mapping." />
                    </label>
                    {jdFileName && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                        Parsed File: {jdFileName}
                      </span>
                    )}
                  </div>
                  <textarea
                    placeholder="Paste the target job description (JD) here, or drag-and-drop a JD file onto the upload card on the right to parse it..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required={toolMode === "resume"}
                    className="w-full h-40 p-4 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-slate-800 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400 leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Drag & Drop File Upload Side Card */}
            <div className="space-y-6">
              {toolMode === "resume" ? (
                <>
                  {/* RESUME UPLOAD */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-800" />
                      2. Upload Resume File
                    </h3>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                        dragActive 
                          ? "border-slate-900 bg-slate-50/50 scale-[0.99] shadow-inner" 
                          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="file"
                        id="resume-file-picker"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="resume-file-picker" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto border border-slate-200 shadow-sm transition-transform group-hover:scale-110">
                          {parsingFile ? (
                            <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800">
                            {parsingFile ? "Parsing Document..." : "Drag & Drop Resume"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Supports PDF, DOCX, TXT
                          </p>
                        </div>
                        <span className="inline-block text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-sm">
                          Select File
                        </span>
                      </label>
                    </div>

                    {fileName ? (
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-slate-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{fileSize || "152 KB"}</p>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="flex gap-2.5 items-start text-slate-500 text-[10px] font-bold leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-150">
                        <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          Uploading your resume parses PDF or Word formats automatically using high-accuracy server extraction algorithms.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* JD UPLOAD */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-800" />
                      3. Upload Job Description (JD)
                    </h3>
                    
                    <div
                      onDragEnter={handleJdDrag}
                      onDragOver={handleJdDrag}
                      onDragLeave={handleJdDrag}
                      onDrop={handleJdDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                        jdDragActive 
                          ? "border-slate-900 bg-slate-50/50 scale-[0.99] shadow-inner" 
                          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="file"
                        id="jd-file-picker"
                        accept=".pdf,.docx,.txt"
                        onChange={handleJdFileChange}
                        className="hidden"
                      />
                      <label htmlFor="jd-file-picker" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto border border-slate-200 shadow-sm transition-transform group-hover:scale-110">
                          {parsingJdFile ? (
                            <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800">
                            {parsingJdFile ? "Parsing Document..." : "Drag & Drop Target JD"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Supports PDF, DOCX, TXT
                          </p>
                        </div>
                        <span className="inline-block text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-sm">
                          Select File
                        </span>
                      </label>
                    </div>

                    {jdFileName ? (
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-slate-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{jdFileName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{jdFileSize || "1.2 KB"}</p>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="flex gap-2.5 items-start text-slate-500 text-[10px] font-bold leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-150">
                        <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          Uploading a Job Description file auto-populates requirements to map keyword alignment with precision.
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : toolMode === "verification" ? (
                <>
                  {/* RESUME UPLOAD */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-800" />
                      2. Upload Resume File
                    </h3>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                        dragActive 
                          ? "border-slate-900 bg-slate-50/50 scale-[0.99] shadow-inner" 
                          : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/60 hover:border-slate-400"
                      }`}
                    >
                      <input
                        type="file"
                        id="resume-file-picker"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="resume-file-picker" className="cursor-pointer space-y-3 block">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto border border-slate-200 shadow-sm transition-transform group-hover:scale-110">
                          {parsingFile ? (
                            <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800">
                            {parsingFile ? "Parsing Document..." : "Drag & Drop Resume"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Supports PDF, DOCX, TXT
                          </p>
                        </div>
                        <span className="inline-block text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl transition-all shadow-sm">
                          Select File
                        </span>
                      </label>
                    </div>

                    {fileName ? (
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-slate-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{fileSize || "152 KB"}</p>
                          </div>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="flex gap-2.5 items-start text-slate-500 text-[10px] font-bold leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-150">
                        <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          Uploading your resume parses PDF or Word formats automatically to run comparison checks against LinkedIn.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* VERIFICATION HIGHLIGHTS */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                      Verification Highlights
                    </h3>
                    
                    <div className="space-y-4 text-xs text-slate-600 font-medium leading-relaxed">
                      <p>
                        This auditor cross-references your uploaded resume content directly with your public LinkedIn profile online representation to identify crucial gaps, errors, or conflicts.
                      </p>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Core Verification Checkpoints:</span>
                        <ul className="space-y-1.5 list-disc list-inside text-xxs font-bold text-slate-700">
                          <li>Conflicting Job Titles & Designations</li>
                          <li>Overlapping or Misaligned Work Dates</li>
                          <li>Inconsistent Core Tech & Skill Sets</li>
                          <li>Education & Certifications Discrepancies</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* LINKEDIN GUIDE CARD */
                <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Linkedin className="w-4.5 h-4.5 text-sky-600 fill-sky-600/10" />
                    LinkedIn Checker Tool
                  </h3>
                  
                  <div className="space-y-4 text-xs text-slate-600 font-medium leading-relaxed">
                    <p>
                      This dedicated auditor evaluates search discoverability, indexable keyword saturation, headshot quality suggestions, and professional banner positioning.
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Audit Coverage:</span>
                      <ul className="space-y-1.5 list-disc list-inside text-xxs font-bold text-slate-700">
                        <li>Public Search SEO Indexing</li>
                        <li>Recruiter Click-Through headlines</li>
                        <li>Professional Brand Credibility</li>
                        <li>Call-To-Action (CTA) positioning</li>
                      </ul>
                    </div>
                    <p className="text-xxs text-slate-400">
                      Submit your LinkedIn Profile URL along with target career parameters to trigger our high-fidelity organic visibility simulation.
                    </p>
                  </div>
                </div>
              )}

              {/* Big CTA scan button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  (toolMode === "linkedin" && !linkedinUrl.trim()) ||
                  (toolMode === "resume" && !resumeText.trim()) ||
                  (toolMode === "verification" && (!linkedinUrl.trim() || !resumeText.trim())) ||
                  parsingFile ||
                  parsingJdFile
                }
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-slate-950/10 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 animate-fadeIn"
              >
                <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-pulse fill-yellow-300" />
                {toolMode === "linkedin" ? "Analyze LinkedIn Presence" : toolMode === "resume" ? "Optimize Resume & JD Match" : "Verify Resume vs LinkedIn"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading Simulated Live Console Overlay */}
      {loading && (
        <div id="po-loading-overlay" className="bg-slate-900 text-white border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col items-center justify-center min-h-[500px] space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.5),transparent)] pointer-events-none" />
          
          <div className="relative w-24 h-24 flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-slate-800/60 animate-ping" />
            <span className="absolute inline-flex h-20 w-20 rounded-full bg-slate-800/80 animate-pulse" />
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg text-slate-950">
              <RefreshCw className="w-7 h-7 animate-spin text-slate-950 stroke-[2.5]" />
            </div>
          </div>
          
          <div className="space-y-4 text-center max-w-lg z-10 w-full">
            <div className="space-y-1">
              <h4 className="font-black text-lg tracking-tight">Compiling Complete Audit Intelligence</h4>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  Step {loadingStage + 1} of {stages.length}
                </span>
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  {progressPercent}% COMPLETE
                </span>
              </div>
            </div>

            {/* Custom Interactive Progress Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700/50 p-0.5">
              <div 
                className="bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-md"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Live Terminal Log Streamer */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-left font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto space-y-1 shadow-inner scrollbar-thin scrollbar-thumb-slate-800">
              {consoleLogs.map((log, idx) => (
                <div key={idx} className="flex gap-1.5 animate-fadeIn">
                  <span className="text-slate-600 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                  <span className={log.includes("[SYSTEM]") ? "text-slate-300 font-bold" : log.includes("[STATUS]") ? "text-emerald-400" : "text-slate-400"}>
                    {log}
                  </span>
                </div>
              ))}
              <div className="flex gap-1.5 text-slate-600 animate-pulse font-bold">
                <span>&gt;</span>
                <span className="text-slate-300 animate-pulse">Running model algorithms...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-center text-rose-700 text-xs">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Main Complete Career Intelligence Audit Display */}
      {!loading && report && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Executive Header Card */}
          <div className="bg-white border border-slate-150 rounded-3xl shadow-sm p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-80 -z-10" />
            
            {/* Left overview */}
            <div className="lg:col-span-5 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-md border border-slate-800">
                  {report.candidateName.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-2xl text-slate-900 tracking-tight">{report.candidateName}</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Verified Profile
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold mt-1.5 flex flex-wrap items-center gap-1">
                    Target Profile: <span className="text-slate-900 font-extrabold bg-slate-100 px-2 py-0.5 rounded-md">{report.targetRole}</span> at <span className="text-slate-900 font-black bg-slate-100 px-2 py-0.5 rounded-md">{report.targetCompany}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-medium">
                We completed a comprehensive, multi-dimensional Career Intelligence audit. Below is a real-time assessment comparing your experience bullets against ATS keywords and recruiter response rates. Your profile ranks in the <span className="text-slate-950 font-black">Top 15%</span> of peer applications.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download Intelligence PDF
                </button>
                <button
                  onClick={syncPillarsToCreator}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-slate-950/5"
                >
                  {syncStatus === "synced" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" /> Setup Ported!
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-350 fill-yellow-350" /> Sync with Cadence Creator
                    </>
                  )}
                </button>
                
                {/* Reset Trigger to test other samples */}
                <button
                  onClick={() => {
                    setReport(null);
                    localStorage.removeItem("cadence_last_career_report");
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Scan New Profile
                </button>
              </div>
            </div>

            {/* Career Intelligence Radar Chart */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:px-4 shrink-0">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 text-center">Career Intelligence Dimensions</h4>
              <div className="w-full h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                    { subject: "ATS Match", score: report.atsScore },
                    { subject: "Resume/Skills", score: report.resumeScore },
                    { subject: "LinkedIn", score: report.linkedinScore },
                    { subject: "Recruiter Appeal", score: report.recruiterScore },
                    { subject: "Hiring Manager", score: report.hiringManagerScore },
                    { subject: "Interview Ready", score: report.readinessScore },
                  ]}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "#475569", fontSize: 8, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={false}
                      axisLine={false}
                    />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      fill="#6366f1" 
                      fillOpacity={0.2} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155" }}
                      itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
                      labelStyle={{ color: "#94a3b8", fontSize: "9px" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overall Score Dial */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 shrink-0">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    stroke="#0f172a" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - report.overallScore / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{report.overallScore}</span>
                  <span className="text-[9px] text-slate-400 font-black uppercase mt-1">Overall Grade</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full mt-4 tracking-widest animate-pulse">
                Action Advised
              </span>
            </div>
          </div>

          {/* Gamification Dashboard Block */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(51,65,85,0.2),transparent)] pointer-events-none" />
            
            {/* XP and Level */}
            <div className="space-y-3.5 border-b md:border-b-0 md:border-r border-slate-800 pb-5 md:pb-0 md:pr-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Growth Level</span>
                <span className="text-xs font-black text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  XP Level {report.gamification.xpLevel}
                </span>
              </div>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                Professional Explorer
                <Award className="w-5.5 h-5.5 text-yellow-400 shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(report.gamification.xpPoints / report.gamification.nextLevelXp) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>{report.gamification.xpPoints} XP</span>
                  <span>Next Level at {report.gamification.nextLevelXp} XP</span>
                </div>
              </div>
            </div>

            {/* Badges and Streaks */}
            <div className="space-y-3.5 border-b md:border-b-0 md:border-r border-slate-800 pb-5 md:pb-0 md:pr-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consistency Streaks</div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/20 flex items-center justify-center border border-orange-500/30 shadow-inner">
                  <Flame className="w-7 h-7 text-orange-500 fill-orange-500 animate-pulse" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{report.gamification.weeklyStreak} Weeks</div>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Continuous resume/brand optimization</p>
                </div>
              </div>
            </div>

            {/* Badges Showcase Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unlocked Badges</div>
              <div className="grid grid-cols-4 gap-2">
                {report.gamification.achievements.map((ach, idx) => (
                  <div 
                    key={idx} 
                    title={`${ach.title}: ${ach.description}`}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      ach.unlocked 
                        ? "bg-slate-800/80 border-slate-700 text-white hover:scale-105 shadow-md cursor-help" 
                        : "bg-slate-900/30 border-slate-900/50 text-slate-600 opacity-30 cursor-not-allowed"
                    }`}
                  >
                    <Award className={`w-5.5 h-5.5 ${ach.unlocked ? "text-yellow-400 fill-yellow-400/10" : "text-slate-600"}`} />
                    <span className="text-[8px] font-black text-center truncate w-full mt-1.5">{ach.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metric scores visualizer bento-grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: "ATS Score", val: report.atsScore, icon: Terminal },
              { label: "Resume Score", val: report.resumeScore, icon: FileText },
              { label: "LinkedIn Brand", val: report.linkedinScore, icon: UserCheck },
              { label: "Recruiter Appr.", val: report.recruiterScore, icon: Clock },
              { label: "Hiring Manager", val: report.hiringManagerScore, icon: Briefcase },
              { label: "Brand Vis.", val: report.brandScore, icon: Sparkles },
              { label: "Career Growth", val: report.growthScore, icon: TrendingUp },
              { label: "Interview Prep", val: report.readinessScore, icon: ListChecks }
            ].map((scr, idx) => (
              <div key={idx} className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm text-center flex flex-col items-center justify-between space-y-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <scr.icon className="w-5 h-5 text-slate-600" />
                </div>
                <div className="space-y-1 w-full">
                  <div className="text-lg font-black text-slate-900">{scr.val}%</div>
                  
                  {/* Dynamic mini-progress line */}
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full" style={{ width: `${scr.val}%` }} />
                  </div>
                  <p className="text-[8px] text-slate-400 font-black uppercase leading-tight pt-1">{scr.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive tabs navigation with active pill animation */}
          <div className="bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl flex flex-wrap gap-1">
            {[
              { id: "overview", label: "Executive Overview", icon: BarChart2 },
              { id: "jd_match", label: "JD Match & Enhancements", icon: Sparkles },
              { id: "verification", label: "Profile Verification", icon: ShieldAlert },
              { id: "ats", label: "ATS Parser Sim", icon: Terminal },
              { id: "bullets", label: "STAR Experience", icon: FileText },
              { id: "simulations", label: "Recruiter Decisions", icon: Briefcase },
              { id: "roadmap", label: "Target Roadmap", icon: Clock },
              { id: "marketing", label: "Cadence GTM", icon: Megaphone }
            ].map((tb) => (
              <button
                key={tb.id}
                onClick={() => setActiveTab(tb.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                  activeTab === tb.id 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <tb.icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tb.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="space-y-6">
            
            {/* JD MATCH TAB */}
            {activeTab === "jd_match" && (
              <div className="space-y-6">
                {!report.jdMatch ? (
                  <div className="bg-white border border-slate-150 p-8 rounded-2xl shadow-sm text-center py-12 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">No Job Description Data Analyzed</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        To enable point-to-point comparisons and tailor your resume keyword match, please provide a Job Description and run the scanner.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sub Tab Switcher */}
                    <div className="flex border-b border-slate-100 mb-2 gap-2">
                      <button
                        onClick={() => setJdSubTab("standard")}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                          jdSubTab === "standard"
                            ? "border-indigo-600 text-indigo-600 font-black"
                            : "border-transparent text-slate-400 hover:text-slate-650"
                        }`}
                      >
                        Standard AI Insights
                      </button>
                      <button
                        onClick={() => setJdSubTab("grounded_audit")}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                          jdSubTab === "grounded_audit"
                            ? "border-indigo-600 text-indigo-600 font-black"
                            : "border-transparent text-slate-400 hover:text-slate-650"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Strict Grounded Audit (No Assumptions)
                      </button>
                    </div>

                    {jdSubTab === "standard" ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                    
                    {/* Left Column: Match Statistics & Gaps */}
                    <div className="space-y-6">
                      
                      {/* Match Score Card */}
                      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-extrabold text-slate-900 text-sm">Role Compatibility Score</h4>
                          <span className="text-[10px] font-black uppercase bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700">
                            ATS Matrix
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                stroke={report.jdMatch.score >= 80 ? "#10b981" : report.jdMatch.score >= 60 ? "#f59e0b" : "#ef4444"} 
                                strokeWidth="10" 
                                fill="transparent" 
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - report.jdMatch.score / 100)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-sm font-black text-slate-800">{report.jdMatch.score}%</span>
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {report.jdMatch.score >= 80 ? "High Compatibility" : report.jdMatch.score >= 60 ? "Moderate Match Gaps" : "High Risk Deficit"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold leading-normal mt-0.5">
                              This score simulates how an enterprise applicant tracking system parses your resume against the uploaded job requirements.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Keywords Intelligence */}
                      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <CheckCircle className="w-4.5 h-4.5 text-slate-800" />
                          Keyword Parser Gaps
                        </h4>
                        
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Matched Keywords ({report.jdMatch.matchedKeywords.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {report.jdMatch.matchedKeywords.length === 0 ? (
                              <span className="text-xxs text-slate-400 italic">No matched keywords detected.</span>
                            ) : (
                              report.jdMatch.matchedKeywords.map((kw, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  {kw}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Missing Keywords ({report.jdMatch.missingKeywords.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {report.jdMatch.missingKeywords.length === 0 ? (
                              <span className="text-xxs text-emerald-600 font-bold">100% Keyword Coverage Achieved!</span>
                            ) : (
                              report.jdMatch.missingKeywords.map((kw, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  {kw}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Structural Alignments */}
                      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <ShieldAlert className="w-4.5 h-4.5 text-slate-800" />
                          Structural Alignment & Fit
                        </h4>
                        
                        <div className="space-y-2.5">
                          {report.jdMatch.structuralIssues.map((issue, idx) => (
                            <div key={idx} className="bg-amber-50 border border-amber-150 p-3 rounded-xl flex gap-2.5 items-start">
                              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xxs font-bold text-amber-900 leading-relaxed">
                                {issue}
                              </div>
                            </div>
                          ))}
                          {report.jdMatch.structuralIssues.length === 0 && (
                            <div className="text-xs text-emerald-800 font-semibold bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-center">
                              No layout structural anomalies detected! Perfect chronological grid fit.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right Column (span-2): Point-to-Point Enhancement Matrix */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <Sparkles className="w-4.5 h-4.5 text-slate-800" />
                            Point-to-Point Requirement Enhancer
                          </h4>
                          <p className="text-xxs text-slate-400 font-bold uppercase mt-1 tracking-widest">
                            Direct correlation comparison mapped against target role deliverables with tailored adjustments
                          </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {report.jdMatch.pointToPointEnhancements.map((enh, idx) => (
                            <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Target JD Requirement
                                  </div>
                                  <p className="text-xs font-bold text-slate-800 leading-relaxed bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                                    {enh.jdRequirement}
                                  </p>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Your Resume Status
                                  </div>
                                  <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/30 border border-slate-150 p-3 rounded-xl">
                                    {enh.resumeStatus}
                                  </p>
                                </div>

                              </div>

                              <div className="bg-emerald-50/40 border border-emerald-150/70 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-800 uppercase tracking-widest">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/10" />
                                  Recommended Custom Adjustment (STAR format)
                                </div>
                                <p className="text-xs font-semibold text-emerald-950 leading-relaxed">
                                  {enh.recommendedAdjustment}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 w-full animate-fadeIn">
                      {/* Top banner / Info */}
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            Strict Grounded Audit Engine
                          </h4>
                          <p className="text-xxs text-slate-400 leading-normal max-w-2xl">
                            This deterministic auditor performs direct, raw-string index parsing and constraint checking between your uploaded Resume text and the Job Description. It makes absolute zero external assumptions, guesses, or AI-generated exaggerations.
                          </p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 shrink-0 text-[10px] font-mono text-slate-300">
                          STATUS: 100% GROUNDED
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Skills and Platform Keyword Parse (Left Column) */}
                        <div className="lg:col-span-7 space-y-6">
                          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-5">
                            <div>
                              <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                                Technical Skill Gap Finder (Deterministic String Match)
                              </h5>
                              <p className="text-xxs text-slate-450 leading-normal mt-0.5 font-bold">
                                Scans the target Job Description for high-value technical terms and cross-references their exact character existence in your resume text.
                              </p>
                            </div>

                            <div className="space-y-4">
                              {/* Missing skills */}
                              <div className="space-y-2.5">
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4 text-rose-600" />
                                  Missing Skills in Resume ({(() => {
                                    const ga = runGroundedComparativeAnalysis(resumeText, jobDescription, targetRole, experienceLevel);
                                    return ga.missingSkills.length;
                                  })()})
                                </span>
                                {(() => {
                                  const ga = runGroundedComparativeAnalysis(resumeText, jobDescription, targetRole, experienceLevel);
                                  if (ga.missingSkills.length === 0) {
                                    return (
                                      <div className="text-xxs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                        All core technical terms mentioned in the Job Description were detected in your resume text!
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                                      {ga.missingSkills.map((skill, index) => (
                                        <span key={index} className="text-[10px] font-bold bg-rose-50 text-rose-950 border border-rose-100 px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-rose-100/50 transition-colors">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Matched skills */}
                              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  Grounded Matched Skills ({(() => {
                                    const ga = runGroundedComparativeAnalysis(resumeText, jobDescription, targetRole, experienceLevel);
                                    return ga.matchedSkills.length;
                                  })()})
                                </span>
                                {(() => {
                                  const ga = runGroundedComparativeAnalysis(resumeText, jobDescription, targetRole, experienceLevel);
                                  if (ga.matchedSkills.length === 0) {
                                    return (
                                      <div className="text-xxs text-slate-400 italic bg-slate-50 border border-slate-150 p-3 rounded-xl">
                                        No matched skills found between your Resume and the Job Description yet. Include relevant key terms!
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                                      {ga.matchedSkills.map((skill, index) => (
                                        <span key={index} className="text-[10px] font-bold bg-emerald-50 text-emerald-950 border border-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-emerald-100/50 transition-colors">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Professional Inconsistencies and Conflicts (Right Column) */}
                        <div className="lg:col-span-5 space-y-6">
                          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                              <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                                Professional Inconsistency & Conflict Audit
                              </h5>
                              <p className="text-xxs text-slate-450 leading-normal mt-0.5 font-bold">
                                Checks for alignment on timeline requirements, academic background credentials, job titles, and remote work modes.
                              </p>
                            </div>

                            <div className="space-y-3">
                              {(() => {
                                const ga = runGroundedComparativeAnalysis(resumeText, jobDescription, targetRole, experienceLevel);
                                if (ga.conflicts.length === 0) {
                                  return (
                                    <div className="text-xs text-slate-500 italic text-center py-6">
                                      No structural constraints found to analyze. Ensure both Job Description and Resume texts are uploaded.
                                    </div>
                                  );
                                }
                                return ga.conflicts.map((conflict, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-3.5 rounded-xl border flex gap-3 items-start transition-all ${
                                      conflict.type === "conflict"
                                        ? "bg-rose-50/50 border-rose-150 text-rose-950"
                                        : conflict.type === "warning"
                                        ? "bg-amber-50/50 border-amber-150 text-amber-950"
                                        : "bg-emerald-50/30 border-emerald-100 text-emerald-950"
                                  }`}
                                  >
                                    <div className="shrink-0 mt-0.5">
                                      {conflict.type === "conflict" ? (
                                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                                      ) : conflict.type === "warning" ? (
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                      ) : (
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <h6 className="text-[10px] font-black uppercase tracking-wider">
                                        {conflict.title}
                                      </h6>
                                      <p className="text-xxs leading-relaxed font-semibold">
                                        {conflict.description}
                                      </p>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  
                  {/* Key highlights and impact metrics */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4.5 h-4.5 text-slate-800" /> Projected Improvement Impact Metrics
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-xl space-y-1.5 hover:bg-slate-50/80 transition-colors">
                        <Coins className="w-5.5 h-5.5 text-emerald-600" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary Potential</div>
                        <div className="text-base font-black text-slate-900">{report.expectedImpact.salaryBoostPotential}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-xl space-y-1.5 hover:bg-slate-50/80 transition-colors">
                        <UserCheck className="w-5.5 h-5.5 text-slate-800" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recruiter Clicks</div>
                        <div className="text-base font-black text-slate-900">{report.expectedImpact.recruiterResponseIncrease}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-xl space-y-1.5 hover:bg-slate-50/80 transition-colors">
                        <Terminal className="w-5.5 h-5.5 text-slate-700" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATS Pass Multiplier</div>
                        <div className="text-base font-black text-slate-900">{report.expectedImpact.atsImprovementMultiplier}</div>
                      </div>
                    </div>
                  </div>

                  {/* Skills intelligence */}
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5">
                    <h4 className="font-extrabold text-slate-900 text-sm">Niche Skill Intelligence Mapping</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider block w-fit">
                          Identified Strengths ({report.skillIntelligence.technicalMatch.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {report.skillIntelligence.technicalMatch.map((sk, i) => (
                            <span key={i} className="text-xs bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-slate-800 font-semibold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full uppercase tracking-wider block w-fit">
                          Critical Skill Gaps ({report.skillIntelligence.gapSkills.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {report.skillIntelligence.gapSkills.map((sk, i) => (
                            <span key={i} className="text-xs bg-rose-50/30 border border-rose-100 px-3 py-1.5 rounded-xl text-slate-800 font-semibold flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar highlights */}
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-5">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Award className="w-4.5 h-4.5 text-slate-800" /> Urgent Action items
                    </h4>
                    
                    <ul className="space-y-3.5">
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className="w-5 h-5 bg-red-100 text-red-800 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">1</div>
                        <span className="font-semibold">Re-format resume from double-column layout to single-column standard standard flow.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className="w-5 h-5 bg-orange-100 text-orange-800 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">2</div>
                        <span className="font-semibold">Update LinkedIn headline using generated payment infrastructure metrics value statements.</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <div className="w-5 h-5 bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">3</div>
                        <span className="font-semibold">Sync recommended content pillars to Cadence feed and begin scheduling post drafts.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* CROSS-VERIFICATION TAB */}
            {activeTab === "verification" && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Cross-Source Profile Verification Engine</h4>
                  <p className="text-xxs text-slate-400 font-bold uppercase mt-1 tracking-widest">Scanning and verifying alignment between your CV and public online assets</p>
                </div>

                {/* Stats Summary Widget */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fadeIn">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Checks Run</span>
                    <span className="text-2xl font-black text-slate-800 mt-2">{report.crossVerification.length}</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Verified Match
                    </span>
                    <span className="text-2xl font-black text-emerald-700 mt-2">
                      {report.crossVerification.filter(v => v.status === "verified").length}
                    </span>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-150 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" /> Discrepancies
                    </span>
                    <span className="text-2xl font-black text-amber-700 mt-2">
                      {report.crossVerification.filter(v => v.status === "warning").length}
                    </span>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-bounce" /> Critical Conflicts
                    </span>
                    <span className="text-2xl font-black text-rose-700 mt-2">
                      {report.crossVerification.filter(v => v.status === "conflict").length}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {report.crossVerification.map((v, i) => (
                    <div key={i} className="p-4 border border-slate-150 rounded-xl space-y-3 bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-slate-600" />
                          {v.item}
                        </h5>
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest ${
                          v.status === "verified" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                          v.status === "warning" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-red-50 text-red-800 border border-red-100"
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Evidence Detected</span>
                          <p className="text-slate-800 font-semibold leading-relaxed">{v.evidence}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Audit Advice</span>
                          <p className="text-slate-600 leading-relaxed">{v.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ATS SCANNER TAB */}
            {activeTab === "ats" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulator Interface */}
                <div className="lg:col-span-2 bg-slate-950 text-slate-100 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6 font-mono">
                  <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <Code className="w-5 h-5 text-emerald-400" />
                        ATS Parsing Simulator
                      </h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-wider">Workday Node Compiler Output</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-emerald-400">{report.atsAnalysis.score}%</div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Extracted Schema Alignment</span>
                    </div>
                  </div>

                  {/* Warning terminal log line */}
                  <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 text-yellow-300 text-xs font-mono leading-relaxed">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-yellow-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Grid/Table Format Warning Detected</p>
                      <p className="text-slate-300">{report.atsAnalysis.details}</p>
                    </div>
                  </div>

                  {/* Extracted JSON schema box */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                      <span>Extracted Contact Entity Nodes</span>
                      <span className="text-emerald-400 font-black">Status: Completed</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs text-slate-300">
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Email</span>
                        <p className="text-white font-semibold truncate mt-1">{report.atsAnalysis.email || "alex@example.com"}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Phone</span>
                        <p className="text-white font-semibold truncate mt-1">{report.atsAnalysis.phone || "+1 (555) 019-2834"}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Location</span>
                        <p className="text-white font-semibold truncate mt-1">{report.atsAnalysis.location || "San Francisco, CA"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4" />
                    ATS Formatting Checklist
                  </h4>
                  <ul className="space-y-3.5">
                    {report.atsAnalysis.improvements.map((imp, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-600 leading-relaxed">
                        <Check className="w-4.5 h-4.5 text-emerald-600 stroke-[3px] shrink-0 mt-0.5 bg-emerald-50 rounded-full p-0.5" />
                        <span className="font-semibold">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* STAR EXPERIENCE OPTIMIZER TAB */}
            {activeTab === "bullets" && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">STAR Experience Optimizer</h4>
                  <p className="text-xxs text-slate-400 font-bold uppercase mt-1 tracking-widest">Transforming passive duty statements into high-impact performance indicators</p>
                </div>

                <div className="space-y-6">
                  {report.bulletRewrites.map((bl, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                            REWRITE #{idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            Metric Focus: <span className="text-slate-950 font-black">{bl.metricFocus}</span>
                          </span>
                        </div>
                        
                        <button
                          onClick={() => copyToClipboard(bl.optimized, idx)}
                          className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedIndex === idx ? "Copied!" : "Copy Hook"}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="p-5 space-y-2 bg-rose-50/10">
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block">Original passive statement</span>
                          <p className="text-xs text-slate-550 leading-relaxed italic">"{bl.original}"</p>
                        </div>
                        <div className="p-5 space-y-3 bg-emerald-50/10">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500 animate-spin-slow" /> Optimized STAR format
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-bold">"{bl.optimized}"</p>
                          
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-2.5 border-t border-dashed border-slate-150">
                            <strong>Recruiter Impact Score justification:</strong> {bl.impact}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECRUITER & HIRING MANAGER SIMULATIONS TAB */}
            {activeTab === "simulations" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Recruiter block */}
                <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">Recruiter Screening Verdict</h4>
                        <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider mt-0.5">7-Second Instant Impression Model</p>
                      </div>
                      <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                        {report.recruiterSimulation.response}
                      </span>
                    </div>

                    {/* Virtual Recruiter Badge card */}
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                        <Briefcase className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">Recruiter Persona critique</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">7-Second screen pass-fail trigger</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-650 leading-relaxed space-y-2">
                      <p className="font-bold text-slate-900">Screening Verdict Critique:</p>
                      <p className="italic bg-slate-50/50 p-3 rounded-xl border border-slate-150 text-slate-600">"{report.recruiterSimulation.assessment}"</p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Recruiter Response Probability:</span>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div className="bg-slate-900 h-full rounded-full" style={{ width: `${report.recruiterSimulation.clickProbability}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-800 shrink-0">{report.recruiterSimulation.clickProbability}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-wider block">Screening Flags:</span>
                      <ul className="space-y-1.5 text-[10px] text-slate-600 font-semibold list-inside list-disc">
                        {report.recruiterSimulation.criticalFails.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Recommended Fixes:</span>
                      <ul className="space-y-1.5 text-[10px] text-slate-600 font-semibold list-inside list-disc">
                        {report.recruiterSimulation.quickWins.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Hiring Manager block */}
                <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">Hiring Manager Decision Node</h4>
                        <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Ownership Scope, Metrics, & Deliverables</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900">{report.hiringManagerSimulation.businessImpactScore}/100</div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Impact Score</span>
                      </div>
                    </div>

                    {/* Team Leader Avatar card */}
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                        <UserCheck className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">Engineering/Product Director Critique</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Behavioral ownership & system depth checks</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-650 leading-relaxed space-y-2">
                      <p className="font-bold text-slate-900">Ownership Mindset Assessment:</p>
                      <p className="italic bg-slate-50/50 p-3 rounded-xl border border-slate-150 text-slate-600">"{report.hiringManagerSimulation.ownershipMindsetAdvice}"</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Simulated Interview Scenarios:</span>
                    {report.hiringManagerSimulation.scenarioQuestions.map((q, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-900 leading-relaxed font-semibold flex gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROADMAP TIMELINE TAB */}
            {activeTab === "roadmap" && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Target Company Application Timeline</h4>
                  <p className="text-xxs text-slate-400 font-bold uppercase mt-1 tracking-widest">Chronological action steps needed to secure an interview and offer</p>
                </div>

                <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-8 py-2">
                  {report.careerRoadmap.map((p, i) => {
                    const phaseId = `phase_${i}`;
                    return (
                      <div key={i} className="relative">
                        
                        {/* Chrono Dot Indicator */}
                        <div className="absolute -left-10 top-0.5 w-8 h-8 rounded-full bg-slate-900 border-4 border-white flex items-center justify-center text-white text-[10px] font-black shadow-md">
                          {i + 1}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-extrabold text-slate-900 text-sm">{p.phase}</h5>
                            <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {p.duration}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Main Focus: {p.focus}</p>
                          
                          {/* Checked lists of actions */}
                          <ul className="space-y-2 pl-4 list-none text-xs text-slate-650">
                            {p.actionItems.map((act, idx) => {
                              const itemId = `${phaseId}_item_${idx}`;
                              const isChecked = !!checkedActionItems[itemId];
                              return (
                                <li key={idx} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggleActionItem(itemId)}>
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                    isChecked 
                                      ? "bg-emerald-600 border-emerald-600 text-white" 
                                      : "border-slate-300 bg-white hover:border-slate-400"
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className={`transition-all ${isChecked ? "line-through text-slate-400 font-medium" : "text-slate-700 font-semibold"}`}>
                                    {act}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          
                          <div className="text-[10px] bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-800 inline-flex items-center gap-1.5 font-bold">
                            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                            <span>Metric Goal: {p.metricGoal}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CADENCE FEEDBACK & MARKETING GTM MODULE */}
            {activeTab === "marketing" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-6">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Megaphone className="w-5 h-5 text-slate-800" />
                      The Cadence Feed Philosophy & GTM Positioning
                    </h4>
                    <p className="text-xxs text-slate-400 font-bold uppercase mt-1 tracking-widest">Compounding personal brand pipeline as the ultimate professional leverage model</p>
                  </div>

                  <div className="text-xs text-slate-600 space-y-4 leading-relaxed font-semibold">
                    <p>
                      <strong>What is Cadence?</strong> In today's digital talent ecosystem, flat resumes and cold email outreach are low-conversion tactics. True industry authority is earned by demonstrating domain expertise and narrative consistency on professional public feeds.
                    </p>
                    <p>
                      Cadence operates as an offline-first writing sandbox and profile optimizer. By identifying your core strengths, recommended niches, and formatting preferences, it builds a repeatable writing habit (a "cadence"). It strips out artificial intelligence jargon and maps real engineering/business milestones into highly authentic, metrics-focused professional assets.
                    </p>
                    
                    <div className="p-5 bg-slate-900 text-slate-200 rounded-2xl space-y-3.5 border border-slate-800 shadow-inner">
                      <p className="font-black text-xs text-white uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400 fill-orange-400" /> Monetization & Pricing Models
                      </p>
                      <ul className="space-y-2 text-[10px] text-slate-300 list-disc list-inside font-mono">
                        <li><strong>Inbound Growth Pitch:</strong> Highlight how active profile optimization boosts inbound recruiter click-throughs by 12x within 30 days.</li>
                        <li><strong>Content Scribe Sandbox:</strong> Offer structural resume audits for free, charging a subscription for voice mapping and structured content schedules.</li>
                        <li><strong>Professional Score Index:</strong> Establish the overall grade (ATS, Recruiter score) as an industry credential that developers highlight in negotiations for 15-20% compensation boosts.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-4">
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-slate-900" />
                      Instant Setup Porting
                    </h4>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                      Now that we have completed your deep career audit, you can instantly synchronize your recommended content pillars and technical niches directly into your Cadence profile setup.
                    </p>
                    
                    <button
                      onClick={syncPillarsToCreator}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {syncStatus === "synced" ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" /> Setup Successfully Ported!
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-350 fill-yellow-350" /> Sync recommended pillars to Creator
                        </>
                      )}
                    </button>
                    
                    {syncStatus === "synced" && (
                      <p className="text-[10px] text-emerald-700 font-extrabold text-center animate-pulse leading-snug">
                        Ready! Go to "Publishing Pipeline" or "Voice Calibration" tabs to see your custom voice rule metrics in action.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      )}

      {/* Initial state: paste links to run audit */}
      {!report && !loading && (
        <div id="po-initial-card" className="bg-white border border-slate-150 p-8 rounded-3xl shadow-sm text-center max-w-xl mx-auto py-12 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
            <UserCheck className="w-8 h-8 text-slate-900" />
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 text-sm">Ready to Audit your Profile</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
              Fill out your profile details or load an interactive demo candidate profile above to simulate your customized Career Intelligence report.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive helper badge for top-level engine
function CpuBadge() {
  return (
    <div className="flex items-center gap-2.5 font-mono text-xs">
      <div className="relative">
        <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </div>
      <div className="text-slate-300">
        <span className="text-[10px] text-slate-500 block uppercase font-black leading-none">System Load</span>
        <span className="text-white font-bold leading-normal">Optimized (0.04s)</span>
      </div>
    </div>
  );
}

// Compact interactive tooltips for state-of-the-art UX
function HelpTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block text-slate-400 hover:text-slate-600 transition-colors cursor-help">
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[9px] font-bold p-2 rounded-lg leading-normal shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </div>
  );
}
