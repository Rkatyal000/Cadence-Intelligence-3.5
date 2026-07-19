import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, BookOpen, MessageSquareCode, Users, Award, ShieldAlert, Sparkles, Check, Edit2 } from "lucide-react";
import { Story } from "../types";

interface StoryBankProps {
  stories: Story[];
  onAddStory: (story: Story) => void;
  onRemoveStory: (id: string) => void;
}

export default function StoryBank({ stories, onAddStory, onRemoveStory }: StoryBankProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Career Lesson");
  const [text, setText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const categories = [
    { name: "Career Lesson", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-100" },
    { name: "Technical Challenge", icon: MessageSquareCode, color: "bg-purple-50 text-purple-700 border-purple-100" },
    { name: "Team & Leadership", icon: Users, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { name: "Major Milestone", icon: Award, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { name: "Hard-Learned Failure", icon: ShieldAlert, color: "bg-rose-50 text-rose-700 border-rose-100" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    const newStory: Story = {
      id: `story-${Date.now()}`,
      title: title.trim(),
      category,
      text: text.trim()
    };

    onAddStory(newStory);
    setTitle("");
    setText("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-100 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Personal Story Bank</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
            Ghostwriting relies on real anecdotes. Put 3-5 real moments—wins, failures, or turning points here. Cadence will inject them seamlessly into your drafts.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Story
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Log a New Experience
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Story Heading / Catchphrase</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Rejecting a $120k tech offer to work for a 4-person startup"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    required
                    id="story_title_input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    {categories.map((c, idx) => (
                      <option key={idx} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Raw Details & Takeaway (Write freely, like a journal)</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="Provide raw names, numbers, failures, or realizations. E.g., 'In 2024, I turned down Google because I wanted speed. First month at startup, we spent 2 weeks arguing about button padding. I realized corporate structure has benefits...'"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                    required
                    id="story_details_input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Save to Story Bank
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stories.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 bg-white border border-slate-100 rounded-2xl">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700">Your Story Bank is empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add stories about technical challenges, failures, and career changes to give your AI writer raw human experiences to draw from.
            </p>
          </div>
        ) : (
          stories.map((story) => {
            const cat = categories.find(c => c.name === story.category) || categories[0];
            const CatIcon = cat.icon;

            return (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xxs font-bold uppercase rounded-lg border ${cat.color}`}>
                      <CatIcon className="w-3 h-3" /> {story.category}
                    </span>
                    
                    <button
                      onClick={() => onRemoveStory(story.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{story.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{story.text}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Story is Active for Post Expansion
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
