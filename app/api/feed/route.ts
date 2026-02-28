import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 真实世界的顶级情报流 (合法 RSS 源)
const TARGET_FEEDS = [
  { source: "WSJ Business", url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/" }
];

export async function GET() {
  try {
   const rawNewsList: Array<{ source: string; headline: string; description: string }> = [];

    // 1. 物理层：跨域合法窃取实时数据 (利用 rss2json 免费网关，绕过复杂的 XML 解析)
    for (const feed of TARGET_FEEDS) {
      const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
      const data = await response.json();
      
      // 提取每个信息源的最新 2 条头条新闻
      if (data.items && data.items.length > 0) {
        data.items.slice(0, 2).forEach((item: any) => {
          rawNewsList.push({ source: feed.source, headline: item.title, description: item.description });
        });
      }
    }

    if (rawNewsList.length === 0) throw new Error("外部数据源枯竭或被阻断");

    // 2. 认知层：DeepSeek 并发炼金 (高维降噪与套利演算)
    const processedReports = [];
    for (const news of rawNewsList) {
      // 限制输入长度，极度节省 Token 算力成本
      const safeDescription = (news.description || "").replace(/<[^>]+>/g, '').substring(0, 200);
      
      const completion = await openai.chat.completions.create({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `你是 SYNAPSE 情报合成中枢。
            任务：读取最新真实资讯，给出冷酷的跨行业套利推演。
            必须严格返回 JSON：
            {
              "headline": "<原标题翻译为极具压迫感的中文>",
              "source": "<原出处>",
              "butterfly_effect": "<该事件在未来3个月对非相关行业造成的二级冲击，限80字中文>",
              "arbitrage_action": "<指出一种极其隐蔽的做多或做空套利手段，限50字中文>",
              "win_rate": <0-100整数，该套利逻辑的胜率>
            }`
          },
          { role: "user", content: `情报源：${news.source} | 标题：${news.headline} | 摘要：${safeDescription}` }
        ],
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
      processedReports.push({ ...result, source: news.source });
    }

    return NextResponse.json({ status: "SUCCESS", data: processedReports });

  } catch (error: any) {
    console.error("Pipeline Failure:", error.message);
    return NextResponse.json({ error: "数据摄入与合成总线崩溃" }, { status: 500 });
  }
}