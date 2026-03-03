import { NextResponse, NextRequest } from 'next/server';
import Parser from 'rss-parser';

// 强制使用标准 Node.js 运行时，给予 rss-parser 完整的底层环境支持
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// 配置 User-Agent 伪装防爬虫拦截，并注入 8 秒硬超时防线（极度重要）
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  timeout: 8000 // 物理阻断：任何超过 8 秒未响应的单一 RSS 源将被直接切断，防止拖垮整个页面
});

const CATEGORY_FEEDS: Record<string, Array<{ source: string; url: string }>> = {
  'all': [
    { source: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { source: 'AlJazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { source: 'Reuters', url: 'http://feeds.reuters.com/Reuters/worldNews' },
    { source: 'Nature', url: 'https://feeds.nature.com/nature/rss/current' },
    { source: 'IEEESpectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' }
  ],
  'ai': [
    { source: 'HackerNews', url: 'https://hnrss.org/frontpage' },
    { source: 'TechCrunch', url: 'http://feeds.feedburner.com/TechCrunch/' },
    { source: 'MITTechReview', url: 'https://www.technologyreview.com/feed/' }
  ],
  'finance': [
    { source: 'FTChinese', url: 'https://www.ftchinese.com/rss/news' },
    { source: 'SCMP', url: 'https://www.scmp.com/rss/2/feed' },
    { source: 'WSJChina', url: 'https://www.wsj.com/xml/rss/3_7031.xml' }
  ],
  'geopolitics': [
    { source: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { source: 'AlJazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { source: 'Reuters', url: 'http://feeds.reuters.com/Reuters/worldNews' }
  ],
  'china': [
    { source: 'FTChinese', url: 'https://www.ftchinese.com/rss/news' },
    { source: 'SCMP', url: 'https://www.scmp.com/rss/2/feed' },
    { source: 'ZaoBao', url: 'https://www.zaobao.com.sg/rss/realtime/china' }
  ],
  'industry': [
    { source: 'IEEESpectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' }
  ],
  'biotech': [
    { source: 'Nature', url: 'https://feeds.nature.com/nature/rss/current' },
    { source: 'FierceBiotech', url: 'https://www.fiercebiotech.com/rss/xml' },
    { source: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/biology/biotechnology.xml' }
  ],
  'web3': [
    { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { source: 'Decrypt', url: 'https://decrypt.co/feed' }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    
    const feeds = CATEGORY_FEEDS[category] || CATEGORY_FEEDS['all'];
    
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

    merged.sort((a, b) => {
      const da = Date.parse(a.pubDate || '') || 0;
      const db = Date.parse(b.pubDate || '') || 0;
      return db - da;
    });

    const trimmed = merged.slice(0, 15);
    const output = trimmed.map(({ headline, source, url }) => ({
      headline,
      source,
      url
    }));

    return NextResponse.json({ data: output });
  } catch (err) {
    console.error('unhandled RSS pipeline error', err);
    return NextResponse.json({ data: [] });
  }
}