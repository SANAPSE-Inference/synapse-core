import { NextResponse } from "next/server";
import Parser from 'rss-parser';

const parser = new Parser();

// 选择 3 个稳定且无需 API key 的公共 RSS 源
const TARGET_FEEDS: Array<{ source: string; url: string }> = [
  { source: 'Reuters', url: 'http://feeds.reuters.com/reuters/topNews' },
  { source: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { source: 'HackerNews', url: 'https://news.ycombinator.com/rss' }
];

export async function GET() {
  try {
    // 并发抓取所有 RSS 源
    const results = await Promise.allSettled(
      TARGET_FEEDS.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items?.map(item => ({
          headline: item.title || '',
          source: feed.source,
          url: item.link || item.guid || '',
          pubDate: item.isoDate || item.pubDate || ''
        })) || [];
      })
    );

    // 合并并扁平化
    const merged: Array<any> = [];
    for (const r of results) {
      if (r.status === 'fulfilled') merged.push(...r.value);
    }

    if (merged.length === 0) return NextResponse.json({ data: [] });

    // 按时间倒序排列，取最新 20 条
    merged.sort((a, b) => {
      const da = Date.parse(a.pubDate || '') || 0;
      const db = Date.parse(b.pubDate || '') || 0;
      return db - da;
    });

    const sliced = merged.slice(0, 20).map(item => ({
      headline: item.headline,
      source: item.source,
      url: item.url
    }));

    return NextResponse.json({ data: sliced });
  } catch (err: any) {
    console.error('RSS pipeline error', err);
    return NextResponse.json({ error: 'RSS fetch failed' }, { status: 500 });
  }
}