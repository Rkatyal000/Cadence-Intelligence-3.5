import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Layers, ArrowRight, Check, Eye, Edit3, 
  RefreshCw, Copy, CheckCircle2, FileText, ChevronRight, AlertCircle, 
  Trash2, Plus, ArrowLeft, BarChart3, HelpCircle, Loader2, Link, FileJson
} from "lucide-react";
import { Profile, Topic, Hook, DraftPost, Story } from "../types";

interface PipelineDashboardProps {
  profile: Profile;
  storyBank: Story[];
  writingSamples: string[];
  onAddPublishedPost: (post: DraftPost) => void;
}

export default function PipelineDashboard({ 
  profile, 
  storyBank, 
  writingSamples,
  onAddPublishedPost 
}: PipelineDashboardProps) {
  // Navigation: 0 = Topics, 1 = Hooks, 2 = Drafts, 3 = Complete
  const [pipelineStep, setPipelineStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Pipeline State
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  
  // Hooks state: Record of topicId -> list of Hooks, and record of topicId -> selected Hook ID
  const [topicHooks, setTopicHooks] = useState<Record<string, Hook[]>>({});
  const [selectedHooks, setSelectedHooks] = useState<Record<string, string>>({});

  // Drafts state
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [activeDraftIdx, setActiveDraftIdx] = useState(0);
  const [regenInstructions, setRegenInstructions] = useState<Record<string, string>>({});
  const [regenLoading, setRegenLoading] = useState<Record<string, boolean>>({});

  // Custom Topic Form
  const [customTitle, setCustomTitle] = useState("");
  const [customPillar, setCustomPillar] = useState(profile.contentPillars[0] || "General");
  const [customDescription, setCustomDescription] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Success indicator states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Record<string, "published" | "notion" | null>>({});

  // Trigger initial topic research
  const generateInitialTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to research topics.");
      }
      const data = await response.json();
      const mappedTopics = data.map((t: any, idx: number) => ({
        ...t,
        id: `topic-${Date.now()}-${idx}`,
        status: "pending"
      }));
      setTopics(mappedTopics);
      // Auto-select first two by default
      if (mappedTopics.length > 0) {
        setSelectedTopicIds([mappedTopics[0].id, mappedTopics[1].id]);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while researching topics. Is GEMINI_API_KEY set?");
    } finally {
      setLoading(false);
    }
  };

  // Add custom topic
  const handleAddCustomTopic = () => {
    if (!customTitle.trim()) return;
    const newTopic: Topic = {
      id: `topic-custom-${Date.now()}`,
      title: customTitle.trim(),
      description: customDescription.trim() || "User defined custom post",
      contentPillar: customPillar,
      angle: "Personal perspective",
      reason: "Hand-picked by creator",
      status: "selected"
    };
    setTopics([newTopic, ...topics]);
    setSelectedTopicIds([...selectedTopicIds, newTopic.id]);
    setCustomTitle("");
    setCustomDescription("");
    setShowCustomForm(false);
  };

  const toggleTopicSelect = (id: string) => {
    if (selectedTopicIds.includes(id)) {
      setSelectedTopicIds(selectedTopicIds.filter(tid => tid !== id));
    } else {
      setSelectedTopicIds([...selectedTopicIds, id]);
    }
  };

  // Step 1 -> Step 2: Load hooks for selected topics
  const loadHooksForSelectedTopics = async () => {
    if (selectedTopicIds.length === 0) {
      setError("Please select at least one topic to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedTopics = topics.filter(t => selectedTopicIds.includes(t.id));
      const hooksResult: Record<string, Hook[]> = {};
      const chosenHooksMap: Record<string, string> = {};

      for (const topic of selectedTopics) {
        const response = await fetch("/api/generate-hooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, profile, writingSamples }),
        });
        if (!response.ok) {
          throw new Error(`Failed to generate hooks for: ${topic.title}`);
        }
        const hooks = await response.json();
        const mappedHooks = hooks.map((h: any, idx: number) => ({
          ...h,
          id: `hook-${topic.id}-${idx}`
        }));
        hooksResult[topic.id] = mappedHooks;
        // Default to select first hook
        if (mappedHooks.length > 0) {
          chosenHooksMap[topic.id] = mappedHooks[0].id;
        }
      }

      setTopicHooks(hooksResult);
      setSelectedHooks(chosenHooksMap);
      setPipelineStep(1); // Go to Hooks Step
    } catch (err: any) {
      setError(err.message || "An error occurred while generating hooks.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Write drafts for selected topics & hooks
  const generateDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedTopics = topics.filter(t => selectedTopicIds.includes(t.id));
      const draftedPosts: DraftPost[] = [];

      for (const topic of selectedTopics) {
        const selectedHookId = selectedHooks[topic.id];
        const hookList = topicHooks[topic.id] || [];
        const chosenHook = hookList.find(h => h.id === selectedHookId) || { text: "Hook text", patternName: "Custom" };

        const response = await fetch("/api/generate-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            hook: chosenHook,
            profile,
            writingSamples,
            storyBank
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to draft post for: ${topic.title}`);
        }

        const draftData = await response.json();
        
        // Also run a quality review concurrently
        const auditResponse = await fetch("/api/analyze-tone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postText: draftData.postText, profile })
        });
        const auditData = auditResponse.ok ? await auditResponse.json() : {};

        draftedPosts.push({
          id: `draft-${topic.id}`,
          topicId: topic.id,
          topicTitle: topic.title,
          pillar: topic.contentPillar,
          text: draftData.postText,
          status: "draft",
          wordCount: draftData.estimatedWordCount || 200,
          qualityChecks: draftData.qualityChecks || [],
          score: auditData.score || 85,
          strengths: auditData.strengths || ["Engaging hook"],
          improvements: auditData.improvements || [],
          suggestedAlternative: auditData.suggestedFixText
        });
      }

      setDrafts(draftedPosts);
      setActiveDraftIdx(0);
      setPipelineStep(2); // Go to Drafts Step
    } catch (err: any) {
      setError(err.message || "An error occurred while drafting posts.");
    } finally {
      setLoading(false);
    }
  };

  // AI-guided Post Edit/Regenerate
  const handleRegeneratePost = async (draftId: string, idx: number) => {
    const instruction = regenInstructions[draftId];
    if (!instruction?.trim()) return;

    setRegenLoading(prev => ({ ...prev, [draftId]: true }));
    try {
      const currentDraft = drafts[idx];
      const topic = topics.find(t => t.id === currentDraft.topicId);
      
      const response = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          hook: { text: "Use current flow, but incorporate instructions" },
          profile: {
            ...profile,
            voicePreference: {
              ...profile.voicePreference,
              customRules: `${profile.voicePreference.customRules}. Specific revision directive: ${instruction}`
            }
          },
          writingSamples: [currentDraft.text, ...writingSamples],
          storyBank
        })
      });

      if (!response.ok) throw new Error("Regeneration failed.");
      const data = await response.json();

      // Recalculate code review for newly generated text
      const auditResponse = await fetch("/api/analyze-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: data.postText, profile })
      });
      const auditData = auditResponse.ok ? await auditResponse.json() : {};

      const updatedDrafts = [...drafts];
      updatedDrafts[idx] = {
        ...currentDraft,
        text: data.postText,
        wordCount: data.estimatedWordCount || 200,
        qualityChecks: data.qualityChecks || [],
        score: auditData.score || 85,
        strengths: auditData.strengths || ["Improved flow"],
        improvements: auditData.improvements || [],
        suggestedAlternative: auditData.suggestedFixText
      };
      
      setDrafts(updatedDrafts);
      // Clear instructions
      setRegenInstructions(prev => ({ ...prev, [draftId]: "" }));
    } catch (err: any) {
      setError("Failed to rewrite post draft.");
    } finally {
      setRegenLoading(prev => ({ ...prev, [draftId]: false }));
    }
  };

  // Direct manual editing
  const handleManualEditChange = (text: string, idx: number) => {
    const updatedDrafts = [...drafts];
    updatedDrafts[idx].text = text;
    setDrafts(updatedDrafts);
  };

  // Clipboard copy
  const handleCopyText = (draft: DraftPost) => {
    navigator.clipboard.writeText(draft.text);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // simulated publication or notion dump
  const handlePublishOrSave = (draft: DraftPost, idx: number, type: "published" | "notion_saved") => {
    const updatedDrafts = [...drafts];
    updatedDrafts[idx].status = type === "published" ? "published" : "notion_saved";
    setDrafts(updatedDrafts);

    setPublishedIds(prev => ({ ...prev, [draft.id]: type === "published" ? "published" : "notion" }));
    
    // Bubble up to parent (Analytics and log)
    onAddPublishedPost({
      ...draft,
      status: type === "published" ? "published" : "notion_saved"
    });
  };

  // Reset pipeline
  const resetPipeline = () => {
    setPipelineStep(0);
    setTopics([]);
    setSelectedTopicIds([]);
    setTopicHooks({});
    setSelectedHooks({});
    setDrafts([]);
  };

  // Load topics if empty on mount
  useEffect(() => {
    if (topics.length === 0) {
      generateInitialTopics();
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Step Indicator Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest block mb-1">Creator Engine</span>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Post Pipeline</h1>
          <p className="text-slate-400 text-xs mt-1">Specialist agents are drafting in your calibrated voice. You hold the final approval.</p>
        </div>

        {/* Steps Tracker */}
        <div className="flex items-center gap-2 text-xs font-semibold bg-slate-800/50 p-2 rounded-xl">
          <span className={`px-2.5 py-1.5 rounded-lg ${pipelineStep === 0 ? "bg-white text-slate-900" : "text-slate-400"}`}>1. Topics</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={`px-2.5 py-1.5 rounded-lg ${pipelineStep === 1 ? "bg-white text-slate-900" : "text-slate-400"}`}>2. Hooks</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={`px-2.5 py-1.5 rounded-lg ${pipelineStep === 2 ? "bg-white text-slate-900" : "text-slate-400"}`}>3. Draft Review</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-5 py-4 rounded-xl text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <p className="text-xs text-rose-600 mt-0.5">Check if GEMINI_API_KEY is defined in Settings &gt; Secrets.</p>
          </div>
          <button 
            onClick={resetPipeline}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs rounded-lg transition-colors font-semibold"
          >
            Retry Pipeline
          </button>
        </div>
      )}

      {loading && (
        <div className="min-h-[350px] flex flex-col items-center justify-center bg-white border border-slate-100 rounded-3xl p-12 shadow-sm">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
          <h3 className="font-bold text-slate-900 text-lg">Agents Coordinating...</h3>
          <p className="text-slate-400 text-xs mt-1 text-center max-w-sm">
            {pipelineStep === 0 && "The Researcher and Topic Ranker are scanning your pillars and story bank to find weekly ideas."}
            {pipelineStep === 1 && "The Hook Factory is applying viral contrast patterns to your selected topic."}
            {pipelineStep === 2 && "The Content Writer is analyzing your writing samples to draft comprehensive posts."}
          </p>
        </div>
      )}

      {/* PIPELINE STEP 0: TOPIC RESEARCH */}
      {!loading && pipelineStep === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Topic Ideation Pool</h2>
              <p className="text-slate-400 text-xs mt-0.5">Select the ideas you want to develop this week or add a specific custom topic.</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Custom Topic
              </button>
              <button 
                onClick={generateInitialTopics}
                className="px-4 py-2 bg-slate-900 text-white text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-Research
              </button>
            </div>
          </div>

          {/* Custom Topic Dialog Form */}
          {showCustomForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Add Your Own Topic</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Working Title</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Why my team stopped estimating sprint tasks"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Content Pillar</label>
                  <select 
                    value={customPillar}
                    onChange={(e) => setCustomPillar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {profile.contentPillars.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Topic Goal / Outline Details</label>
                  <textarea 
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={2}
                    placeholder="e.g., Share the failure story of spending 4 hours estimating code that we discarded. Show the alternative: break everything into 1-day tasks."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs font-bold">
                <button onClick={() => setShowCustomForm(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={handleAddCustomTopic} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg">Add Topic</button>
              </div>
            </motion.div>
          )}

          {/* Topics Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((topic) => {
              const isSelected = selectedTopicIds.includes(topic.id);
              return (
                <div 
                  key={topic.id}
                  onClick={() => toggleTopicSelect(topic.id)}
                  className={`border rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between group ${
                    isSelected 
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`px-2.5 py-1 rounded-full text-xxs font-bold uppercase tracking-wider ${
                        isSelected ? "bg-slate-800 text-emerald-400" : "bg-slate-50 text-slate-500"
                      }`}>
                        {topic.contentPillar}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-500 text-white" 
                          : "border-slate-200 bg-white text-transparent group-hover:border-slate-300"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-base leading-tight tracking-tight">{topic.title}</h4>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        {topic.description}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-5 pt-4 border-t text-xxs font-medium ${isSelected ? "border-slate-800 text-slate-400" : "border-slate-50 text-slate-400"}`}>
                    <span className="font-bold uppercase tracking-wider block mb-1">AI Recommendation Reason:</span>
                    <p className="italic">{topic.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={loadHooksForSelectedTopics}
              disabled={selectedTopicIds.length === 0}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              Analyze & Generate Hooks <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* PIPELINE STEP 1: HOOK SELECTION */}
      {!loading && pipelineStep === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Earning the Scroll: Hooks Studio</h2>
            <p className="text-slate-400 text-xs mt-0.5">Pick the strongest visual hook pattern for each selected topic. The Content Writer will expand your post around this selection.</p>
          </div>

          {topics.filter(t => selectedTopicIds.includes(t.id)).map((topic) => {
            const hooks = topicHooks[topic.id] || [];
            const activeHookId = selectedHooks[topic.id];

            return (
              <div key={topic.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 pb-4 border-b border-slate-50">
                  <div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xxs font-bold uppercase tracking-widest">{topic.contentPillar}</span>
                    <h3 className="font-bold text-lg text-slate-900 mt-1.5">{topic.title}</h3>
                  </div>
                  <span className="text-xxs text-slate-400 font-medium">Topic ID: {topic.id}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hooks.map((hook) => {
                    const isSelected = activeHookId === hook.id;
                    return (
                      <div
                        key={hook.id}
                        onClick={() => setSelectedHooks(prev => ({ ...prev, [topic.id]: hook.id }))}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected 
                            ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-sm" 
                            : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div>
                          <span className="text-xxs font-bold text-emerald-600 tracking-wider block mb-1 uppercase">
                            {hook.patternName}
                          </span>
                          <p className="text-sm font-semibold text-slate-800 leading-snug tracking-tight font-mono whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-100 mb-3 shadow-inner">
                            "{hook.text}"
                          </p>
                        </div>
                        <p className="text-xxs text-slate-400 leading-relaxed italic border-t border-slate-50 pt-3">
                          {hook.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setPipelineStep(0)}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Adjust Topics
            </button>
            <button
              onClick={generateDrafts}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm transition-all shadow-md flex items-center gap-2"
            >
              Draft Full Posts in My Voice <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* PIPELINE STEP 2: DRAFTS & CODE REVIEWS */}
      {!loading && pipelineStep === 2 && drafts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Post Drafting & Style Optimization</h2>
              <p className="text-slate-400 text-xs mt-0.5">Verify, edit, rewrite, or simulated publish. Our Style Editor agent has performed an automatic tone alignment audit.</p>
            </div>
            
            {/* Draft Selector Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
              {drafts.map((draft, idx) => (
                <button
                  key={draft.id}
                  onClick={() => setActiveDraftIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeDraftIdx === idx 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Post {idx + 1}
                  {publishedIds[draft.id] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Active Draft Panel */}
          {(() => {
            const draft = drafts[activeDraftIdx];
            const isRegenLoading = regenLoading[draft.id] || false;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* COLUMN 1: EDIT & REVIEW (LHS) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Editor Box */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h3 className="font-bold text-sm text-slate-900">Interactive Editor</h3>
                      </div>
                      <span className="text-xxs text-slate-400 font-mono">{draft.wordCount} words</span>
                    </div>

                    <textarea
                      value={draft.text}
                      onChange={(e) => handleManualEditChange(e.target.value, activeDraftIdx)}
                      rows={14}
                      className="w-full text-slate-800 border-none outline-none focus:ring-0 text-sm leading-relaxed font-mono whitespace-pre-wrap placeholder-slate-300 resize-y"
                      placeholder="Write your LinkedIn draft here..."
                    />

                    {/* AI Guided Regeneration Bar */}
                    <div className="border-t border-slate-100 pt-4 flex gap-2">
                      <input
                        type="text"
                        value={regenInstructions[draft.id] || ""}
                        onChange={(e) => setRegenInstructions(prev => ({ ...prev, [draft.id]: e.target.value }))}
                        placeholder="Instruct AI style editor (e.g. 'tell a specific personal failure anecdote', 'make sentences ultra staccato')"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                        id={`instruct_${draft.id}`}
                        onKeyDown={(e) => e.key === "Enter" && handleRegeneratePost(draft.id, activeDraftIdx)}
                      />
                      <button
                        onClick={() => handleRegeneratePost(draft.id, activeDraftIdx)}
                        disabled={isRegenLoading || !regenInstructions[draft.id]}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                      >
                        {isRegenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Rewrite
                      </button>
                    </div>
                  </div>

                  {/* Code Review / Alignment Scores */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-sm text-slate-900">AI Tone Alignment Audit</h4>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (draft.score || 85) >= 90 ? "bg-emerald-500" : (draft.score || 85) >= 70 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${draft.score || 85}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700">{draft.score || 85}/100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-4 rounded-xl border border-slate-200/50 space-y-2">
                        <span className="font-bold text-slate-800 block text-xxs uppercase tracking-wider text-emerald-600">Voice Strengths</span>
                        <ul className="space-y-1 text-slate-600 list-inside list-disc">
                          {draft.strengths?.map((str, i) => <li key={i}>{str}</li>) || <li>Draft matches requested visual layout guidelines.</li>}
                        </ul>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/50 space-y-2">
                        <span className="font-bold text-slate-800 block text-xxs uppercase tracking-wider text-amber-600">Improvements Advised</span>
                        <ul className="space-y-1 text-slate-600 list-inside list-disc">
                          {draft.improvements && draft.improvements.length > 0 ? (
                            draft.improvements.map((imp, i) => <li key={i}>{imp}</li>)
                          ) : (
                            <li className="text-emerald-600 font-semibold">Perfect calibration. No structural changes needed.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {draft.suggestedAlternative && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                        <span className="font-bold text-emerald-800 block text-xxs uppercase tracking-wider">Suggested alternative version:</span>
                        <p className="text-xxs text-emerald-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{draft.suggestedAlternative}</p>
                        <button 
                          onClick={() => handleManualEditChange(draft.suggestedAlternative!, activeDraftIdx)}
                          className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-xxs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          Use this suggestion
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 2: LIVE LINKEDIN PREVIEW & EXPORTS (RHS) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* LinkedIn Mockup Render */}
                  <div className="space-y-2">
                    <span className="text-xxs uppercase tracking-wider font-bold text-slate-400 block px-1">How it looks on LinkedIn</span>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 font-sans text-sm select-none">
                      {/* LinkedIn Header */}
                      <div className="flex gap-3 items-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center border-2 border-white shadow-md">
                          {profile.name ? profile.name.split(" ").map(n=>n[0]).join("") : "CR"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight flex items-center gap-1 text-xs">
                            {profile.name || "Rohit Katyal"} 
                            <span className="text-slate-400 font-normal">· 1st</span>
                          </div>
                          <div className="text-slate-500 leading-none text-[10px] mt-0.5 max-w-[200px] truncate">{profile.identity}</div>
                          <div className="text-slate-400 text-[9px] mt-0.5 leading-none">1h · Edited · 🌐</div>
                        </div>
                      </div>

                      {/* LinkedIn Body text block */}
                      <div className="text-slate-800 leading-relaxed text-xs break-words whitespace-pre-wrap mb-4 font-sans select-text">
                        {draft.text}
                      </div>

                      {/* Mock reactions */}
                      <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-500 text-[11px] font-semibold">
                        <button className="flex items-center gap-1 hover:bg-slate-50 py-1 px-2 rounded transition-colors">👍 Like</button>
                        <button className="flex items-center gap-1 hover:bg-slate-50 py-1 px-2 rounded transition-colors">💬 Comment</button>
                        <button className="flex items-center gap-1 hover:bg-slate-50 py-1 px-2 rounded transition-colors">🔁 Repost</button>
                        <button className="flex items-center gap-1 hover:bg-slate-50 py-1 px-2 rounded transition-colors">✈️ Send</button>
                      </div>
                    </div>
                  </div>

                  {/* Publish & Export Actions Panel */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-sm text-slate-900">Publish or Save Draft</h4>
                    
                    <div className="space-y-2">
                      {/* Copy to clipboard */}
                      <button
                        onClick={() => handleCopyText(draft)}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-between border ${
                          copiedId === draft.id 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Copy className="w-4 h-4" /> 
                          {copiedId === draft.id ? "Copied to Clipboard!" : "Copy Post to Clipboard"}
                        </span>
                        {copiedId === draft.id && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                      </button>

                      {/* Export to Notion */}
                      <button
                        onClick={() => handlePublishOrSave(draft, activeDraftIdx, "notion_saved")}
                        disabled={draft.status === "notion_saved" || draft.status === "published"}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border text-left ${
                          draft.status === "notion_saved"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700 opacity-85"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1">
                          <p>{draft.status === "notion_saved" ? "Saved to Notion History Log!" : "Export / Save to Notion DB Log"}</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">Appends this post to your offline strategic logger</p>
                        </div>
                      </button>

                      {/* Publish Direct */}
                      <button
                        onClick={() => handlePublishOrSave(draft, activeDraftIdx, "published")}
                        disabled={draft.status === "published"}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border text-left ${
                          draft.status === "published"
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/10 hover:-translate-y-0.5"
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-yellow-300 shrink-0 animate-pulse" />
                        <div className="flex-1">
                          <p>{draft.status === "published" ? "🎉 Post Published Successfully!" : "Simulate LinkedIn Auto-Publish"}</p>
                          <p className={`text-[10px] font-normal mt-0.5 ${draft.status === "published" ? "text-emerald-100" : "text-slate-400"}`}>
                            Simulates posting directly to LinkedIn and tracking early performance
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] text-slate-600 leading-normal">
                      <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <p>
                        Every feedback revision you write or manual change you apply helps Cadence optimize. The strategy engine studies edits to calibrate the tone calibration rules.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Navigation Footers */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <button
              onClick={() => setPipelineStep(1)}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Recalibrate Hooks
            </button>

            <button
              onClick={() => setPipelineStep(3)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 font-bold text-sm transition-all shadow-md flex items-center gap-2"
            >
              Complete Week Session <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* PIPELINE STEP 3: SESSION COMPLETED */}
      {!loading && pipelineStep === 3 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="max-w-xl mx-auto text-center py-12 space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Week Content Finalized!</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              You approved and drafted your LinkedIn content strategy for the week. The strategy logs are saved to your profile.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left space-y-3">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Summary of this session:</h4>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span>Selected topics:</span>
                <span className="font-bold text-slate-800">{selectedTopicIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Posts drafted:</span>
                <span className="font-bold text-slate-800">{drafts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Published / Saved:</span>
                <span className="font-bold text-emerald-600">{drafts.filter(d => d.status !== "draft").length}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-4">
            <button
              onClick={resetPipeline}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Start New Pipeline
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
