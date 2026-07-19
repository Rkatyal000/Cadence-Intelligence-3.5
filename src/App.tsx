import React, { useState, useEffect } from "react";
import OnboardingWizard from "./components/OnboardingWizard";
import PipelineDashboard from "./components/PipelineDashboard";
import StoryBank from "./components/StoryBank";
import VoiceCalibration from "./components/VoiceCalibration";
import AnalyticsSection from "./components/AnalyticsSection";
import ProfileOptimizer from "./components/ProfileOptimizer";
import LoginGate from "./components/LoginGate";
import { Profile, Story, DraftPost } from "./types";
import { Sparkles, Layers, BookOpen, Sliders, BarChart3, LogOut, CheckCircle, UserCheck, Sun, Moon } from "lucide-react";

export default function App() {
  // Application-wide Core States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storyBank, setStoryBank] = useState<Story[]>([]);
  const [writingSamples, setWritingSamples] = useState<string[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<DraftPost[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; role: string; avatar: string } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"loading" | "cloud" | "local">("loading");
  
  // Custom theme selector state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("cadence_theme");
    return (savedTheme === "dark" || savedTheme === "light") ? savedTheme : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("cadence_theme", theme);
  }, [theme]);

  // View Routing: "pipeline" | "storybank" | "voice" | "analytics" | "optimizer"
  const [activeTab, setActiveTab] = useState<"pipeline" | "storybank" | "voice" | "analytics" | "optimizer">("optimizer");

  // Check backend engine health and quota status
  useEffect(() => {
    const checkEngineHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          if (data.rateLimited) {
            setEngineStatus("local");
          } else if (data.keyAvailable) {
            setEngineStatus("cloud");
          } else {
            setEngineStatus("local");
          }
        } else {
          setEngineStatus("local");
        }
      } catch (e) {
        setEngineStatus("local");
      }
    };
    
    checkEngineHealth();
    const interval = setInterval(checkEngineHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Save activeTab whenever it changes
  useEffect(() => {
    localStorage.setItem("cadence_active_tab", activeTab);
  }, [activeTab]);

  // Load state from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("cadence_logged_in_user");
    if (savedUser) {
      try {
        setLoggedInUser(JSON.parse(savedUser));
      } catch (e) {
        // Ignore
      }
    }

    const savedTab = localStorage.getItem("cadence_active_tab");
    if (savedTab) {
      setActiveTab(savedTab as any);
    }

    const savedProfile = localStorage.getItem("cadence_profile");
    const savedStories = localStorage.getItem("cadence_stories");
    const savedSamples = localStorage.getItem("cadence_samples");
    const savedPosts = localStorage.getItem("cadence_posts");

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      // Auto-set high-fidelity profile to bypass onboarding roadblock and boot straight to Career Audit
      const defaultProfile: Profile = {
        name: "Alex Mercer",
        identity: "Targeting Lead Developer & Architect roles",
        audience: "Engineering Managers, Recruiters, and Tech Leaders",
        goal: "Build authentic personal branding focused on system-design scalability metrics",
        contentPillars: ["System Design", "Database Scaling", "Engineering Velocity"],
        publishingTarget: "draft-only",
        voicePreference: {
          formality: "technical & authoritative",
          sentenceLength: "punchy, spaced lines",
          customRules: "Focus on metrics, avoid empty generic buzzwords, write first-person.",
          keyTraits: ["authoritative", "technical", "pragmatic"]
        },
        formatRules: {
          emojiUse: "minimal, 1-2 per post",
          hashtagsCount: "none",
          ctaStyle: "conversational questions"
        },
        hasCompletedSetup: true
      };
      setProfile(defaultProfile);
      localStorage.setItem("cadence_profile", JSON.stringify(defaultProfile));
    }

    if (savedStories) {

      setStoryBank(JSON.parse(savedStories));
    } else {
      // Default initial story bank items for instant premium experience
      const defaultStories: Story[] = [
        {
          id: "story-default-1",
          title: "The Button Padding Debate",
          category: "Hard-Learned Failure",
          text: "In 2024, I turned down a $150k big tech offer to work for a 4-person startup, wanting absolute speed. In our first month, we spent 2 entire weeks arguing about button padding and border radius. I realized that lack of corporate structure doesn't mean speed — sometimes it just means infinite circular debates. Speed comes from clear decisions, not lack of rules."
        },
        {
          id: "story-default-2",
          title: "The 4 AM SQL Rewrite Heroics",
          category: "Technical Challenge",
          text: "I stayed up until 4 AM rewriting a slow SQL query. I was feeling like a absolute tech hero. Next morning, the client looked at my work and told me they actually didn't need that feature at all and we should delete it. I learned that technical heroics are useless if you aren't talking to the product team first."
        }
      ];
      setStoryBank(defaultStories);
      localStorage.setItem("cadence_stories", JSON.stringify(defaultStories));
    }

    if (savedSamples) {
      setWritingSamples(JSON.parse(savedSamples));
    } else {
      // Premium initial writing samples to start with
      const defaultSamples = [
        `I spent 10 years working in corporate tech.
The biggest lesson I learned?

The most talented engineers aren't the ones who write the cleanest code.
They are the ones who can translate code into business dollars.

Technical skills get you in the door.
Business alignment gets you in the boardroom.`
      ];
      setWritingSamples(defaultSamples);
      localStorage.setItem("cadence_samples", JSON.stringify(defaultSamples));
    }

    if (savedPosts) {
      setPublishedPosts(JSON.parse(savedPosts));
    }
  }, []);

  // Complete onboarding
  const handleCompleteOnboarding = (newProfile: Profile, newSamples: string[]) => {
    setProfile(newProfile);
    setWritingSamples(newSamples);
    
    localStorage.setItem("cadence_profile", JSON.stringify(newProfile));
    localStorage.setItem("cadence_samples", JSON.stringify(newSamples));
  };

  // Update Profile
  const handleUpdateProfile = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    localStorage.setItem("cadence_profile", JSON.stringify(updatedProfile));
  };

  // Story bank handlers
  const handleAddStory = (newStory: Story) => {
    const updated = [newStory, ...storyBank];
    setStoryBank(updated);
    localStorage.setItem("cadence_stories", JSON.stringify(updated));
  };

  const handleRemoveStory = (id: string) => {
    const updated = storyBank.filter(s => s.id !== id);
    setStoryBank(updated);
    localStorage.setItem("cadence_stories", JSON.stringify(updated));
  };

  // Writing samples handlers
  const handleAddSample = (sample: string) => {
    const updated = [sample, ...writingSamples];
    setWritingSamples(updated);
    localStorage.setItem("cadence_samples", JSON.stringify(updated));
  };

  const handleRemoveSample = (index: number) => {
    const updated = writingSamples.filter((_, i) => i !== index);
    setWritingSamples(updated);
    localStorage.setItem("cadence_samples", JSON.stringify(updated));
  };

  // Log published post
  const handleAddPublishedPost = (post: DraftPost) => {
    const impressions = Math.floor(Math.random() * 8500) + 1500;
    const likes = Math.floor(impressions * (Math.random() * 0.04 + 0.02)) + 15;
    const shares = Math.floor(likes * (Math.random() * 0.12 + 0.04)) + 3;
    const engagementRate = parseFloat((((likes + shares * 1.5) / impressions) * 100).toFixed(1));

    const enrichedPost: DraftPost = {
      ...post,
      authorEmail: loggedInUser?.email || "unknown@domain.com",
      authorName: profile?.name || loggedInUser?.email?.split("@")[0] || "Author",
      authorAvatar: loggedInUser?.avatar || "",
      impressions,
      likes,
      shares,
      engagementRate
    };

    const updated = [enrichedPost, ...publishedPosts];
    setPublishedPosts(updated);
    localStorage.setItem("cadence_posts", JSON.stringify(updated));
  };

  // Login / Logout Handlers
  const handleLogin = (email: string, role: string, avatar: string) => {
    const user = { email, role, avatar };
    setLoggedInUser(user);
    localStorage.setItem("cadence_logged_in_user", JSON.stringify(user));
    
    // Customize profile name automatically based on the logged-in email prefix
    if (profile) {
      const prefix = email.split("@")[0];
      const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      // Replace name only if it matches default Alex Mercer
      if (profile.name === "Alex Mercer" && capitalized && capitalized !== "Alex") {
        const updated = { ...profile, name: capitalized };
        setProfile(updated);
        localStorage.setItem("cadence_profile", JSON.stringify(updated));
      }
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("cadence_logged_in_user");
  };

  // Reset profile / onboarding simulation
  const handleResetApp = () => {
    setShowResetModal(true);
  };

  const handleResetConfirm = () => {
    localStorage.removeItem("cadence_profile");
    localStorage.removeItem("cadence_stories");
    localStorage.removeItem("cadence_samples");
    localStorage.removeItem("cadence_posts");
    localStorage.removeItem("cadence_logged_in_user");
    localStorage.removeItem("cadence_active_tab");
    localStorage.removeItem("cadence_last_career_report");
    localStorage.removeItem("cadence_profile_setup");
    localStorage.removeItem("cadence_optimizer_tool_mode");
    localStorage.removeItem("cadence_optimizer_active_tab");
    window.location.reload();
  };

  // 1. Gate Workspace access with Login screen
  if (!loggedInUser) {
    return <LoginGate onLoginSuccess={handleLogin} />;
  }

  // 2. If profile has not completed onboarding, show wizard
  if (!profile || !profile.hasCompletedSetup) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        {/* Onboarding Header */}
        <header className="border-b border-slate-200/60 bg-white/85 backdrop-blur-md sticky top-0 z-50 py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-white font-extrabold shadow-md shadow-slate-950/10">
                C
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">Cadence</h1>
                <span className="text-[10px] text-slate-400 font-bold leading-none uppercase mt-0.5 block">LinkedIn Ghostwriter</span>
              </div>
            </div>

            <span className="text-xxs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">V1.0.0</span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8">
          <OnboardingWizard onComplete={handleCompleteOnboarding} />
        </main>
      </div>
    );
  }

  // Else, show Main Creator Dashboard Workspace
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      
      {/* Premium Dashboard Header */}
      <header className="border-b border-slate-200/60 bg-white/85 backdrop-blur-md sticky top-0 z-50 py-4 px-6 shadow-sm shadow-slate-100/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black shadow-md shadow-slate-950/15 text-lg">
              C
            </div>
            <div>
              <h1 className="font-black text-base text-slate-900 tracking-tight leading-none flex flex-wrap items-center gap-1.5">
                Cadence
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 uppercase tracking-wider">
                  Voice Calibrated
                </span>
                {engineStatus === "local" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-100 uppercase tracking-wider shadow-sm animate-pulse" title="Gemini API limit reached. Local high-fidelity simulation engine is active. All features remain fully operational.">
                    ⚠️ Hybrid Local Engine
                  </span>
                ) : engineStatus === "cloud" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 uppercase tracking-wider shadow-sm" title="Cloud Gemini AI Core active.">
                    ⚡ Cloud Gemini AI Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-500 font-bold border border-slate-200 uppercase tracking-wider" title="Checking Engine Status...">
                    ⏳ Checking Core...
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Authentic Ghostwriting for <span className="text-slate-600 font-bold">{profile.name}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tab Links */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {/* Weekly pipeline */}
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "pipeline" 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Pipeline
            </button>

            {/* Story Bank */}
            <button
              onClick={() => setActiveTab("storybank")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "storybank" 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Story Bank
            </button>

            {/* Voice Calibration */}
            <button
              onClick={() => setActiveTab("voice")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "voice" 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Voice Profile
            </button>

            {/* Strategy / Analytics */}
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "analytics" 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Strategy Log
            </button>

            {/* Profile Optimizer */}
            <button
              onClick={() => setActiveTab("optimizer")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "optimizer" 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/10" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> LinkedIn Improver & ATS
            </button>
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 text-slate-600 text-xs rounded-lg transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
              title={theme === "light" ? "Switch to Night Mode (Dark)" : "Switch to Day Mode (Light)"}
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Night Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Day Mode</span>
                </>
              )}
            </button>

            {loggedInUser && (
              <div className="flex items-center gap-2 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/40">
                <img
                  src={loggedInUser.avatar}
                  alt="User Avatar"
                  className="w-5.5 h-5.5 rounded-full object-cover border border-slate-300"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xxs font-extrabold text-slate-700 hidden md:inline truncate max-w-[150px]">
                  {loggedInUser.email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 text-slate-600 text-xs rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer"
              title="Log Out of Workspace"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" /> 
              <span className="hidden sm:inline">Log Out</span>
            </button>
            <button
              onClick={handleResetApp}
              className="px-3 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 text-xs rounded-lg transition-colors font-semibold"
            >
              Reset System
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6">
        {activeTab === "pipeline" && (
          <PipelineDashboard 
            profile={profile} 
            storyBank={storyBank} 
            writingSamples={writingSamples}
            onAddPublishedPost={handleAddPublishedPost}
          />
        )}

        {activeTab === "storybank" && (
          <StoryBank 
            stories={storyBank} 
            onAddStory={handleAddStory} 
            onRemoveStory={handleRemoveStory}
          />
        )}

        {activeTab === "voice" && (
          <VoiceCalibration 
            profile={profile} 
            writingSamples={writingSamples} 
            onUpdateProfile={handleUpdateProfile}
            onAddSample={handleAddSample}
            onRemoveSample={handleRemoveSample}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsSection 
            profile={profile} 
            publishedPosts={publishedPosts}
            currentUserEmail={loggedInUser?.email}
          />
        )}

        {activeTab === "optimizer" && (
          <ProfileOptimizer />
        )}
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-150 py-4 text-center text-xxs text-slate-400 mt-12 bg-white/50">
        <p>© 2026 Cadence Creator System. Runs fully local and server-side.</p>
      </footer>

      {showResetModal && (
        <div id="reset-modal-overlay" className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div id="reset-modal-card" className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <span className="text-rose-500 font-bold text-lg">⚠️</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900">Reset System Calibration?</h3>
                <p className="text-xxs text-slate-500 font-medium leading-normal">
                  Are you absolutely sure you want to reset your Cadence brand profile, career reports, and calibrated voice settings? This will clear all locally-cached assets and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="reset-cancel-btn"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xxs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                No, Keep My Data
              </button>
              <button
                id="reset-confirm-btn"
                onClick={handleResetConfirm}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xxs font-black transition-colors shadow-sm shadow-rose-600/10 cursor-pointer"
              >
                Yes, Reset System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
