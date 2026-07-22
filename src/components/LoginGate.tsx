import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Sparkles, LogIn, ShieldAlert, ArrowRight, CheckCircle2, ArrowLeft, KeyRound, Info, Inbox, RefreshCw, Send, UserPlus } from "lucide-react";

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
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Password reset specific states
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // OTP and Dual Verification states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [simulatedEmails, setSimulatedEmails] = useState<any[]>([]);
  const [showInbox, setShowInbox] = useState(true); // Default show simulated inbox on side for high fidelity
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [lastSmtpError, setLastSmtpError] = useState<string | null>(null);

  const fetchSimulatedEmails = async () => {
    try {
      const response = await fetch("/api/simulated-emails");
      if (!response.ok) return;
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }
      const data = await response.json();
      if (data && data.success) {
        setSimulatedEmails(data.emails || []);
      }
    } catch (err) {
      console.warn("Error fetching simulated emails:", err);
    }
  };

  const checkSmtpConfig = async () => {
    try {
      const response = await fetch("/api/health");
      if (!response.ok) return;
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }
      const data = await response.json();
      if (data && data.status === "healthy") {
        setSmtpConfigured(!!data.smtpConfigured);
      }
    } catch (err) {
      console.warn("Error checking SMTP configuration status:", err);
    }
  };

  useEffect(() => {
    fetchSimulatedEmails();
    checkSmtpConfig();
    const interval = setInterval(() => {
      fetchSimulatedEmails();
      checkSmtpConfig();
    }, 5000);
    return () => clearInterval(interval);
  }, []);



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

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    try {
      const endpoint = isSignUpMode ? "/api/signup" : "/api/verify-auth";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: selectedRole,
          avatar: selectedAvatar
        })
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (response.ok && data.success) {
        onLoginSuccess(data.user.email, data.user.role, data.user.avatar);
      } else {
        setError(data.error || "Authentication failed: Invalid credentials.");
      }
    } catch (err) {
      setIsSubmitting(false);
      setError("Unable to reach authentication server. Please try again.");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);
    setLastSmtpError(null);

    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setError("Please enter a valid professional email address to send the verification OTP.");
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() })
      });

      const data = await response.json();
      setIsSendingOtp(false);

      if (response.ok && data.success) {
        setOtpSent(true);
        setResetSuccessMessage(data.message);
        if (data.smtpError) {
          setLastSmtpError(data.smtpError);
        }
        fetchSimulatedEmails(); // Refresh outbox instantly
      } else {
        setError(data.error || "Failed to dispatch verification OTP. Please try again.");
      }
    } catch (err) {
      setIsSendingOtp(false);
      setError("Unable to connect to the authentication server. Please check your network connection.");
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);

    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setError("Please enter a valid professional email address to reset your password.");
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit OTP verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: otpCode.trim(),
          newPassword: newPassword
        })
      });

      const data = await response.json();
      setIsResetting(false);

      if (response.ok && data.success) {
        setResetSuccessMessage(data.message);
        setPassword(newPassword); // Pre-fill login screen with the newly reset password
        // Transition back to login mode on success after a short delay
        setTimeout(() => {
          setIsResetMode(false);
          setOtpSent(false);
          setOtpCode("");
          setNewPassword("");
        }, 3000);
      } else {
        setError(data.error || "Password reset failed. Please check your verification OTP and inputs.");
      }
    } catch (err) {
      setIsResetting(false);
      setError("Unable to connect to the authentication server. Please try again.");
    }
  };

  const handleQuickFill = () => {
    setEmail("rohitkatyal12345@gmail.com");
    setPassword("password123");
    setSelectedRole("Staff Systems Architect");
    setSelectedAvatar("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80");
    setError(null);
  };

  return (
    <div id="login-gate-viewport" className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased flex flex-col justify-center items-center p-4 lg:p-8 relative overflow-hidden">
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

      {/* Main Dual-Pane / Centered Wrapper */}
      <div className={`w-full ${isResetMode ? "max-w-4xl" : "max-w-md"} flex flex-col lg:flex-row items-stretch justify-center gap-8 relative z-10 transition-all duration-300`}>
        
        {/* Auth / Reset Password Card */}
        <div className="w-full max-w-md bg-slate-950 border border-slate-800/80 p-8 rounded-3xl shadow-2xl space-y-6 flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* Header Icon & Branding */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center mx-auto shadow-md">
                <span className="text-xl font-black text-white">C</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {isResetMode ? "Reset Security Password" : "Access Creator Workspace"}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {isResetMode
                  ? "Update your professional workspace access password or claim/secure a new email address."
                  : "Log in to initiate high-fidelity career optimization, ATS checking, and LinkedIn writing tools."}
              </p>
            </div>

            {/* Dynamic customized greeting based on typing */}
            {!isResetMode && email === "rohitkatyal12345@gmail.com" && (
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 animate-fadeIn">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <p className="text-xxs font-black text-slate-400 uppercase tracking-widest leading-none">Recognized Profile</p>
                  <p className="text-xs text-white font-bold truncate mt-1">Hello Rohit! Ready for LinkedIn optimization?</p>
                </div>
              </div>
            )}

            {isResetMode ? (
              /* Two-Step Password Reset Dual Verification Form */
              !otpSent ? (
                /* Step 1: Request OTP */
                <form onSubmit={handleSendOtp} className="space-y-4 animate-fadeIn">
                  <div className="bg-indigo-950/30 border border-indigo-900/40 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                      To verify identity, enter your professional email address. We will securely generate and dispatch a 6-digit verification code to you.
                    </p>
                  </div>

                  {/* Email input for reset */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Professional Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. you@company.com"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Error displays */}
                  {error && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-start gap-2 text-xxs font-bold text-rose-300 animate-fadeIn">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Reset Actions */}
                  <div className="space-y-2 pt-3">
                    <button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingOtp ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending Code...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Send Verification OTP
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSuccessMessage(null);
                        setIsResetMode(false);
                      }}
                      className="w-full py-2 bg-slate-900/40 hover:bg-slate-900 hover:text-white text-slate-400 font-bold text-[10px] rounded-xl transition-all border border-slate-800/80 flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Input OTP & New Password */
                <form onSubmit={handleResetSubmit} className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                      A code has been dispatched to <strong className="text-white">{resetEmail}</strong>. Enter the 6-digit OTP code along with your new password below.
                    </p>
                  </div>

                  {/* OTP input field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">6-Digit Verification Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 123456"
                        value={otpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setOtpCode(val);
                          setError(null);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white tracking-[0.25em] text-center placeholder:tracking-normal placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* New Password input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">New Security Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Reset Success Message */}
                  {resetSuccessMessage && (
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-2.5 text-xxs animate-fadeIn ${
                      lastSmtpError ? "bg-amber-950/35 border-amber-900/50 text-amber-300" : "bg-emerald-950/40 border-emerald-900/50 text-emerald-300"
                    }`}>
                      <div className="flex items-start gap-2 font-bold">
                        {lastSmtpError ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{resetSuccessMessage}</span>
                      </div>

                      {lastSmtpError && (
                        <div className="mt-1 p-3 bg-slate-950/80 rounded-lg border border-amber-500/20 text-slate-300 text-[11px] font-normal leading-relaxed space-y-2">
                          <p className="font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            ⚙️ SMTP Authentication Guide (Gmail Fix)
                          </p>
                          <p>
                            Gmail has rejected your password (Error 535). Since Google blocked standard login for security, you <strong>MUST</strong> use an <strong>App Password</strong>:
                          </p>
                          <ol className="list-decimal pl-4 space-y-1 text-slate-350 font-medium">
                            <li>Ensure <span className="text-white font-bold">2-Step Verification</span> is enabled on your Gmail account.</li>
                            <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-bold">Google App Passwords</a> settings.</li>
                            <li>Generate a 16-character code (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                            <li>Go to the <strong>Settings &gt; Secrets</strong> tab in the top-right of your AI Studio screen.</li>
                            <li>Update the <code>SMTP_PASS</code> secret with your 16-character code (without spaces) and restart or resend.</li>
                          </ol>
                          <p className="text-[10px] text-slate-400 italic">
                            * Tip: Until you configure the App Password, the generated security OTP remains fully accessible in the Workspace Sandbox Mailbox on the right side so you are never locked out of testing.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error displays */}
                  {error && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-start gap-2 text-xxs font-bold text-rose-300 animate-fadeIn">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Reset Actions */}
                  <div className="space-y-2 pt-3">
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isResetting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying & Setting Password...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" /> Verify & Set Password
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSuccessMessage(null);
                        setOtpSent(false);
                        setOtpCode("");
                      }}
                      className="w-full py-2 bg-slate-900/40 hover:bg-slate-900 hover:text-white text-slate-400 font-bold text-[10px] rounded-xl transition-all border border-slate-800/80 flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3 h-3" /> Resend Code
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* Standard Login / Signup Form */
              <div className="space-y-4">
                {/* Tabs to switch between Sign In and Sign Up */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(false);
                      setError(null);
                    }}
                    className={`py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSignUpMode
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(true);
                      setError(null);
                    }}
                    className={`py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSignUpMode
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Sign Up
                  </button>
                </div>

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
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Security Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSuccessMessage(null);
                        setIsResetMode(true);
                        setResetEmail(email); // Pre-fill with login email state, but separate
                        setOtpSent(false);
                        setNewPassword("");
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
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
                      className="w-full pl-10 pr-10 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
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
                {isSignUpMode && (
                  <>
                    <div className="space-y-1.5 pt-1 animate-fadeIn">
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
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Choose Brand Avatar</label>
                      <div className="grid grid-cols-4 gap-2">
                        {avatars.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(av.url);
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
                  </>
                )}

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
                        {isSignUpMode ? "Creating Account..." : "Authenticating Workspace..."}
                      </>
                    ) : (
                      <>
                        {isSignUpMode ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                        {isSignUpMode ? "Register & Create Account" : "Enter Workspace"}
                      </>
                    )}
                  </button>

                  {!isSignUpMode && (
                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="w-full py-2 bg-slate-900/40 hover:bg-slate-900 hover:text-white text-slate-400 font-bold text-[10px] rounded-xl transition-all border border-slate-800/80 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Auto-Fill Reviewer Account
                    </button>
                  )}
                </div>

              </form>
            </div>
          )}

          </div>

        </div>

        {/* Right Side: Secure OTP Inbox Sandbox (Only visible during Reset Mode) */}
        {isResetMode && showInbox && (
          <div className="w-full lg:max-w-md bg-slate-950 border border-indigo-900/30 p-6 rounded-3xl shadow-2xl flex flex-col justify-between space-y-4 animate-fadeIn">
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Inbox className="w-5 h-5 text-indigo-400" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      Workspace Mail Delivery
                      {smtpConfigured ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-[8px] font-extrabold text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                          REAL SMTP ACTIVE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[8px] font-extrabold text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                          SANDBOX SIMULATOR
                        </span>
                      )}
                    </h3>
                    <p className="text-[9px] text-indigo-300/80 font-bold">
                      {smtpConfigured 
                        ? "Real-time verification dispatch via custom SMTP server" 
                        : "Simulated sandbox delivery module is currently active"}
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={fetchSimulatedEmails}
                  className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800/80 cursor-pointer animate-spin-hover"
                  title="Check Outbox Logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {simulatedEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/10">
                  <Mail className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xxs font-black text-slate-400 uppercase tracking-widest">No security emails dispatched yet</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Enter your professional email address on the left and click "Send Verification OTP" to trigger a secure simulation log.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {simulatedEmails.map((mail: any) => (
                    <div 
                      key={mail.id} 
                      className="p-3 bg-indigo-950/20 border border-indigo-900/30 hover:border-indigo-500/50 rounded-xl space-y-2 transition-all relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center text-xxs font-bold">
                        <span className="text-indigo-400">To: {mail.to}</span>
                        <span className="text-slate-500 text-[9px]">{mail.timestamp}</span>
                      </div>
                      
                      <div className="text-[11px] font-semibold text-slate-300 leading-tight">
                        {mail.subject}
                      </div>

                      {/* Display the active OTP clearly with an auto-fill button */}
                      <div className="flex items-center justify-between pt-1 border-t border-indigo-900/20">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase">CODE:</span>
                          {mail.otp === "******" ? (
                            <span className="font-mono text-xs font-black text-amber-500 tracking-wider flex items-center gap-1">
                              🔒 CONFIDENTIAL
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-black text-emerald-400 tracking-widest">{mail.otp}</span>
                          )}
                        </div>
                        
                        {mail.otp === "******" ? (
                          <div className="px-2.5 py-1 bg-amber-950/40 text-amber-400 font-bold text-[8px] uppercase tracking-wider rounded-md border border-amber-500/20 flex items-center gap-1">
                            <Info className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Sent to Inbox
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpCode(mail.otp);
                              setResetSuccessMessage("Simulated OTP copied & auto-filled successfully!");
                            }}
                            className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-black text-[9px] uppercase tracking-wider rounded-md transition-all border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" /> Auto-Fill Code
                          </button>
                        )}
                      </div>

                      {/* Expandable email body display toggle option */}
                      <details className="group mt-1 pt-1 border-t border-indigo-900/10">
                        <summary className="text-[9px] font-extrabold text-slate-500 hover:text-slate-300 cursor-pointer list-none flex items-center justify-between">
                          <span>VIEW RENDERED HTML EMAIL</span>
                          <span className="transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div 
                          className="mt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xxs overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: mail.body }}
                        />
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 flex flex-col gap-1.5 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Real Email Delivery:</strong> To send real verification emails directly to your inbox, define your SMTP credentials (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, and <code>SMTP_FROM</code>) as secrets in the <strong>Settings &gt; Secrets</strong> panel.
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-slate-800/50">
                <div className="w-3.5 shrink-0" />
                <span>
                  <strong>Failsafe Sandbox:</strong> If SMTP credentials are not configured, the platform safely logs dispatched email templates and verification OTP codes inside this simulator module so you are never blocked.
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="text-center mt-6 text-[10px] text-slate-500 font-semibold space-y-1">
        <p>© 2026 Cadence Professional Networks Inc.</p>
        <p className="opacity-60">Session uses sandboxed browser-secure local encryption modules.</p>
      </div>
    </div>
  );
}
