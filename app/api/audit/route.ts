import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

interface ChannelInfo {
    channelId: string;
    channelName: string;
    description: string;
    country: string;
    createdAt: string;
    subscribers: number;
    totalViews: number;
    totalVideos: number;
    thumbnail: string;
    customUrl: string;
    keywords: string;
    trailer: string;
    brandingSettings: {
        hasArt: boolean;
        hasProfileImage: boolean;
    };
}

interface VideoInfo {
    title: string;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string;
    duration: string;
    thumbnail: string;
    description: string;
    tags: string[];
    hasChapters: boolean;
    hasEndScreen: boolean;
}

async function resolveChannelId(input: string, apiKey: string): Promise<string | null> {
    const cleaned = input.trim();

    // Extract from full URLs
    const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]{20,})/,
        /youtube\.com\/@([a-zA-Z0-9._-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9._-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9._-]+)/,
    ];

    for (const p of patterns) {
        const m = cleaned.match(p);
        if (m) {
            if (p.source.includes('channel')) return m[1];
            // For handles/custom URLs, search by handle
            const handle = m[1].startsWith('@') ? m[1] : `@${m[1]}`;
            const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${apiKey}`);
            const d = await r.json();
            if (d.items?.[0]?.id) return d.items[0].id;
        }
    }

    // Try as handle directly
    const handle = cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
    const r1 = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`);
    const d1 = await r1.json();
    if (d1.items?.[0]?.id) return d1.items[0].id;

    // Search as channel name
    const r2 = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(cleaned)}&maxResults=1&key=${apiKey}`);
    const d2 = await r2.json();
    if (d2.items?.[0]?.id?.channelId) return d2.items[0].id.channelId;

    return null;
}

async function fetchChannelData(channelId: string, apiKey: string): Promise<ChannelInfo | null> {
    try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${apiKey}`);
        const d = await r.json();
        if (!d.items?.[0]) return null;
        const ch = d.items[0];
        const stats = ch.statistics || {};
        const snip = ch.snippet || {};
        const brand = ch.brandingSettings || {};

        return {
            channelId,
            channelName: snip.title || 'Unknown Channel',
            description: snip.description || '',
            country: snip.country || 'Not set',
            createdAt: snip.publishedAt || '',
            subscribers: parseInt(stats.subscriberCount || '0'),
            totalViews: parseInt(stats.viewCount || '0'),
            totalVideos: parseInt(stats.videoCount || '0'),
            thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.default?.url || '',
            customUrl: snip.customUrl || '',
            keywords: brand.channel?.keywords || '',
            trailer: ch.contentDetails?.relatedPlaylists?.uploads || '',
            brandingSettings: {
                hasArt: !!(brand.image?.bannerExternalUrl),
                hasProfileImage: !!(snip.thumbnails?.high?.url),
            },
        };
    } catch {
        return null;
    }
}

async function fetchTopVideos(channelId: string, apiKey: string): Promise<VideoInfo[]> {
    try {
        // Get uploads playlist
        const r1 = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
        const d1 = await r1.json();
        const uploadsId = d1.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) return [];

        // Get recent videos
        const r2 = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=20&key=${apiKey}`);
        const d2 = await r2.json();
        if (!d2.items?.length) return [];

        const videoIds = d2.items.map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId).join(',');

        // Get video stats
        const r3 = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`);
        const d3 = await r3.json();
        if (!d3.items?.length) return [];

        const videos: VideoInfo[] = d3.items.map((v: {
            snippet: { title: string; description: string; tags?: string[]; publishedAt: string; thumbnails?: { high?: { url: string } } };
            statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
            contentDetails: { duration: string };
        }) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics?.viewCount || '0'),
            likes: parseInt(v.statistics?.likeCount || '0'),
            comments: parseInt(v.statistics?.commentCount || '0'),
            publishedAt: v.snippet.publishedAt,
            duration: v.contentDetails.duration,
            thumbnail: v.snippet.thumbnails?.high?.url || '',
            description: v.snippet.description || '',
            tags: v.snippet.tags || [],
            hasChapters: (v.snippet.description || '').includes('0:00'),
            hasEndScreen: false,
        }));

        // Sort by views, return top 5
        return videos.sort((a, b) => b.views - a.views).slice(0, 5);
    } catch {
        return [];
    }
}

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

function getUploadFrequency(videos: VideoInfo[]): string {
    if (videos.length < 2) return 'Unknown';
    const dates = videos.map(v => new Date(v.publishedAt).getTime()).sort((a, b) => b - a);
    const gaps = [];
    for (let i = 0; i < Math.min(dates.length - 1, 5); i++) {
        gaps.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
    }
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg <= 3) return 'Daily';
    if (avg <= 8) return 'Weekly';
    if (avg <= 18) return 'Bi-weekly';
    if (avg <= 35) return 'Monthly';
    return 'Irregular';
}

