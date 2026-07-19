import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Sparkles, LogIn, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";

interface LoginGateProps {
  onLoginSuccess: (email: string, role: string, avatar: string) => void;
}

export default function LoginGate({ onLoginSuccess }: LoginGateProps) {
  const [email, setEmail] = useState("rohitkatyal12345@gmail.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Software Architect");
  const [selectedAvatar, setSelectedAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatars = [
    {
      id: "female-1",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
      label: "Tech Leader (Alex)"
    },
    {
      id: "male-1",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      label: "Architect (Rohit)"
    },
    {
      id: "female-2",
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      label: "Product Mgr (Sarah)"
    },
    {
      id: "male-2",
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      label: "VP Eng (David)"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid professional email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate smart backend verification delay
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(email, selectedRole, selectedAvatar);
    }, 800);
  };

  const handleQuickFill = () => {
    setEmail("rohitkatyal12345@gmail.com");
    setPassword("password123");
    setSelectedRole("Staff Systems Architect");
    setSelectedAvatar("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80");
    setError(null);
  };

  return (
    <div id="login-gate-viewport" className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative ambient background blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Watermark Indicator */}
      <div className="absolute top-6 left-6 flex items-center gap-2 pointer-events-none opacity-40">
        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-950 font-black text-xs">
          C
        </div>
        <span className="text-xs font-black tracking-widest uppercase">Cadence Intelligence v3.5</span>
      </div>

      <div className="w-full max-w-md bg-slate-950 border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6">
        
        {/* Header Icon & Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center mx-auto shadow-md">
            <span className="text-xl font-black text-white">C</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Access Creator Workspace</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Log in to initiate high-fidelity career optimization, ATS checking, and LinkedIn writing tools.
          </p>
        </div>

        {/* Dynamic customized greeting based on typing */}
        {email === "rohitkatyal12345@gmail.com" && (
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 animate-fadeIn">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xxs font-black text-slate-400 uppercase tracking-widest leading-none">Recognized Profile</p>
              <p className="text-xs text-white font-bold truncate mt-1">Hello Rohit! Ready for LinkedIn optimization?</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Professional Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="e.g. you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Security Password</label>
              <span className="text-[10px] font-bold text-slate-500">Any valid key</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter workspace password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Persona selector with datalist for searching and custom typing */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Target Career Focus</label>
            <div className="relative">
              <input
                id="target-career-focus-input"
                type="text"
                list="career-options"
                placeholder="Type or select a role (e.g. Senior Software Architect)"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <datalist id="career-options">
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
                <option value="Cloud Solutions Consultant" />
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
            <p className="text-[9px] text-slate-500 font-medium">Type any custom role above or choose from the suggested professional roles list.</p>
          </div>

          {/* Avatar selector */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Choose Brand Avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {avatars.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.url);
                    // Match default roles beautifully
                    if (av.id === "male-1") setSelectedRole("Staff Systems Architect");
                    if (av.id === "female-2") setSelectedRole("Principal Product Designer");
                    if (av.id === "male-2") setSelectedRole("VP of Engineering");
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 ${
                    selectedAvatar === av.url ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  title={av.label}
                >
                  <img src={av.url} alt={av.label} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  {selectedAvatar === av.url && (
                    <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Errors display */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-start gap-2 text-xxs font-bold text-rose-300 animate-fadeIn">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating Workspace...
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" /> Enter Workspace
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleQuickFill}
              className="w-full py-2 bg-slate-900/40 hover:bg-slate-900 hover:text-white text-slate-400 font-bold text-[10px] rounded-xl transition-all border border-slate-800/80 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Auto-Fill Reviewer Account
            </button>
          </div>

        </form>

      </div>

      <div className="text-center mt-6 text-[10px] text-slate-500 font-semibold space-y-1">
        <p>© 2026 Cadence Professional Networks Inc.</p>
        <p className="opacity-60">Session uses sandboxed browser-secure local encryption modules.</p>
      </div>
    </div>
  );
}
