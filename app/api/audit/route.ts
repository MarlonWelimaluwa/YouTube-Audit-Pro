import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ ok: false, error: 'Channel URL or handle required' }, { status: 400 });

        const apiKey = process.env.YOUTUBE_API_KEY || '';
        if (!apiKey) return NextResponse.json({ ok: false, error: 'YouTube API key not configured' }, { status: 500 });

        const channelId = await resolveChannelId(url, apiKey);
        if (!channelId) return NextResponse.json({ ok: false, error: 'Channel not found. Try entering the full YouTube URL or @handle.' }, { status: 404 });

        const [channelInfo, topVideos] = await Promise.all([
            fetchChannelData(channelId, apiKey),
            fetchTopVideos(channelId, apiKey),
        ]);

        if (!channelInfo) return NextResponse.json({ ok: false, error: 'Could not fetch channel data.' }, { status: 404 });

        const uploadFreq = getUploadFrequency(topVideos);
        const lastUpload = getLastUpload(topVideos);
        // Use totalViews / totalVideos for accurate channel average (NOT top 5 average which inflates 3x)
        const avgViews = channelInfo.totalVideos > 0
            ? Math.round(channelInfo.totalViews / channelInfo.totalVideos)
            : topVideos.length > 0 ? Math.round(topVideos.reduce((a, v) => a + v.views, 0) / topVideos.length) : 0;
        const viewToSubRatio = channelInfo.subscribers > 0 ? `${((avgViews / channelInfo.subscribers) * 100).toFixed(1)}%` : 'N/A';
        const channelAgeYears = channelInfo.createdAt ? Math.floor((Date.now() - new Date(channelInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;
        const monetizationEligible = channelInfo.subscribers >= 1000;
        const nearMonetization = channelInfo.subscribers >= 500 && channelInfo.subscribers < 1000;
        const videosWithTags = topVideos.filter(v => v.tags.length > 0).length;
        const videosWithChapters = topVideos.filter(v => v.hasChapters).length;
        const descriptionAvgLength = topVideos.length > 0
            ? Math.round(topVideos.reduce((a, v) => a + v.description.length, 0) / topVideos.length)
            : 0;
        const hasAffiliateLinks = topVideos.some(v => /amzn\.|bit\.ly|goo\.gl|affiliat|referral|promo|discount|coupon/i.test(v.description));

        // Return all raw data to browser — Gemini call happens client-side (no Vercel timeout)
        return NextResponse.json({
            ok: true,
            channelData: {
                channelId,
                channelInfo,
                topVideos,
                computed: {
                    uploadFreq,
                    lastUpload,
                    avgViews,
                    viewToSubRatio,
                    channelAgeYears,
                    monetizationEligible,
                    nearMonetization,
                    videosWithTags,
                    videosWithChapters,
                    descriptionAvgLength,
                    hasAffiliateLinks,
                    avgViewsFormatted: formatNumber(avgViews),
                    subscribersFormatted: formatNumber(channelInfo.subscribers),
                    totalViewsFormatted: formatNumber(channelInfo.totalViews),
                    auditDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                }
            }
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('YouTube data fetch error:', msg);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}