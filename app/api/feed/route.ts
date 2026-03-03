import { NextResponse, NextRequest } from 'next/server';
import Parser from 'rss-parser';

// 强制每小时重新拉取一次，上游缓存控制
export const revalidate = 3600;

const parser = new Parser();

// 七大核心领域分类与对应 RSS 源映射
const CATEGORY_FEEDS: Record<string, Array<{ source: string; url: string }>> = {
  'all': [
    { source: 'HackerNews', url: 'https://hnrss.org/frontpage' },
    { source: 'FierceBiotech', url: 'https://www.fiercebiotech.com/rss/xml' },
    { source: 'ReutersBusiness', url: 'http://feeds.reuters.com/reuters/businessNews' },
    { source: 'IEEESpectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' }
  ],
  'ai': [
    { source: 'HackerNews', url: 'https://hnrss.org/frontpage' },
    { source: 'IEEESpectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' }
  ],
  'finance': [
    { source: 'ReutersBusiness', url: 'http://feeds.reuters.com/reuters/businessNews' },
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' }
  ],
  'geopolitics': [
    { source: 'ReutersBusiness', url: 'http://feeds.reuters.com/reuters/businessNews' }
  ],
  'china': [
    { source: 'HuanqiuTimes', url: 'https://world.huanqiu.com/rss.xml' }
  ],
  'industry': [
    { source: 'IEEESpectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' }
  ],
  'biotech': [
    { source: 'FierceBiotech', url: 'https://www.fiercebiotech.com/rss/xml' }
  ],
  'web3': [
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    
    // 验证分类有效性
    const feeds = CATEGORY_FEEDS[category] || CATEGORY_FEEDS['all'];
    
    // 并发拉取并反脆弱处理
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);
        const items = parsed.items?.slice(0, 5) || [];
        return items.map((item) => ({
          headline: item.title || '',
          source: feed.source,
          url: item.link || item.guid || '',
          pubDate: item.isoDate || item.pubDate || ''
        }));
      })
    );

    const merged: Array<{ headline: string; source: string; url: string; pubDate: string }> = [];
    for (const r of results) {
      if (r.status === 'fulfilled') merged.push(...r.value);
    }

    // 排序最新在前
    merged.sort((a, b) => {
      const da = Date.parse(a.pubDate || '') || 0;
      const db = Date.parse(b.pubDate || '') || 0;
      return db - da;
    });

    const output = merged.map(({ headline, source, url }) => ({
      headline,
      source,
      url
    }));

    return NextResponse.json({ data: output });
  } catch (err) {
    console.error('unhandled RSS pipeline error', err);
    // 不抛 500，只返回空数组保证前端可用
    return NextResponse.json({ data: [] });
  }
}