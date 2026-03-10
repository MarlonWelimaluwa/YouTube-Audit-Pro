'use client';
import { useState } from 'react';

type ChannelData = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  auditDate: string;
  thumbnail: string;
  country: string;
  createdYear: string;
  subscribers: string;
  totalViews: string;
  totalVideos: number;
  overallScore: number;
  grade: string;
  brandingScore: number;
  contentScore: number;
  seoScore: number;
  engagementScore: number;
  monetizationScore: number;
  growthScore: number;
  summary: string;
  revenueOpportunity: string;
  channelStats: {
    avgViewsPerVideo: string;
    uploadFrequency: string;
    lastUpload: string;
    estimatedMonthlyViews: string;
    viewToSubRatio: string;
    channelAge: string;
  };
  topVideos: {
    title: string;
    views: string;
    likes: string;
    whatWorked: string;
  }[];
  brandingAudit: {
    item: string;
    status: string;
    issue: string;
    fix: string;
  }[];
  seoAudit: {
    item: string;
    status: string;
    current: string;
    issue: string;
    fix: string;
  }[];
  contentAudit: {
    item: string;
    status: string;
    issue: string;
    fix: string;
  }[];
  engagementAudit: {
    item: string;
    status: string;
    issue: string;
    fix: string;
  }[];
  monetizationAudit: {
    item: string;
    status: string;
    current: string;
    issue: string;
    fix: string;
  }[];
  growthStrategy: {
    immediate: string[];
    thisWeek: string[];
    thisMonth: string[];
    next90Days: string[];
  };
  topFixes: string[];
  criticalIssues: {
    title: string;
    impact: string;
    fix: string;
  }[];
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ChannelData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadingSteps = [
    'Fetching channel data from YouTube API...',
    'Analyzing top performing videos...',
    'Auditing SEO & discoverability...',
    'Checking monetization signals...',
    'Generating growth strategy with AI...',
  ];

  function extractJSON(text: string): string {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No valid JSON found');
    cleaned = cleaned.slice(start, end + 1);
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    cleaned = cleaned.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, '');
    try { JSON.parse(cleaned); return cleaned; } catch {
      cleaned = cleaned.replace(/\u2018|\u2019/g, "\'").replace(/\u201c|\u201d/g, '\\"').replace(/\r/g, '\\r');
      try { JSON.parse(cleaned); return cleaned; }
      catch (e2) { throw new Error(`JSON parse failed: ${e2 instanceof Error ? e2.message : String(e2)}`); }
    }
  }

  async function callGemini(system: string, user: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
          }),
        }
    );
    const d = await res.json();
    if (d.error) throw new Error(`Gemini error: ${d.error.message}`);
    const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!raw) throw new Error('Empty response from Gemini');
    return extractJSON(raw);
  }

  function formatNum(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  async function runAudit() {
    if (!url) { setError('Please enter a YouTube channel URL or handle.'); return; }
    setLoading(true); setError(''); setResult(null); setLoadingStep(0);
    const interval = setInterval(() => setLoadingStep(s => Math.min(s + 1, loadingSteps.length - 1)), 2800);
    try {
      // Step 1: Fetch YouTube data from server (fast, no timeout risk)
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to fetch channel data');

      const { channelData } = data;
      const { channelInfo, topVideos, computed } = channelData;
      const {
        uploadFreq, lastUpload, avgViews, viewToSubRatio, channelAgeYears,
        monetizationEligible, nearMonetization, videosWithTags, videosWithChapters,
        descriptionAvgLength, hasAffiliateLinks, avgViewsFormatted,
        subscribersFormatted, totalViewsFormatted, auditDate
      } = computed;

      setLoadingStep(2);

      // Step 2: Build prompt with real data
      const affiliateStatus = hasAffiliateLinks ? 'warn' : 'fail';
      const affiliateCurrent = hasAffiliateLinks ? 'affiliate links detected in descriptions' : 'no affiliate links found in top video descriptions';

      const SYSTEM = `You are the "ChannelAudit AI Engine" — a world-class YouTube growth strategist with deep expertise in the 2026 YouTube algorithm, SEO, content strategy, monetization and channel psychology.

You have helped thousands of creators go from zero to monetized. You know exactly why channels fail and exactly what fixes them. You are brutally honest, specific and data-driven. You never give generic advice.

YOUTUBE 2026 ALGORITHM FACTS YOU MUST APPLY:

CLICK-THROUGH RATE (CTR):
- Average CTR is 2-10%. Below 2% means your thumbnails or titles are failing
- CTR x Watch Time = YouTube's #1 ranking signal
- Thumbnails with human faces get 38% more clicks
- Red, yellow and high-contrast thumbnails outperform in most niches
- Title must create curiosity gap or promise clear value — "How I" "Why I" "The Truth About" consistently outperform generic titles
- First 24-48 hours of a video's performance determines if YouTube pushes it or buries it

WATCH TIME & RETENTION:
- Average viewer retention is 40-50%. Below 30% = YouTube stops recommending
- First 30 seconds are critical — most drops happen here
- Pattern interrupts every 60-90 seconds keep retention high
- Videos 8-15 minutes perform best for ad revenue (mid-roll ads kick in at 8 min)
- End screens in last 20 seconds — channel with end screens gets 3x more next-video views

SEO & DISCOVERABILITY:
- YouTube is the world's #2 search engine — treat every video like a Google SEO article
- Title: primary keyword in first 60 characters, under 70 chars total to avoid truncation
- Description: first 2-3 lines appear in search — must contain primary keyword naturally
- Description should be 200-500 words minimum for proper indexing
- Tags: still matter for related videos sidebar — use 10-15 specific tags
- Chapters/timestamps: boost search visibility and increase average watch time
- Hashtags: 3-5 relevant hashtags in description — not in title
- Custom thumbnails: channels without custom thumbnails rank lower

CHANNEL SEO:
- Channel description: 1000 characters minimum, keyword-rich, tells YouTube what your channel is about
- Channel keywords in settings: most creators leave this empty — huge missed opportunity
- Playlists: organize content into playlists — boosts session time which boosts channel ranking
- Consistent upload schedule: YouTube rewards channels that upload same day/time weekly

ENGAGEMENT SIGNALS:
- Comments in first 60 minutes: YouTube's strongest quality signal — ask specific questions not "comment below"
- Like-to-view ratio: healthy is 4-8%. Below 2% = content is disappointing viewers
- Shares: controversial or emotional content gets shared — drives external traffic
- Saves: tutorial and how-to content gets saved — boosts long-term views
- Community posts: channels with community tab posts get 15-20% more channel page visits
- Pinned comment strategy: pin a comment that asks a question — drives more comments

MONETIZATION:
- AdSense threshold: 1,000 subscribers + 4,000 watch hours OR 10M Shorts views in 90 days
- CPM varies wildly: Finance/Business ($15-50 CPM), Tech ($8-20), Gaming ($2-5), Entertainment ($1-4)
- Channel Memberships: available at 500 subs — most creators never activate this
- Super Thanks/Super Chat: needs to be enabled manually in YouTube Studio
- Affiliate marketing in descriptions: most untapped revenue stream for small channels
- Merchandise shelf: available at 10,000 subscribers via YouTube Shopping
- Sponsorships: brands pay $20-50 per 1,000 views for dedicated segments

NICHE & CONTENT STRATEGY:
- Niche clarity: YouTube algorithm needs to know who to show your videos to — mixed niche channels get suppressed
- The 3 video types that grow channels fastest: Search-based (SEO), Trending/News, and Evergreen
- Series content: playlists of related videos keep viewers watching longer = more subscribers
- Shorts strategy: Shorts can grow subscribers 3-5x faster but must funnel to long-form
- Posting consistency beats posting quality — YouTube rewards predictability
- Best upload times: Tuesday-Thursday 2-4pm local audience time, or when analytics shows peak activity

THUMBNAIL & TITLE PSYCHOLOGY:
- The "curiosity gap": hint at something without revealing it fully — "I tried this for 30 days..."
- Numbers in titles: "7 Ways" "Top 10" "3 Mistakes" consistently outperform non-numbered titles
- Emotional triggers: fear, curiosity, surprise, inspiration — pick one per video
- Mobile optimization: thumbnails must be readable at 120x68px (small mobile view)

Be brutally honest. Use real numbers from the channel data provided. Every insight must be tied to their actual stats. No fluff. No padding.
OUTPUT: ONLY valid JSON. No markdown. No preamble.`;

      const userPrompt = `Audit this YouTube channel and generate a complete professional growth report.

=== REAL CHANNEL DATA (use these exact numbers) ===
Channel Name: ${channelInfo.channelName}
Channel URL: https://youtube.com/${channelInfo.customUrl || `channel/${channelData.channelId}`}
Country: ${channelInfo.country}
Channel Created: ${channelInfo.createdAt ? new Date(channelInfo.createdAt).getFullYear() : 'Unknown'} (${channelAgeYears} years old)
Subscribers: ${subscribersFormatted} (${channelInfo.subscribers} exact)
Total Views: ${totalViewsFormatted}
Total Videos: ${channelInfo.totalVideos}
Custom URL: ${channelInfo.customUrl || 'NOT SET — still using default URL'}
Channel Keywords Set: ${channelInfo.keywords ? 'YES: ' + channelInfo.keywords.slice(0, 100) : 'NO — completely empty'}
Channel Description Length: ${channelInfo.description.length} characters
Has Channel Art/Banner: ${channelInfo.brandingSettings.hasArt ? 'YES' : 'NO — missing banner'}

=== CONTENT PERFORMANCE DATA ===
Upload Frequency: ${uploadFreq}
Last Upload: ${lastUpload}
Avg Views Per Video (channel total): ${avgViewsFormatted}
View-to-Subscriber Ratio: ${viewToSubRatio}
Videos With Tags: ${videosWithTags}/${topVideos.length}
Videos With Chapters: ${videosWithChapters}/${topVideos.length}
Avg Description Length: ${descriptionAvgLength} characters

=== TOP 5 VIDEOS BY VIEWS ===
${topVideos.map((v: {title: string; views: number; likes: number; comments: number; publishedAt: string; hasChapters: boolean; tags: string[]}, i: number) => `
${i + 1}. "${v.title}"
   Views: ${formatNum(v.views)} | Likes: ${formatNum(v.likes)} | Comments: ${formatNum(v.comments)}
   Like Ratio: ${v.views > 0 ? ((v.likes / v.views) * 100).toFixed(1) : 0}%
   Comment Ratio: ${v.views > 0 ? ((v.comments / v.views) * 100).toFixed(2) : 0}%
   Has Chapters: ${v.hasChapters ? 'YES' : 'NO'}
   Tags Count: ${v.tags.length}
   Published: ${new Date(v.publishedAt).toLocaleDateString()}
`).join('')}

=== MONETIZATION STATUS ===
Monetization Eligible (1000 subs): ${monetizationEligible ? 'YES' : 'NO'}
Near Monetization: ${nearMonetization ? 'YES — only ' + (1000 - channelInfo.subscribers) + ' subscribers away' : 'N/A'}
Subscribers needed: ${monetizationEligible ? 'Already eligible' : (1000 - channelInfo.subscribers) + ' more needed'}

=== AUDIT DATE ===
${auditDate}

INSTRUCTIONS:
- Use the EXACT numbers from above — never invent different stats
- Every single insight MUST reference their actual data (mention specific numbers)
- Be brutally honest — if something is bad, say it's bad and exactly why
- Give SPECIFIC fixes — not "improve your thumbnails" but "add a face photo + one emotion word + high-contrast background to every thumbnail"
- Revenue opportunity must estimate realistic monthly income potential based on their niche and views
- Growth strategy must be a realistic 90-day plan specific to their situation
- Scores must reflect reality — a channel with 50 videos and no tags should score low on SEO

Return this EXACT JSON:
{
  "channelId": "${channelData.channelId}",
  "channelName": "${channelInfo.channelName}",
  "channelUrl": "https://youtube.com/${channelInfo.customUrl || `channel/${channelData.channelId}`}",
  "auditDate": "${auditDate}",
  "thumbnail": "${channelInfo.thumbnail}",
  "country": "${channelInfo.country}",
  "createdYear": "${channelInfo.createdAt ? new Date(channelInfo.createdAt).getFullYear() : 'Unknown'}",
  "subscribers": "${subscribersFormatted}",
  "totalViews": "${totalViewsFormatted}",
  "totalVideos": ${channelInfo.totalVideos},
  "overallScore": 62,
  "grade": "C",
  "brandingScore": 55,
  "contentScore": 60,
  "seoScore": 45,
  "engagementScore": 58,
  "monetizationScore": ${monetizationEligible ? 65 : 30},
  "growthScore": 50,
  "summary": "2-3 sentences of brutally honest verdict — reference their actual subscriber count, view count and the biggest thing holding them back",
  "revenueOpportunity": "Specific realistic estimate — based on ${avgViewsFormatted} avg views and their niche, estimate monthly AdSense potential, what they need to do to double it, and what other revenue streams they are missing",
  "channelStats": {
    "avgViewsPerVideo": "${avgViewsFormatted}",
    "uploadFrequency": "${uploadFreq}",
    "lastUpload": "${lastUpload}",
    "estimatedMonthlyViews": "calculate based on upload frequency and avg views",
    "viewToSubRatio": "${viewToSubRatio}",
    "channelAge": "${channelAgeYears} years"
  },
  "topVideos": [
    ${topVideos.slice(0, 2).map((v: {title: string; views: number; likes: number}) => `{
      "title": "${v.title.replace(/"/g, '\"').slice(0, 80)}",
      "views": "${formatNum(v.views)}",
      "likes": "${formatNum(v.likes)}",
      "whatWorked": "specific reason this video outperformed based on title, engagement ratio and content type"
    }`).join(',')}
  ],
  "criticalIssues": [
    {
      "title": "most critical issue holding this channel back",
      "impact": "specific impact on growth or revenue with numbers",
      "fix": "exact step-by-step fix"
    },
    {
      "title": "second critical issue",
      "impact": "specific impact",
      "fix": "exact fix"
    },
    {
      "title": "third critical issue",
      "impact": "specific impact",
      "fix": "exact fix"
    }
  ],
  "brandingAudit": [
    {"item": "Channel Banner/Art", "status": "${channelInfo.brandingSettings.hasArt ? 'pass' : 'fail'}", "issue": "specific issue based on real data", "fix": "exact fix"},
    {"item": "Channel Description", "status": "${channelInfo.description.length < 200 ? 'fail' : channelInfo.description.length < 500 ? 'warn' : 'pass'}", "issue": "description is ${channelInfo.description.length} characters — specific issue", "fix": "exact fix with what to include"},
    {"item": "Custom URL", "status": "${channelInfo.customUrl ? 'pass' : 'fail'}", "issue": "specific issue", "fix": "exact fix"},
    {"item": "Channel Keywords", "status": "${channelInfo.keywords ? 'pass' : 'fail'}", "issue": "specific issue", "fix": "exact fix with examples"},
    {"item": "Channel Trailer", "status": "warn", "issue": "specific issue about channel trailer", "fix": "exact fix"}
  ],
  "seoAudit": [
    {"item": "Video Title Optimization", "status": "warn", "current": "based on top video titles analyzed", "issue": "specific SEO issue found in their actual titles", "fix": "exact title formula with example using their niche"},
    {"item": "Video Descriptions", "status": "${descriptionAvgLength < 200 ? 'fail' : descriptionAvgLength < 400 ? 'warn' : 'pass'}", "current": "avg ${descriptionAvgLength} characters", "issue": "specific issue", "fix": "exact fix"},
    {"item": "Tags Usage", "status": "${videosWithTags < topVideos.length * 0.5 ? 'fail' : 'warn'}", "current": "${videosWithTags}/${topVideos.length} videos have tags", "issue": "specific issue", "fix": "exact tag strategy for their niche"},
    {"item": "Video Chapters/Timestamps", "status": "${videosWithChapters < topVideos.length * 0.5 ? 'fail' : 'warn'}", "current": "${videosWithChapters}/${topVideos.length} videos have chapters", "issue": "specific issue", "fix": "exact fix"},
    {"item": "Hashtag Strategy", "status": "warn", "current": "inconsistent usage", "issue": "specific hashtag issue", "fix": "exact hashtag strategy"},
    {"item": "Playlist Organization", "status": "warn", "current": "needs assessment", "issue": "specific playlist SEO issue", "fix": "exact fix"}
  ],
  "contentAudit": [
    {"item": "Upload Consistency", "status": "${uploadFreq === 'Irregular' ? 'fail' : uploadFreq === 'Monthly' ? 'warn' : 'pass'}", "issue": "uploading ${uploadFreq} — specific impact on algorithm", "fix": "exact recommended schedule for their situation"},
    {"item": "Niche Clarity", "status": "warn", "issue": "specific assessment based on their top video titles", "fix": "exact niche focus recommendation"},
    {"item": "Video Length Strategy", "status": "warn", "issue": "specific issue about video lengths based on data", "fix": "exact length recommendation for their niche and monetization"},
    {"item": "Thumbnail Strategy", "status": "warn", "issue": "specific thumbnail issue", "fix": "exact thumbnail formula for their niche"},
    {"item": "Content Mix (Shorts vs Long)", "status": "warn", "issue": "specific issue about content type mix", "fix": "exact ratio recommendation"},
    {"item": "Series & Playlists", "status": "warn", "issue": "specific series content issue", "fix": "exact fix with content ideas for their niche"}
  ],
  "engagementAudit": [
    {"item": "Like-to-View Ratio", "status": "${topVideos.length > 0 && topVideos[0].views > 0 && (topVideos[0].likes / topVideos[0].views) < 0.02 ? 'fail' : 'warn'}", "current": "${topVideos.length > 0 && topVideos[0].views > 0 ? ((topVideos[0].likes / topVideos[0].views) * 100).toFixed(1) : 'N/A'}% on top video", "issue": "specific engagement issue", "fix": "exact fix to boost likes"},
    {"item": "Comment Engagement", "status": "warn", "current": "based on comment ratios", "issue": "specific comment engagement issue", "fix": "exact CTA formula that drives comments in their niche"},
    {"item": "Community Tab Usage", "status": "${channelInfo.subscribers >= 500 ? 'warn' : 'fail'}", "current": "${channelInfo.subscribers >= 500 ? 'Eligible — community tab activity not detectable via API' : 'Not yet eligible (need 500 subs)'}", "issue": "specific community tab issue", "fix": "exact community post strategy"},
    {"item": "End Screens & Cards", "status": "warn", "issue": "specific end screen issue based on their video data", "fix": "exact end screen strategy"},
    {"item": "Call-to-Action Strategy", "status": "warn", "issue": "specific CTA issue", "fix": "exact CTA placement and wording for their niche"}
  ],
  "monetizationAudit": [
    {"item": "YouTube Partner Program", "status": "${monetizationEligible ? 'pass' : 'fail'}", "current": "${channelInfo.subscribers} subscribers / 1000 needed", "issue": "${monetizationEligible ? 'Already eligible' : 'Need ' + (1000 - channelInfo.subscribers) + ' more subscribers'}", "fix": "${monetizationEligible ? 'Enable monetization in YouTube Studio if not already done' : 'Specific fastest path to 1000 subscribers for their niche'}"},
    {"item": "Channel Memberships", "status": "${channelInfo.subscribers >= 500 ? 'warn' : 'fail'}", "current": "${channelInfo.subscribers >= 500 ? 'Eligible — activation status not detectable via API' : 'Not eligible yet'}", "issue": "specific membership issue", "fix": "exact membership tier strategy"},
    {"item": "Affiliate Marketing", "status": "${affiliateStatus}", "current": "${affiliateCurrent}", "issue": "specific affiliate opportunity for their niche", "fix": "exact affiliate strategy with specific programs for their content type"},
    {"item": "Sponsorship Readiness", "status": "${channelInfo.subscribers >= 1000 ? 'warn' : 'fail'}", "current": "${subscribersFormatted} subscribers", "issue": "specific sponsorship readiness assessment", "fix": "exact steps to attract first sponsor"},
    {"item": "Super Thanks & Donations", "status": "warn", "current": "Super Thanks status not detectable via API — enable manually in YouTube Studio", "issue": "specific issue", "fix": "exact steps to enable and promote"}
  ],
  "topFixes": [
    "Most impactful fix with specific steps — reference their actual data",
    "Second fix with specific steps",
    "Third fix",
    "Fourth fix",
    "Fifth fix"
  ],
  "growthStrategy": {
    "immediate": [
      "Specific action to do TODAY based on their biggest gap",
      "Second today action",
      "Third today action"
    ],
    "thisWeek": [
      "Specific action this week",
      "Second this week action",
      "Third this week action"
    ],
    "thisMonth": [
      "Specific action this month",
      "Second this month action",
      "Third this month action"
    ],
    "next90Days": [
      "Specific 90-day goal with milestone",
      "Second 90-day action",
      "Third 90-day action"
    ]
  }
}`;

      setLoadingStep(3);

      // Step 3: Call Gemini from browser — no Vercel timeout possible
      const raw = await callGemini(SYSTEM, userPrompt);
      const parsed = JSON.parse(raw);

      // Hard overrides — always use real API data, never Gemini's guesses
      parsed.channelId = channelData.channelId;
      parsed.channelName = channelInfo.channelName;
      parsed.thumbnail = channelInfo.thumbnail;
      parsed.subscribers = subscribersFormatted;
      parsed.totalViews = totalViewsFormatted;
      parsed.totalVideos = channelInfo.totalVideos;
      parsed.channelStats.avgViewsPerVideo = avgViewsFormatted;
      parsed.channelStats.uploadFrequency = uploadFreq;
      parsed.channelStats.lastUpload = lastUpload;
      parsed.channelStats.viewToSubRatio = viewToSubRatio;
      parsed.overallScore = Math.round(
          (parsed.brandingScore + parsed.contentScore + parsed.seoScore +
              parsed.engagementScore + parsed.monetizationScore + parsed.growthScore) / 6
      );
      const s = parsed.overallScore;
      parsed.grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

      clearInterval(interval);
      setResult(parsed);
      setActiveTab('overview');
    } catch (e: unknown) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : 'Audit failed. Check the URL and try again.');
    }
    setLoading(false);
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  }

  function statusColor(s: string) {
    if (s === 'good' || s === 'pass') return '#22c55e';
    if (s === 'warn' || s === 'needs-improvement') return '#f59e0b';
    return '#ef4444';
  }

  function statusBadge(s: string) {
    if (s === 'good' || s === 'pass') return { label: 'GOOD', bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' };
    if (s === 'warn' || s === 'needs-improvement') return { label: 'WARN', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
    return { label: 'FAIL', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
  }

  async function downloadReport() {
    if (!result) return;
    const r = result;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 14, CW = 182;
    let y = 0;

    // Strip markdown bold/italic and non-latin unicode chars for PDF
    function clean(t: string): string {
      return (t || '')
          .replace(/\*\*(.*?)\*\*/g, '$1')   // remove **bold**
          .replace(/\*(.*?)\*/g, '$1')         // remove *italic*
          .replace(/[^\x00-\x7F]/g, (c) => {   // replace non-ASCII with ?
            // Keep common punctuation that jsPDF handles
            const safe: Record<string, string> = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...' };
            return safe[c] || '';
          });
    }
    function np() { doc.addPage(); y = M; }
    function cy(n: number) { if (y + n > H - 20) np(); }
    function wrap(t: string, w: number, fs: number): string[] { doc.setFontSize(fs); return doc.splitTextToSize(clean(t), w); }
    function sc(s: number): [number, number, number] { return s >= 80 ? [34, 197, 94] : s >= 60 ? [245, 158, 11] : [239, 68, 68]; }
    function stc(s: string): [number, number, number] { return (s === 'good' || s === 'pass') ? [34, 197, 94] : (s === 'warn' || s === 'needs-improvement') ? [245, 158, 11] : [239, 68, 68]; }
    function bullet() { return '>'; }

    // ── COVER ──
    doc.setFillColor(8, 8, 8);
    doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(255, 0, 0);
    doc.rect(0, 0, W, 68, 'F');

    // YouTube play icon
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(M, 14, 22, 16, 2, 2, 'F');
    doc.setFillColor(255, 0, 0);
    doc.triangle(M + 8, 17, M + 8, 26, M + 18, 21.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('YouTube Channel Audit', M + 28, 24);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Complete Growth & Revenue Report', M + 28, 33);
    doc.setFontSize(9);
    doc.text(clean(r.channelName), M, 48);
    doc.text(clean(r.auditDate), M, 57);

    // Grade box
    doc.setFillColor(8, 8, 8);
    doc.roundedRect(W - 52, 10, 38, 48, 4, 4, 'F');
    doc.setTextColor(...sc(r.overallScore));
    doc.setFontSize(28); doc.setFont('helvetica', 'bold');
    doc.text(r.grade, W - 33, 36, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(180, 180, 180);
    doc.text(`${r.overallScore}/100`, W - 33, 48, { align: 'center' });

    // Score boxes
    const scores = [
      { l: 'Branding', v: r.brandingScore },
      { l: 'Content', v: r.contentScore },
      { l: 'SEO', v: r.seoScore },
      { l: 'Engagement', v: r.engagementScore },
    ];
    let sx = M;
    scores.forEach(s => {
      doc.setFillColor(20, 20, 20);
      doc.roundedRect(sx, 82, 40, 24, 3, 3, 'F');
      doc.setTextColor(...sc(s.v));
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.text(String(s.v), sx + 20, 94, { align: 'center' });
      doc.setFontSize(6.5); doc.setTextColor(120, 120, 120);
      doc.text(s.l.toUpperCase(), sx + 20, 101, { align: 'center' });
      sx += 46;
    });

    // Stats row
    const stats = [
      { l: 'Subscribers', v: r.subscribers },
      { l: 'Total Views', v: r.totalViews },
      { l: 'Videos', v: String(r.totalVideos) },
      { l: 'Upload Freq', v: r.channelStats.uploadFrequency },
    ];
    sx = M;
    stats.forEach(s => {
      doc.setFillColor(15, 15, 15);
      doc.roundedRect(sx, 118, 40, 22, 2, 2, 'F');
      doc.setFillColor(255, 0, 0);
      doc.rect(sx, 118, 3, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(s.v, sx + 22, 128, { align: 'center' });
      doc.setFontSize(6); doc.setTextColor(120, 120, 120);
      doc.text(s.l.toUpperCase(), sx + 22, 135, { align: 'center' });
      sx += 46;
    });

    // Revenue opportunity box
    const revLines = wrap(r.revenueOpportunity || '', CW - 14, 8).slice(0, 6);
    const revH = Math.max(36, 14 + revLines.length * 5.5);
    doc.setFillColor(20, 5, 5);
    doc.roundedRect(M, 152, CW, revH, 4, 4, 'F');
    doc.setFillColor(255, 0, 0);
    doc.rect(M, 152, 3, revH, 'F');
    doc.setTextColor(255, 80, 80); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text('REVENUE OPPORTUNITY', M + 8, 161);
    doc.setTextColor(220, 220, 220); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    revLines.forEach((l: string, i: number) => doc.text(l, M + 8, 169 + i * 5.5));

    // Summary box
    const sumStart = 152 + revH + 8;
    const sumLines = wrap(r.summary || '', CW - 14, 8).slice(0, 6);
    const sumH = Math.max(36, 14 + sumLines.length * 5.5);
    doc.setFillColor(18, 18, 18);
    doc.roundedRect(M, sumStart, CW, sumH, 4, 4, 'F');
    doc.setTextColor(140, 140, 140); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text('AUDIT SUMMARY', M + 8, sumStart + 9);
    doc.setTextColor(200, 200, 200); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    sumLines.forEach((l: string, i: number) => doc.text(l, M + 8, sumStart + 17 + i * 5.5));

    function addFooter(p: number, t: number) {
      doc.setPage(p);
      doc.setFillColor(255, 0, 0);
      doc.rect(0, H - 8, W, 8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7);
      doc.text('YouTube Channel Audit Pro', M, H - 3);
      doc.text(`Page ${p} of ${t}`, W / 2, H - 3, { align: 'center' });
      doc.text(r.channelName, W - M, H - 3, { align: 'right' });
    }

    // ── PAGE 2: CRITICAL ISSUES + TOP FIXES ──
    np();
    doc.setFillColor(255, 0, 0); doc.rect(0, 0, W, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('CRITICAL ISSUES & TOP FIXES', M, 9.5);
    y = 20;

    if (r.criticalIssues?.length > 0) {
      r.criticalIssues.forEach((issue, idx) => {
        const lines = wrap(issue.fix || '', CW - 16, 8);
        const impL = wrap('Impact: ' + (issue.impact || ''), CW - 16, 7.5);
        const bh = Math.max(30, 10 + impL.length * 5 + lines.length * 5 + 8);
        cy(bh + 4);
        doc.setFillColor(18, 5, 5); doc.roundedRect(M, y, CW, bh, 2, 2, 'F');
        doc.setFillColor(255, 0, 0); doc.rect(M, y, 3, bh, 'F');
        doc.setTextColor(255, 100, 100); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(clean(`${idx + 1}. ${issue.title}`), M + 7, y + 8);
        const impactLines = wrap('Impact: ' + (issue.impact || ''), CW - 16, 7.5);
        doc.setTextColor(200, 80, 80); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        impactLines.forEach((l: string, i: number) => doc.text(l, M + 7, y + 15 + i * 5));
        const impactOffset = impactLines.length * 5;
        doc.setTextColor(34, 197, 94);
        lines.forEach((l: string, i: number) => doc.text('> ' + l, M + 7, y + 15 + impactOffset + i * 5));
        y += bh + 4;
      });
    }

    y += 6;
    doc.setFillColor(255, 0, 0); doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('TOP PRIORITY FIXES', M + 4, y + 6.5); y += 13;
    r.topFixes?.forEach((fix, i) => {
      const lines = wrap(fix, CW - 18, 8.5);
      const bh = Math.max(14, 7 + lines.length * 6);
      cy(bh + 3);
      doc.setFillColor(15, 15, 15); doc.roundedRect(M, y, CW, bh, 2, 2, 'F');
      doc.setFillColor(255, 0, 0); doc.circle(M + 6.5, y + bh / 2, 3.5, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text(String(i + 1), M + 6.5, y + bh / 2 + 2.5, { align: 'center' });
      doc.setTextColor(200, 200, 200); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      lines.forEach((l: string, li: number) => doc.text(l, M + 14, y + 7 + li * 5));
      y += bh + 3;
    });

    // ── PAGE 3: SEO + CONTENT ──
    np();
    doc.setFillColor(255, 0, 0); doc.rect(0, 0, W, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('SEO & CONTENT AUDIT', M, 9.5);
    y = 20;

    const auditItems = [...(r.seoAudit || []), ...(r.contentAudit || [])];
    auditItems.forEach(item => {
      const col = stc(item.status);
      const fxL = wrap(item.fix || '', CW - 8, 8);
      const curL = (item as { current?: string }).current ? wrap('Current: ' + (item as { current?: string }).current, CW - 8, 7.5) : [];
      const bh = Math.max(22, 12 + curL.length * 5 + fxL.length * 5);
      cy(bh + 4);
      doc.setFillColor(15, 15, 15); doc.roundedRect(M, y, CW, bh, 2, 2, 'F');
      doc.setFillColor(...col); doc.rect(M, y, 3, bh, 'F');
      const lbl = item.status === 'pass' || item.status === 'good' ? 'GOOD' : item.status === 'warn' ? 'WARN' : 'FAIL';
      doc.setFillColor(...col); doc.roundedRect(M + 5, y + 3, 14, 6, 1, 1, 'F');
      doc.setTextColor(8, 8, 8); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
      doc.text(lbl, M + 12, y + 7.5, { align: 'center' });
      doc.setTextColor(230, 230, 230); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(clean(item.item), M + 22, y + 8);
      let itemY = y + 14;
      if (curL.length > 0) {
        doc.setTextColor(120, 120, 120); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        curL.forEach((l: string, i: number) => { doc.text(l, M + 5, itemY + i * 5); });
        itemY += curL.length * 5;
      }
      doc.setTextColor(34, 197, 94); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      fxL.forEach((l: string, i: number) => doc.text(l, M + 5, itemY + i * 5));
      y += bh + 4;
    });

    // ── PAGE 4: ENGAGEMENT + MONETIZATION ──
    np();
    doc.setFillColor(255, 0, 0); doc.rect(0, 0, W, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('ENGAGEMENT & MONETIZATION', M, 9.5);
    y = 20;

    [...(r.engagementAudit || []), ...(r.monetizationAudit || [])].forEach(item => {
      const col = stc(item.status);
      const fxL2 = wrap(item.fix || '', CW - 8, 8);
      const curL2 = (item as { current?: string }).current ? wrap('Current: ' + (item as { current?: string }).current, CW - 8, 7.5) : [];
      const bh = Math.max(22, 12 + curL2.length * 5 + fxL2.length * 5);
      cy(bh + 4);
      doc.setFillColor(15, 15, 15); doc.roundedRect(M, y, CW, bh, 2, 2, 'F');
      doc.setFillColor(...col); doc.rect(M, y, 3, bh, 'F');
      const lbl2 = item.status === 'pass' || item.status === 'good' ? 'GOOD' : item.status === 'warn' ? 'WARN' : 'FAIL';
      doc.setFillColor(...col); doc.roundedRect(M + 5, y + 3, 14, 6, 1, 1, 'F');
      doc.setTextColor(8, 8, 8); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
      doc.text(lbl2, M + 12, y + 7.5, { align: 'center' });
      doc.setTextColor(230, 230, 230); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(clean(item.item), M + 22, y + 8);
      let itemY2 = y + 14;
      if (curL2.length > 0) {
        doc.setTextColor(120, 120, 120); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        curL2.forEach((l: string, i: number) => { doc.text(l, M + 5, itemY2 + i * 5); });
        itemY2 += curL2.length * 5;
      }
      doc.setTextColor(34, 197, 94); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      fxL2.forEach((l: string, i: number) => doc.text(l, M + 5, itemY2 + i * 5));
      y += bh + 4;
    });

    // ── PAGE 5: GROWTH STRATEGY ──
    np();
    doc.setFillColor(255, 0, 0); doc.rect(0, 0, W, 13, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('90-DAY GROWTH STRATEGY', M, 9.5);
    y = 20;

    const gGroups = [
      { label: 'DO TODAY', items: r.growthStrategy?.immediate, col: [239, 68, 68] as [number, number, number], bg: [25, 8, 8] as [number, number, number] },
      { label: 'THIS WEEK', items: r.growthStrategy?.thisWeek, col: [245, 158, 11] as [number, number, number], bg: [22, 16, 5] as [number, number, number] },
      { label: 'THIS MONTH', items: r.growthStrategy?.thisMonth, col: [34, 197, 94] as [number, number, number], bg: [8, 22, 12] as [number, number, number] },
      { label: 'NEXT 90 DAYS', items: r.growthStrategy?.next90Days, col: [99, 179, 237] as [number, number, number], bg: [8, 15, 22] as [number, number, number] },
    ];
    gGroups.forEach(g => {
      cy(20);
      doc.setFillColor(...g.col); doc.roundedRect(M, y, CW, 9, 2, 2, 'F');
      doc.setTextColor(8, 8, 8); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(g.label, M + 4, y + 6.5); y += 12;
      g.items?.forEach(a => {
        const lines = wrap(a, CW - 14, 8);
        const bh = Math.max(14, 8 + lines.length * 5);
        cy(bh + 3);
        doc.setFillColor(...g.bg); doc.roundedRect(M, y, CW, bh, 2, 2, 'F');
        doc.setTextColor(...g.col); doc.setFontSize(9); doc.text('>', M + 4, y + bh / 2 + 3);
        doc.setTextColor(200, 200, 200); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        lines.forEach((l: string, li: number) => doc.text(l, M + 11, y + 7 + li * 5));
        y += bh + 3;
      });
      y += 6;
    });

    const total = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) addFooter(p, total);
    doc.save(`youtube-audit-${r.channelName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'seo', label: '🔍 SEO' },
    { id: 'content', label: '🎬 Content' },
    { id: 'engagement', label: '💬 Engagement' },
    { id: 'monetization', label: '💰 Monetization' },
    { id: 'growth', label: '🚀 Growth Plan' },
  ];

  const AuditCard = ({ item }: { item: { item: string; status: string; issue: string; fix: string; current?: string } }) => {
    const badge = statusBadge(item.status);
    return (
        <div style={{ padding: '18px 20px', borderRadius: 10, background: '#111', marginBottom: 10, borderLeft: `3px solid ${statusColor(item.status)}`, border: `1px solid #1f1f1f`, borderLeftWidth: 3, borderLeftColor: statusColor(item.status), borderLeftStyle: 'solid' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 5, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: 0.8, lineHeight: 1.5 }}>{badge.label}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0', lineHeight: 1.4 }}>{item.item}</span>
          </div>
          {item.current && <div style={{ fontSize: 12, color: '#555', marginBottom: 5, lineHeight: 1.6 }}>Current: {item.current}</div>}
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.65 }}>{item.issue}</div>
          <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 500, lineHeight: 1.65 }}>→ {item.fix}</div>
        </div>
    );
  };

  return (
      <div style={{ minHeight: '100vh', background: '#080808', fontFamily: "'Barlow', 'DM Sans', sans-serif", color: '#f0f0f0' }}>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:#0d0d0d; } ::-webkit-scrollbar-thumb { background:#ff0000; border-radius:3px; }
        input::placeholder { color:#333; }
        .tab-btn:hover { background: rgba(255,0,0,0.08) !important; color: #ff4444 !important; }
      `}</style>

        {/* NAV */}
        <nav style={{ background: 'rgba(8,8,8,0.97)', borderBottom: '1px solid #1a1a1a', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* YouTube-style logo */}
            <div style={{ width: 38, height: 27, background: '#ff0000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '12px solid white', marginLeft: 2 }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: 'white', letterSpacing: -0.5, lineHeight: 1.3, fontFamily: 'Barlow Condensed' }}>CHANNEL AUDIT PRO</div>
              <div style={{ fontSize: 9, color: '#ff0000', letterSpacing: 2, lineHeight: 1.3 }}>YOUTUBE GROWTH INTELLIGENCE</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#ff0000', background: 'rgba(255,0,0,0.1)', padding: '5px 14px', borderRadius: 4, border: '1px solid rgba(255,0,0,0.25)', fontWeight: 700, letterSpacing: 0.5 }}>
            FREE AUDIT
          </div>
        </nav>

        {/* HERO */}
        {!result && !loading && (
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Red gradient bg */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,0,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
              {/* Grid lines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', padding: '88px 40px 72px', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 3, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', marginBottom: 28 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff0000', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 10, color: '#ff6666', fontWeight: 700, letterSpacing: 2 }}>POWERED BY YOUTUBE DATA API + GEMINI AI</span>
                </div>

                <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 'clamp(42px,7vw,76px)', fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: -1, lineHeight: 1.05, textTransform: 'uppercase', paddingBottom: 6 }}>
                  Why Is Your Channel<br />
                  <span style={{ color: '#ff0000' }}>Not Growing?</span>
                </h1>
                <p style={{ fontSize: 17, color: '#555', maxWidth: 500, margin: '20px auto 48px', lineHeight: 1.8 }}>
                  Enter any YouTube channel. Get a complete audit with exact fixes for SEO, content strategy, engagement and monetization.
                </p>

                {/* INPUT */}
                <div style={{ maxWidth: 620, margin: '0 auto 44px' }}>
                  <div style={{ display: 'flex', gap: 0, background: '#0f0f0f', borderRadius: 8, border: '1px solid #222', overflow: 'hidden', boxShadow: '0 0 40px rgba(255,0,0,0.07)' }}>
                    <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && runAudit()}
                        placeholder="@channelhandle or youtube.com/channel/... or channel name"
                        style={{ flex: 1, padding: '15px 20px', border: 'none', outline: 'none', fontSize: 14, color: '#f0f0f0', background: 'transparent', lineHeight: 1.5 }}
                    />
                    <button onClick={runAudit} style={{ padding: '15px 28px', background: '#ff0000', border: 'none', color: 'white', fontSize: '16px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>
                      AUDIT NOW
                    </button>
                  </div>
                  {error && <div style={{ marginTop: 10, padding: '10px 16px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, lineHeight: 1.6, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
                </div>

                {/* WHAT WE CHECK */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, maxWidth: 680, margin: '0 auto 60px' }}>
                  {[
                    { icon: '🎨', label: 'Branding Audit' },
                    { icon: '🔍', label: 'SEO Analysis' },
                    { icon: '🎬', label: 'Content Strategy' },
                    { icon: '💬', label: 'Engagement Score' },
                    { icon: '💰', label: 'Monetization' },
                    { icon: '🚀', label: '90-Day Growth Plan' },
                  ].map(f => (
                      <div key={f.label} style={{ padding: '12px 16px', borderRadius: 6, background: '#0f0f0f', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{f.icon}</span>
                        <span style={{ fontSize: 12, color: '#666', fontWeight: 600, lineHeight: 1.4 }}>{f.label}</span>
                      </div>
                  ))}
                </div>

                {/* STATS */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 0, borderTop: '1px solid #111', paddingTop: 48, flexWrap: 'wrap' }}>
                  {[
                    { num: '2B+', label: 'logged-in users monthly' },
                    { num: '500hrs', label: 'of video uploaded every minute' },
                    { num: '90%', label: 'of channels never hit 1000 subs' },
                  ].map((s, i) => (
                      <div key={s.label} style={{ flex: 1, minWidth: 180, textAlign: 'center', padding: '0 24px', borderRight: i < 2 ? '1px solid #111' : 'none' }}>
                        <div style={{ fontFamily: 'Barlow Condensed', fontSize: 38, fontWeight: 900, color: '#ff0000', lineHeight: 1.1, paddingBottom: 4 }}>{s.num}</div>
                        <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>{s.label}</div>
                      </div>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* LOADING */}
        {loading && (
            <div style={{ maxWidth: 520, margin: '80px auto 120px', padding: '0 24px', animation: 'fadeUp 0.4s ease' }}>
              <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 48, border: '1px solid #1a1a1a', textAlign: 'center', boxShadow: '0 0 60px rgba(255,0,0,0.05)' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', border: '3px solid #1a1a1a', borderTop: '3px solid #ff0000', margin: '0 auto 28px', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 6, letterSpacing: 0.5, lineHeight: 1.3 }}>AUDITING CHANNEL</div>
                <div style={{ fontSize: 13, color: '#ff4444', marginBottom: 32, lineHeight: 1.6 }}>{loadingSteps[loadingStep]}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                  {loadingSteps.map((s, i) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 4, background: i < loadingStep ? '#ff0000' : i === loadingStep ? 'rgba(255,0,0,0.15)' : '#111', border: i === loadingStep ? '1px solid #ff0000' : '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: i < loadingStep ? 'white' : '#ff4444', flexShrink: 0, transition: 'all 0.3s' }}>
                          {i < loadingStep ? '✓' : i === loadingStep ? '●' : ''}
                        </div>
                        <span style={{ color: i <= loadingStep ? '#ccc' : '#333' }}>{s}</span>
                      </div>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* RESULTS */}
        {result && (
            <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 80px', animation: 'fadeUp 0.4s ease' }}>

              {/* HEADER */}
              <div style={{ background: '#0f0f0f', borderRadius: 14, padding: '24px 28px', marginBottom: 16, border: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '3px solid #ff0000' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {result.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.thumbnail} alt={result.channelName} style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid #ff0000', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#ff0000', letterSpacing: 2, marginBottom: 5, lineHeight: 1.4 }}>AUDIT COMPLETE</div>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{result.channelName}</div>
                    <div style={{ fontSize: 12, color: '#333', marginTop: 3, lineHeight: 1.5 }}>{result.auditDate} · {result.country}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ textAlign: 'center', background: '#151515', borderRadius: 10, padding: '12px 20px', border: '1px solid #222' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: 42, fontWeight: 900, color: '#ff0000', lineHeight: 1.05, paddingBottom: 3 }}>{result.grade}</div>
                    <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, lineHeight: 1.5 }}>GRADE</div>
                  </div>
                  <div style={{ textAlign: 'center', background: '#151515', borderRadius: 10, padding: '12px 20px', border: '1px solid #222' }}>
                    <div style={{ fontFamily: 'Barlow Condensed', fontSize: 42, fontWeight: 900, color: 'white', lineHeight: 1.05, paddingBottom: 3 }}>{result.overallScore}</div>
                    <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, lineHeight: 1.5 }}>SCORE</div>
                  </div>
                </div>
              </div>

              {/* CHANNEL STATS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Subscribers', value: result.subscribers },
                  { label: 'Total Views', value: result.totalViews },
                  { label: 'Total Videos', value: String(result.totalVideos) },
                  { label: 'Upload Freq', value: result.channelStats?.uploadFrequency },
                  { label: 'Last Upload', value: result.channelStats?.lastUpload },
                  { label: 'View/Sub Ratio', value: result.channelStats?.viewToSubRatio },
                ].map(s => (
                    <div key={s.label} style={{ background: '#0f0f0f', borderRadius: 10, padding: '14px 16px', border: '1px solid #1a1a1a', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 20, fontWeight: 800, color: '#ff0000', lineHeight: 1.2, paddingBottom: 3 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#444', lineHeight: 1.5 }}>{s.label}</div>
                    </div>
                ))}
              </div>

              {/* SCORE GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Branding', score: result.brandingScore },
                  { label: 'Content', score: result.contentScore },
                  { label: 'SEO', score: result.seoScore },
                  { label: 'Engagement', score: result.engagementScore },
                  { label: 'Monetization', score: result.monetizationScore },
                  { label: 'Growth', score: result.growthScore },
                ].map(s => (
                    <div key={s.label} style={{ background: '#0f0f0f', borderRadius: 10, padding: '14px 16px', border: `1px solid ${scoreColor(s.score)}22`, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 900, color: scoreColor(s.score), lineHeight: 1.1, paddingBottom: 4 }}>{s.score}</div>
                      <div style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, marginBottom: 8, lineHeight: 1.5 }}>{s.label.toUpperCase()}</div>
                      <div style={{ height: 3, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.score}%`, background: scoreColor(s.score), borderRadius: 2 }} />
                      </div>
                    </div>
                ))}
              </div>

              {/* REVENUE OPPORTUNITY */}
              <div style={{ background: '#0f0f0f', borderRadius: 12, padding: '16px 20px', marginBottom: 16, border: '1px solid #1a1a1a', borderLeft: '3px solid #ff0000', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, lineHeight: 1.4 }}>💰</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ff4444', letterSpacing: 1.5, marginBottom: 5, lineHeight: 1.4 }}>REVENUE OPPORTUNITY</div>
                  <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.75 }}>{result.revenueOpportunity}</div>
                </div>
              </div>

              {/* TABS */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#0f0f0f', borderRadius: 10, padding: 5, border: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{ padding: '9px 16px', borderRadius: 7, border: 'none', background: activeTab === t.id ? '#ff0000' : 'transparent', color: activeTab === t.id ? 'white' : '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.5, letterSpacing: 0.3 }}>
                      {t.label}
                    </button>
                ))}
              </div>

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                  <div style={{ animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, marginBottom: 14, border: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#ff0000', letterSpacing: 2, marginBottom: 12, background: 'rgba(255,0,0,0.08)', padding: '3px 10px', borderRadius: 3, lineHeight: 1.6 }}>AUDIT SUMMARY</div>
                      <div style={{ fontSize: 14, color: '#888', lineHeight: 1.85 }}>{result.summary}</div>
                    </div>

                    {/* Critical Issues */}
                    {result.criticalIssues?.length > 0 && (
                        <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, marginBottom: 14, border: '1px solid #2a1010', borderTop: '2px solid #ff0000' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
                            <span style={{ fontSize: 16, lineHeight: 1.4 }}>🚨</span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4444', letterSpacing: 1.5, lineHeight: 1.4 }}>CRITICAL ISSUES — KILLING YOUR GROWTH</div>
                              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>Fix these first before anything else</div>
                            </div>
                          </div>
                          {result.criticalIssues.map((issue, i) => (
                              <div key={i} style={{ padding: '16px 18px', borderRadius: 8, background: '#120808', marginBottom: 10, borderLeft: '3px solid #ff0000' }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5, color: '#ff6666', lineHeight: 1.4 }}>{issue.title}</div>
                                <div style={{ fontSize: 12, color: '#cc3333', fontWeight: 600, marginBottom: 7, lineHeight: 1.5 }}>Impact: {issue.impact}</div>
                                <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 500, lineHeight: 1.65 }}>→ {issue.fix}</div>
                              </div>
                          ))}
                        </div>
                    )}

                    {/* Top Videos */}
                    {result.topVideos?.length > 0 && (
                        <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, border: '1px solid #1a1a1a' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 16, lineHeight: 1.5 }}>🏆 TOP PERFORMING VIDEOS — WHAT&apos;S WORKING</div>
                          {result.topVideos.map((v, i) => (
                              <div key={i} style={{ padding: '14px 16px', borderRadius: 8, background: '#111', marginBottom: 10, border: '1px solid #1a1a1a', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 900, color: '#ff4444', lineHeight: 1 }}>#{i + 1}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', marginBottom: 5, lineHeight: 1.45 }}>{v.title}</div>
                                  <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>👁 {v.views}</span>
                                    <span style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>👍 {v.likes}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#22c55e', lineHeight: 1.55 }}>✓ {v.whatWorked}</div>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {/* SEO */}
              {activeTab === 'seo' && (
                  <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, border: '1px solid #1a1a1a', animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>SEO & DISCOVERABILITY AUDIT</div>
                    {result.seoAudit?.map((item, i) => <AuditCard key={i} item={item} />)}
                  </div>
              )}

              {/* CONTENT */}
              {activeTab === 'content' && (
                  <div style={{ animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, marginBottom: 14, border: '1px solid #1a1a1a' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>CONTENT STRATEGY AUDIT</div>
                      {result.contentAudit?.map((item, i) => <AuditCard key={i} item={item} />)}
                    </div>
                    <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, border: '1px solid #1a1a1a' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>BRANDING AUDIT</div>
                      {result.brandingAudit?.map((item, i) => <AuditCard key={i} item={item} />)}
                    </div>
                  </div>
              )}

              {/* ENGAGEMENT */}
              {activeTab === 'engagement' && (
                  <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, border: '1px solid #1a1a1a', animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>ENGAGEMENT AUDIT</div>
                    {result.engagementAudit?.map((item, i) => <AuditCard key={i} item={item} />)}
                  </div>
              )}

              {/* MONETIZATION */}
              {activeTab === 'monetization' && (
                  <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, border: '1px solid #1a1a1a', animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>MONETIZATION AUDIT</div>
                    {result.monetizationAudit?.map((item, i) => <AuditCard key={i} item={item} />)}
                  </div>
              )}

              {/* GROWTH */}
              {activeTab === 'growth' && (
                  <div style={{ animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ background: '#0f0f0f', borderRadius: 12, padding: 24, marginBottom: 14, border: '1px solid #1a1a1a', borderTop: '2px solid #ff0000' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4444', letterSpacing: 1.5, marginBottom: 18, lineHeight: 1.5 }}>⚡ TOP PRIORITY FIXES</div>
                      {result.topFixes?.map((fix, i) => (
                          <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', borderRadius: 8, background: '#111', marginBottom: 8, alignItems: 'flex-start', border: '1px solid #1a1a1a' }}>
                            <span style={{ width: 24, height: 24, borderRadius: 5, background: '#ff0000', color: 'white', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Barlow Condensed', lineHeight: 1 }}>{i + 1}</span>
                            <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>{fix}</span>
                          </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
                      {[
                        { label: 'DO TODAY', items: result.growthStrategy?.immediate, color: '#ef4444', bg: '#120808', border: '#2a1010' },
                        { label: 'THIS WEEK', items: result.growthStrategy?.thisWeek, color: '#f59e0b', bg: '#12100a', border: '#2a2010' },
                        { label: 'THIS MONTH', items: result.growthStrategy?.thisMonth, color: '#22c55e', bg: '#081209', border: '#102a12' },
                        { label: 'NEXT 90 DAYS', items: result.growthStrategy?.next90Days, color: '#60a5fa', bg: '#080c12', border: '#10182a' },
                      ].map(g => (
                          <div key={g.label} style={{ background: g.bg, borderRadius: 12, padding: 18, border: `1px solid ${g.border}` }}>
                            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 13, fontWeight: 900, color: g.color, letterSpacing: 1.5, marginBottom: 14, lineHeight: 1.4 }}>{g.label}</div>
                            {g.items?.map((a, i) => (
                                <div key={i} style={{ fontSize: 13, color: '#777', marginBottom: 10, display: 'flex', gap: 8, lineHeight: 1.65 }}>
                                  <span style={{ color: g.color, flexShrink: 0 }}>→</span>{a}
                                </div>
                            ))}
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* BUTTONS */}
              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                <button onClick={downloadReport} style={{ padding: '14px 28px', borderRadius: 8, background: '#ff0000', border: 'none', color: 'white', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Barlow Condensed', letterSpacing: 0.5, lineHeight: 1.5 }}>
                  ↓ DOWNLOAD PDF REPORT
                </button>
                <button onClick={() => { setResult(null); setUrl(''); }} style={{ padding: '14px 28px', borderRadius: 8, background: '#111', border: '1px solid #222', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer', lineHeight: 1.5 }}>
                  ↺ Audit Another Channel
                </button>
              </div>
            </div>
        )}

        {/* FOOTER */}
        {!result && (
            <div style={{ background: '#050505', borderTop: '1px solid #111', padding: '48px 40px 32px', marginTop: 0 }}>
              <div style={{ maxWidth: 980, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 36 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 26, background: '#ff0000', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '10px solid white', marginLeft: 1 }} />
                      </div>
                      <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 16, color: 'white', letterSpacing: 0.5, lineHeight: 1.4 }}>CHANNEL AUDIT PRO</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#2a2a2a', maxWidth: 260, lineHeight: 1.75, margin: 0 }}>Complete YouTube channel audits powered by YouTube Data API and Gemini AI.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', letterSpacing: 1.5, marginBottom: 14, lineHeight: 1.5 }}>WHAT WE AUDIT</div>
                      {['Branding & Identity', 'SEO & Discoverability', 'Content Strategy', 'Engagement Signals', 'Monetization Readiness', '90-Day Growth Plan'].map(item => (
                          <div key={item} style={{ fontSize: 13, color: '#2a2a2a', marginBottom: 8, lineHeight: 1.55 }}>{item}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#2a2a2a', letterSpacing: 1.5, marginBottom: 14, lineHeight: 1.5 }}>POWERED BY</div>
                      {['YouTube Data API v3', 'Gemini 2.5 Flash AI', 'Real Channel Data', 'Growth Framework'].map(item => (
                          <div key={item} style={{ fontSize: 13, color: '#2a2a2a', marginBottom: 8, lineHeight: 1.55 }}>{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #111', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ fontSize: 12, color: '#222', lineHeight: 1.5 }}>© 2026 Channel Audit Pro · Free YouTube Analysis</div>
                  <div style={{ fontSize: 12, color: '#222', lineHeight: 1.5 }}>Built for creators who want to grow faster</div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}