function getLastUpload(videos: VideoInfo[]): string {
    if (!videos.length) return 'Unknown';
    const latest = new Date(videos[0].publishedAt);
    const days = Math.floor((Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= 7) return `${days} days ago`;
    if (days <= 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
}

function extractJSON(text: string): string {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No valid JSON found');
    cleaned = cleaned.slice(start, end + 1);
    // Fix trailing commas before } and ]
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    // Fix unescaped quotes inside strings (basic)
    // Remove any control characters
    cleaned = cleaned.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, '');
    // Try parse — if fails, try aggressive line-by-line repair
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        // Try to fix common Gemini issues: smart quotes
        cleaned = cleaned
            .replace(/\u2018|\u2019/g, "\'")
            .replace(/\u201c|\u201d/g, '\\"')
            .replace(/\r/g, '\\r');
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch (e2) {
            throw new Error(`JSON parse failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
        }
    }
}

async function callGemini(system: string, user: string): Promise<string> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY || ''}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: user }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 16000,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );
    const d = await res.json();
    if (d.error) throw new Error(`Gemini error: ${d.error.message}`);
    const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!raw) throw new Error('Empty response from Gemini');
    return extractJSON(raw);
}

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ ok: false, error: 'Channel URL or handle required' }, { status: 400 });

        const apiKey = process.env.YOUTUBE_API_KEY || '';
        if (!apiKey) return NextResponse.json({ ok: false, error: 'YouTube API key not configured' }, { status: 500 });

        // Resolve channel ID
        const channelId = await resolveChannelId(url, apiKey);
        if (!channelId) return NextResponse.json({ ok: false, error: 'Channel not found. Try entering the full YouTube URL or @handle.' }, { status: 404 });

        // Fetch real data
        const [channelInfo, topVideos] = await Promise.all([
            fetchChannelData(channelId, apiKey),
            fetchTopVideos(channelId, apiKey),
        ]);

        if (!channelInfo) return NextResponse.json({ ok: false, error: 'Could not fetch channel data.' }, { status: 404 });

        const uploadFreq = getUploadFrequency(topVideos);
        const lastUpload = getLastUpload(topVideos);
        // FIX: Use totalViews / totalVideos for real channel average — NOT top 5 average (inflates 3x)
        const avgViews = channelInfo.totalVideos > 0
            ? Math.round(channelInfo.totalViews / channelInfo.totalVideos)
            : topVideos.length > 0 ? Math.round(topVideos.reduce((a, v) => a + v.views, 0) / topVideos.length) : 0;
        const viewToSubRatio = channelInfo.subscribers > 0 ? `${((avgViews / channelInfo.subscribers) * 100).toFixed(1)}%` : 'N/A';
        const channelAgeYears = channelInfo.createdAt ? Math.floor((Date.now() - new Date(channelInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;

        // Check monetization eligibility
        const monetizationEligible = channelInfo.subscribers >= 1000;
        const nearMonetization = channelInfo.subscribers >= 500 && channelInfo.subscribers < 1000;

        // Analyze tags usage
        const videosWithTags = topVideos.filter(v => v.tags.length > 0).length;
        const videosWithChapters = topVideos.filter(v => v.hasChapters).length;
        const descriptionAvgLength = topVideos.length > 0
            ? Math.round(topVideos.reduce((a, v) => a + v.description.length, 0) / topVideos.length)
            : 0;
        // Detect affiliate links, community tab posts, and chapters from real data
        const hasAffiliateLinks = topVideos.some(v => /amzn\.|bit\.ly|goo\.gl|affiliat|referral|promo|discount|coupon/i.test(v.description));
        const affiliateStatus = hasAffiliateLinks ? '"warn"' : '"fail"';
        const affiliateCurrent = hasAffiliateLinks ? '"affiliate links detected in descriptions"' : '"no affiliate links found in top video descriptions"';

        const userPrompt = `Audit this YouTube channel and generate a complete professional growth report.

=== REAL CHANNEL DATA (use these exact numbers) ===
Channel Name: ${channelInfo.channelName}
Channel URL: https://youtube.com/${channelInfo.customUrl || `channel/${channelId}`}
Country: ${channelInfo.country}
Channel Created: ${channelInfo.createdAt ? new Date(channelInfo.createdAt).getFullYear() : 'Unknown'} (${channelAgeYears} years old)
Subscribers: ${formatNumber(channelInfo.subscribers)} (${channelInfo.subscribers} exact)
Total Views: ${formatNumber(channelInfo.totalViews)}
Total Videos: ${channelInfo.totalVideos}
Custom URL: ${channelInfo.customUrl || 'NOT SET — still using default URL'}
Channel Keywords Set: ${channelInfo.keywords ? 'YES: ' + channelInfo.keywords.slice(0, 100) : 'NO — completely empty'}
Channel Description Length: ${channelInfo.description.length} characters
Has Channel Art/Banner: ${channelInfo.brandingSettings.hasArt ? 'YES' : 'NO — missing banner'}

=== CONTENT PERFORMANCE DATA ===
Upload Frequency: ${uploadFreq}
Last Upload: ${lastUpload}
Avg Views Per Video (recent): ${formatNumber(avgViews)}
View-to-Subscriber Ratio: ${viewToSubRatio}
Videos With Tags: ${videosWithTags}/${topVideos.length}
Videos With Chapters: ${videosWithChapters}/${topVideos.length}
Avg Description Length: ${descriptionAvgLength} characters

=== TOP 5 VIDEOS BY VIEWS ===
${topVideos.map((v, i) => `
${i + 1}. "${v.title}"
   Views: ${formatNumber(v.views)} | Likes: ${formatNumber(v.likes)} | Comments: ${formatNumber(v.comments)}
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
${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

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
  "channelId": "${channelId}",
  "channelName": "${channelInfo.channelName}",
  "channelUrl": "https://youtube.com/${channelInfo.customUrl || `channel/${channelId}`}",
  "auditDate": "${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}",
  "thumbnail": "${channelInfo.thumbnail}",
  "country": "${channelInfo.country}",
  "createdYear": "${channelInfo.createdAt ? new Date(channelInfo.createdAt).getFullYear() : 'Unknown'}",
  "subscribers": "${formatNumber(channelInfo.subscribers)}",
  "totalViews": "${formatNumber(channelInfo.totalViews)}",
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
  "revenueOpportunity": "Specific realistic estimate — based on ${formatNumber(avgViews)} avg views and their niche, estimate monthly AdSense potential, what they need to do to double it, and what other revenue streams they are missing",
  "channelStats": {
    "avgViewsPerVideo": "${formatNumber(avgViews)}",
    "uploadFrequency": "${uploadFreq}",
    "lastUpload": "${lastUpload}",
    "estimatedMonthlyViews": "calculate based on upload frequency and avg views",
    "viewToSubRatio": "${viewToSubRatio}",
    "channelAge": "${channelAgeYears} years"
  },
  "topVideos": [
    ${topVideos.slice(0, 2).map(v => `{
      "title": "${v.title.replace(/"/g, '\\"').slice(0, 80)}",
      "views": "${formatNumber(v.views)}",
      "likes": "${formatNumber(v.likes)}",
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
    {"item": "Affiliate Marketing", "status": ${affiliateStatus}, "current": ${affiliateCurrent}, "issue": "specific affiliate opportunity for their niche", "fix": "exact affiliate strategy with specific programs for their content type"},
    {"item": "Sponsorship Readiness", "status": "${channelInfo.subscribers >= 1000 ? 'warn' : 'fail'}", "current": "${formatNumber(channelInfo.subscribers)} subscribers", "issue": "specific sponsorship readiness assessment", "fix": "exact steps to attract first sponsor"},
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

        const raw = await callGemini(SYSTEM, userPrompt);
        const parsed = JSON.parse(raw);

        // Hard overrides with real data
        parsed.channelId = channelId;
        parsed.channelName = channelInfo.channelName;
        parsed.thumbnail = channelInfo.thumbnail;
        parsed.subscribers = formatNumber(channelInfo.subscribers);
        parsed.totalViews = formatNumber(channelInfo.totalViews);
        parsed.totalVideos = channelInfo.totalVideos;
        parsed.channelStats.avgViewsPerVideo = formatNumber(avgViews);
        parsed.channelStats.uploadFrequency = uploadFreq;
        parsed.channelStats.lastUpload = lastUpload;
        parsed.channelStats.viewToSubRatio = viewToSubRatio;

        // Recalculate overall score
        parsed.overallScore = Math.round(
            (parsed.brandingScore + parsed.contentScore + parsed.seoScore +
                parsed.engagementScore + parsed.monetizationScore + parsed.growthScore) / 6
        );

        // Grade
        const s = parsed.overallScore;
        parsed.grade = s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

        return NextResponse.json({ ok: true, data: parsed });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('YouTube Audit error:', msg);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}