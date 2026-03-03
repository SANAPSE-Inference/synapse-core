import { NextResponse, NextRequest } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

// 强制每小时重新拉取一次，上游缓存控制
export const revalidate = 3600;

// 配置 User-Agent 伪装防止源站阻挡
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// 七大核心领域分类与对应 RSS 源映射（每类 2-3 个顶级信源）
const CATEGORY_FEEDS: Record<string, Array<{ source: string; url: string }>> = {
  'all': [
    // 采用各分类的主流来源混合，为 "全部" 附加额外源
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

    // 只保留最新的前 15 条
    const trimmed = merged.slice(0, 15);
    const output = trimmed.map(({ headline, source, url }) => ({
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