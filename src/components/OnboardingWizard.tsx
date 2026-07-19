import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, User, Target, Layers, FileText, Sliders, 
  ChevronRight, ChevronLeft, Plus, Trash2, Loader2, CheckCircle2 
} from "lucide-react";
import { Profile } from "../types";

interface OnboardingWizardProps {
  onComplete: (profile: Profile, samples: string[]) => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const [contentPillars, setContentPillars] = useState<string[]>(["Personal Growth", "Career Lessons"]);
  const [newPillar, setNewPillar] = useState("");
  const [publishingTarget, setPublishingTarget] = useState<"notion" | "linkedin" | "draft-only">("draft-only");
  
  // Voice preferences
  const [formality, setFormality] = useState("Conversational");
  const [sentenceLength, setSentenceLength] = useState("Punchy");
  const [customRules, setCustomRules] = useState("No cheesy clickbait, no corporate buzzwords (like 'leverage' or 'excited to share'), write as a humble expert.");

  // Formatting Preferences
  const [emojiUse, setEmojiUse] = useState("Sparingly (1-2 max)");
  const [hashtagsCount, setHashtagsCount] = useState("0-2 max");
  const [ctaStyle, setCtaStyle] = useState("End with a simple conversational question");

  // Writing samples (up to 3)
  const [writingSamples, setWritingSamples] = useState<string[]>([
    `I spent 10 years working in corporate tech.
The biggest lesson I learned?

The most talented engineers aren't the ones who write the cleanest code.
They are the ones who can translate code into business dollars.

Technical skills get you in the door.
Business alignment gets you in the boardroom.`
  ]);
  const [newSample, setNewSample] = useState("");

  // AI Calibration Result
  const [calibrationResult, setCalibrationResult] = useState<{
    formality: string;
    sentenceLength: string;
    emojiFrequency: string;
    keyStylisticTraits: string[];
    suggestedRules: string[];
  } | null>(null);

  const addPillar = () => {
    if (newPillar.trim() && !contentPillars.includes(newPillar.trim())) {
      setContentPillars([...contentPillars, newPillar.trim()]);
      setNewPillar("");
    }
  };

  const removePillar = (index: number) => {
    setContentPillars(contentPillars.filter((_, i) => i !== index));
  };

  const addSample = () => {
    if (newSample.trim()) {
      setWritingSamples([...writingSamples, newSample.trim()]);
      setNewSample("");
    }
  };

  const removeSample = (index: number) => {
    setWritingSamples(writingSamples.filter((_, i) => i !== index));
  };

