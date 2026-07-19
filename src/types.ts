export interface VoicePreference {
  formality: string;
  sentenceLength: string;
  customRules: string;
  keyTraits?: string[];
  suggestedRules?: string[];
}

export interface FormatRules {
  emojiUse: string;
  hashtagsCount: string;
  ctaStyle: string;
}

export interface Profile {
  name: string;
  identity: string;
  audience: string;
  goal: string;
  contentPillars: string[];
  publishingTarget: "notion" | "linkedin" | "draft-only";
  notionPage?: string;
  voicePreference: VoicePreference;
  formatRules: FormatRules;
  hasCompletedSetup: boolean;
}

export interface Story {
  id: string;
  title: string;
  category: string;
  text: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  contentPillar: string;
  angle: string;
  reason: string;
  status: "pending" | "selected" | "skipped";
}

export interface Hook {
  id: string;
  text: string;
  patternName: string;
  explanation: string;
}

export interface DraftPost {
  id: string;
  topicId: string;
  topicTitle: string;
  pillar: string;
  text: string;
  status: "draft" | "approved" | "published" | "notion_saved" | "skipped";
  wordCount: number;
  qualityChecks: string[];
  score?: number;
  strengths?: string[];
  improvements?: string[];
  suggestedAlternative?: string;
  authorEmail?: string;
  authorName?: string;
  authorAvatar?: string;
  impressions?: number;
  likes?: number;
  shares?: number;
  engagementRate?: number;
}

export interface StrategyRecommendation {
  title: string;
  description: string;
  expectedImpact: "High" | "Medium" | "Low";
}

export interface ContentMix {
  pillar: string;
  percentage: number;
}

export interface StrategyReview {
  strategyScore: number;
  recommendations: StrategyRecommendation[];
  idealContentMix: ContentMix[];
}

export interface CareerAchievement {
  title: string;
  description: string;
  badgeId: string;
  unlocked: boolean;
}

export interface CrossVerificationItem {
  item: string;
  status: "verified" | "warning" | "conflict";
  evidence: string;
  recommendation: string;
}

export interface ATSAnalysis {
  email: string;
  phone: string;
  location: string;
  score: number;
  formattedWell: boolean;
  contactFound: boolean;
  details: string;
  improvements: string[];
}

export interface BulletRewrite {
  original: string;
  optimized: string;
  metricFocus: string;
  impact: string;
}

export interface RecruiterSimulation {
  assessment: string;
  response: string;
  clickProbability: number;
  reasoning: string;
  criticalFails: string[];
  quickWins: string[];
}

export interface HiringManagerSimulation {
  keyDifferentiator: string;
  businessImpactScore: number;
  ownershipMindsetAdvice: string;
  scenarioQuestions: string[];
}

export interface SkillIntelligence {
  technicalMatch: string[];
  gapSkills: string[];
  trendingSkillsInDomain: string[];
}

export interface CareerRoadmapPhase {
  phase: string;
  duration: string;
  focus: string;
  actionItems: string[];
  metricGoal: string;
}

export interface JDEnhancement {
  jdRequirement: string;
  resumeStatus: string;
  recommendedAdjustment: string;
}

export interface JDMatch {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  structuralIssues: string[];
  pointToPointEnhancements: JDEnhancement[];
}

export interface CareerIntelligenceReport {
  candidateName: string;
  targetRole: string;
  targetCompany: string;
  industry: string;
  experienceLevel: string;
  overallScore: number;
  linkedinScore: number;
  resumeScore: number;
  atsScore: number;
  recruiterScore: number;
  hiringManagerScore: number;
  brandScore: number;
  growthScore: number;
  leadershipScore: number;
  readinessScore: number;
  gamification: {
    xpLevel: number;
    xpPoints: number;
    nextLevelXp: number;
    weeklyStreak: number;
    achievements: CareerAchievement[];
  };
  crossVerification: CrossVerificationItem[];
  atsAnalysis: ATSAnalysis;
  bulletRewrites: BulletRewrite[];
  recruiterSimulation: RecruiterSimulation;
  hiringManagerSimulation: HiringManagerSimulation;
  skillIntelligence: SkillIntelligence;
  linkedinOptimization: {
    headlineCritique: string;
    suggestedHeadlines: string[];
    aboutSnippet: string;
    bannerAdvice: string;
  };
  careerRoadmap: CareerRoadmapPhase[];
  expectedImpact: {
    recruiterResponseIncrease: string;
    atsImprovementMultiplier: string;
    salaryBoostPotential: string;
  };
  jdMatch?: JDMatch;
}

