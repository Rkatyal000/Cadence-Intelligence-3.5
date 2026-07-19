import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sliders, Sparkles, Plus, Trash2, CheckCircle2, MessageSquare, ListFilter, PlayCircle, Loader2, AlertCircle } from "lucide-react";
import { Profile } from "../types";

interface VoiceCalibrationProps {
  profile: Profile;
  writingSamples: string[];
  onUpdateProfile: (profile: Profile) => void;
  onAddSample: (sample: string) => void;
  onRemoveSample: (index: number) => void;
}

export default function VoiceCalibration({
  profile,
  writingSamples,
  onUpdateProfile,
  onAddSample,
  onRemoveSample
}: VoiceCalibrationProps) {
  const [newSampleText, setNewSampleText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<string[] | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit states
  const [formality, setFormality] = useState(profile.voicePreference.formality);
  const [sentenceLength, setSentenceLength] = useState(profile.voicePreference.sentenceLength);
  const [customRules, setCustomRules] = useState(profile.voicePreference.customRules);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  const handleSaveSettings = () => {
    const updatedProfile = {
      ...profile,
      voicePreference: {
        ...profile.voicePreference,
        formality,
        sentenceLength,
        customRules
      }
    };
    onUpdateProfile(updatedProfile);
    triggerToast("Tone preferences successfully saved!", "success");
  };

  const handleTrainOnSample = async () => {
    if (!newSampleText.trim()) return;
    setLoading(true);
    setAnalysisFeedback(null);
    try {
      // Analyze new sample
      const response = await fetch("/api/calibrate-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: [newSampleText.trim(), ...writingSamples] }),
      });
      if (!response.ok) throw new Error("Voice analysis failed.");
      const data = await response.json();

      // Trigger saving sample
      onAddSample(newSampleText.trim());

      // Update rules & traits in profile
      const updatedProfile = {
        ...profile,
        voicePreference: {
          formality: data.formality || formality,
          sentenceLength: data.sentenceLength || sentenceLength,
          customRules: `${data.suggestedRules.join(". ")}. ${customRules}`,
          keyTraits: data.keyStylisticTraits || []
        }
      };
      onUpdateProfile(updatedProfile);
      setAnalysisFeedback(data.keyStylisticTraits || ["Sample analyzed successfully!"]);
      setNewSampleText("");
      triggerToast("Writing sample successfully processed & voice calibrated!", "success");
    } catch (err: any) {
      triggerToast("Failed to analyze writing sample.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-950"
                : "bg-rose-50 border-rose-100 text-rose-950"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-650 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* COLUMN 1 & 2: VOICE SETTINGS & ANALYSIS TRAITS (LHS) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Active Settings Panel */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sliders className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-900 text-sm">Active Voice Profiles</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Formality Calibration</label>
              <select
                value={formality}
                onChange={(e) => setFormality(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="Extremely Conversational">Conversational (Humble & friendly)</option>
                <option value="Semi-formal">Relatable Business Professional</option>
                <option value="Technical & Analytical">Data & Science Centered</option>
                <option value="Bold & Disruptive">Contrarian / Direct</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sentence Length Style</label>
              <select
                value={sentenceLength}
                onChange={(e) => setSentenceLength(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="Ultra-punchy & Short">Ultra-punchy (Staccato lines)</option>
                <option value="Flowing, storytelling prose">Flowing, narrative style</option>
                <option value="Balanced explanatory text">Balanced frameworks</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Writing Rules (Treat as Law)</label>
              <textarea
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
                placeholder="No generic clickbait, always specify raw failures, use lowercase for conversational items..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              Save Voice Profiles
            </button>
          </div>
        </div>

        {/* Key Traits Matched */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
            <h4 className="font-bold text-slate-900 text-sm">Calibrated Traits Alignment Map</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2">
              <span className="text-xxs uppercase tracking-wider font-bold text-slate-400">Identified Style Traits</span>
              <ul className="space-y-1.5">
                {profile.voicePreference.keyTraits && profile.voicePreference.keyTraits.length > 0 ? (
                  profile.voicePreference.keyTraits.map((t, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{t}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">No traits calibrated yet. Please train with a writing sample.</li>
                )}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-2">
              <span className="text-xxs uppercase tracking-wider font-bold text-slate-400 font-sans">Active Formatting Preferences</span>
              <div className="space-y-2 text-xs font-medium">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Emojis:</span>
                  <span className="text-slate-800">{profile.formatRules.emojiUse}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Hashtags:</span>
                  <span className="text-slate-800">{profile.formatRules.hashtagsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CTA question:</span>
                  <span className="text-slate-800 max-w-[150px] truncate">{profile.formatRules.ctaStyle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Train with writing sample */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Train Voice Model</h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Did a post perform exceptionally well or do you have a fresh writing block? Paste it here. Cadence will extract the style patterns, update rules, and append it to your voice reference.
            </p>

            <textarea
              value={newSampleText}
              onChange={(e) => setNewSampleText(e.target.value)}
              rows={4}
              placeholder="Paste raw post text..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
              id="calibration_sample_input"
            />

            {analysisFeedback && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold">✓ Model Retrained Successfully! New Traits Extracted:</p>
                <ul className="list-inside list-disc text-xxs mt-1 text-emerald-700">
                  {analysisFeedback.map((fb, i) => <li key={i}>{fb}</li>)}
                </ul>
              </motion.div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleTrainOnSample}
                disabled={loading || !newSampleText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Analyze and Add Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 3: RAW WRITING SAMPLES (RHS) */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <MessageSquare className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-900 text-sm">Calibration Samples ({writingSamples.length})</h3>
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {writingSamples.map((sample, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-150 relative space-y-2">
                <span className="text-xxs font-bold text-slate-400">Sample #{idx+1}</span>
                <p className="text-xxs text-slate-600 font-mono line-clamp-6 whitespace-pre-wrap leading-relaxed">{sample}</p>
                
                <button
                  onClick={() => onRemoveSample(idx)}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