  // Run AI Calibration
  const handleCalibrateVoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calibrate-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: writingSamples }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze samples.");
      }
      const data = await response.json();
      setCalibrationResult(data);
      
      // Auto-update values based on AI advice
      setFormality(data.formality || formality);
      setSentenceLength(data.sentenceLength || sentenceLength);
      setStep(6); // Go to calibration review step
    } catch (err: any) {
      setError(err.message || "An error occurred while calibrating your voice.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    const finalProfile: Profile = {
      name: name || "Creator",
      identity: identity || "Digital creator & entrepreneur",
      audience: audience || "Professionals and industry peers",
      goal: goal || "Share actionable lessons and build industry trust",
      contentPillars: contentPillars.length > 0 ? contentPillars : ["General Lessons"],
      publishingTarget,
      voicePreference: {
        formality,
        sentenceLength,
        customRules: calibrationResult 
          ? [...(calibrationResult.suggestedRules || []), customRules].join(". ")
          : customRules,
        keyTraits: calibrationResult?.keyStylisticTraits || []
      },
      formatRules: {
        emojiUse,
        hashtagsCount,
        ctaStyle
      },
      hasCompletedSetup: true
    };
    onComplete(finalProfile, writingSamples);
  };

  const nextStep = () => {
    if (step === 1 && !name) {
      setError("Please enter your name to continue.");
      return;
    }
    setError(null);
    if (step === 5) {
      handleCalibrateVoice();
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const stepInfo = [
    { title: "Identity", desc: "Who you are", icon: User },
    { title: "Audience & Goal", desc: "Your LinkedIn strategy", icon: Target },
    { title: "Content Pillars", desc: "Core topics you cover", icon: Layers },
    { title: "Writing Samples", desc: "Train your voice profile", icon: FileText },
    { title: "Formatting", desc: "Post layout preferences", icon: Sliders },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Progress Tracker */}
      {step <= 5 && (
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {stepInfo.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = step > idx + 1;
              const isActive = step === idx + 1;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 position-relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted ? "bg-emerald-50 border-emerald-500 text-emerald-600" :
                    isActive ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" :
                    "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${isActive ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1 bg-slate-100 rounded-full mt-4 relative">
            <div 
              className="h-1 bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps Content Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50 p-8 min-h-[420px] flex flex-col justify-between">
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex-1">
          {/* STEP 1: Basic Identity */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Step 1 of 5</span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tell us about yourself</h1>
                <p className="text-sm text-slate-500">Let's set up your profile. This gives the AI agents context about your industry expertise.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">What is your name?</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Rohit Katyal"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                    id="setup_name_input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">How would you summarize your professional identity?</label>
                  <textarea
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    rows={3}
                    placeholder="e.g., Senior Full-Stack Engineer and Tech Lead building high-scale Cloud architectures. Focused on TypeScript, Next.js, and scaling developer teams."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                    id="setup_identity_input"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Goal & Audience */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Step 2 of 5</span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your LinkedIn Strategy</h1>
                <p className="text-sm text-slate-500">Define who you are writing for and what you want to achieve.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Who is your target audience on LinkedIn?</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g., CTOs, Engineering Managers, and junior developers seeking career growth"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                    id="setup_audience_input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">What is your primary goal for posting content?</label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g., Demonstrate technical authority, attract consulting leads, and share raw developer stories"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                    id="setup_goal_input"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Content Pillars */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Step 3 of 5</span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">What are your Content Pillars?</h1>
                <p className="text-sm text-slate-500">These are the core subjects or thematic buckets you plan to cover regularly. Cadence will research topics aligned to these.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Your Content Pillars</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contentPillars.map((pillar, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
                        {pillar}
                        <button type="button" onClick={() => removePillar(idx)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPillar}
                      onChange={(e) => setNewPillar(e.target.value)}
                      placeholder="Add a content pillar (e.g., Cloud Architecture, Remote Work Mistakes)"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                      id="setup_pillar_input"
                      onKeyDown={(e) => e.key === "Enter" && addPillar()}
                    />
                    <button
                      type="button"
                      onClick={addPillar}
                      className="px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Publishing Workflow Choice</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPublishingTarget("draft-only")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        publishingTarget === "draft-only" 
                          ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900" 
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900">Show Me Drafts (Default)</h4>
                      <p className="text-xs mt-1 text-slate-500">Drafts are shown on the dashboard, you copy-paste manually.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPublishingTarget("notion")}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        publishingTarget === "notion" 
                          ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900" 
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900">Export as Notion/JSON Log</h4>
                      <p className="text-xs mt-1 text-slate-500">Approved posts are compiled into a beautiful history database in-app.</p>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Writing Samples */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Step 4 of 5</span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Train Your Authentic Voice</h1>
                <p className="text-sm text-slate-500">Paste 1 to 3 posts you've previously written that represent how you naturally sound. If you don't have samples, use our clean default.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  {writingSamples.map((sample, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                      <p className="text-xs text-slate-600 font-mono line-clamp-3 whitespace-pre-wrap">{sample}</p>
                      <button 
                        type="button" 
                        onClick={() => removeSample(idx)}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Paste a new writing sample</label>
                  <textarea
                    value={newSample}
                    onChange={(e) => setNewSample(e.target.value)}
                    rows={4}
                    placeholder="Paste a successful post or paragraph you wrote yourself..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium font-mono"
                    id="setup_new_sample"
                  />
                  <button
                    type="button"
                    onClick={addSample}
                    className="px-4 py-2 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5 font-semibold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save Sample
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Formatting Defaults */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Step 5 of 5</span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Format and Layout Choices</h1>
                <p className="text-sm text-slate-500">Fine-tune formatting details that our Style Editor agent will enforce on every single post.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Emoji Use</label>
                  <select
                    value={emojiUse}
                    onChange={(e) => setEmojiUse(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                  >
                    <option value="Never">Never (Strict / Clean)</option>
                    <option value="Sparingly (1-2 max)">Sparingly (1-2 max, only for emphasis)</option>
                    <option value="Moderately (3-5 max)">Moderately (3-5 max, conversational flow)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Hashtag Frequency</label>
                  <select
                    value={hashtagsCount}
                    onChange={(e) => setHashtagsCount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                  >
                    <option value="None">None (Clean & minimalist)</option>
                    <option value="0-2 max">0-2 max (Highly targeted at the very end)</option>
                    <option value="3-5 max">3-5 max (Broader reaches)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Call to Action (CTA) Ending Style</label>
                  <input
                    type="text"
                    value={ctaStyle}
                    onChange={(e) => setCtaStyle(e.target.value)}
                    placeholder="e.g., End with a direct, conversational question to invite comments"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm font-medium"
                    id="setup_cta_input"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: AI Calibration Review */}
          {step === 6 && calibrationResult && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100">
                <Sparkles className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Voice Calibrated Successfully!</h3>
                  <p className="text-xs text-emerald-700">Our Strategy Analyzer agent has completed a detailed review of your writing samples.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Your AI Voice Fingerprint</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xxs uppercase tracking-wider font-bold text-slate-400 block">Formality</span>
                    <span className="font-semibold text-sm text-slate-800">{calibrationResult.formality}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xxs uppercase tracking-wider font-bold text-slate-400 block">Sentence Flow</span>
                    <span className="font-semibold text-sm text-slate-800">{calibrationResult.sentenceLength}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xxs uppercase tracking-wider font-bold text-slate-400 block">Emojis Use</span>
                    <span className="font-semibold text-sm text-slate-800">{calibrationResult.emojiFrequency}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Extracted Style Characteristics</h4>
                  <ul className="space-y-1.5">
                    {calibrationResult.keyStylisticTraits.map((trait, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">→</span>
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Enforced Tone Rules (Saved to Profile)</h4>
                  <ul className="space-y-1.5">
                    {calibrationResult.suggestedRules.map((rule, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400 shrink-0">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
          {step > 1 && step <= 5 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          
          <div className="ml-auto">
            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-semibold text-sm transition-all shadow-md shadow-slate-900/10 flex items-center gap-1.5 hover:-translate-y-0.5 disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : step === 5 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 font-semibold text-sm transition-all shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Calibrating Voice...
                  </>
                ) : (
                  <>
                    Calibrate Voice <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm transition-all shadow-lg shadow-slate-900/20 flex items-center gap-1.5 hover:-translate-y-0.5"
              >
                Launch Dashboard <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
