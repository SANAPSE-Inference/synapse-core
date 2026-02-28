import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { newsPayload } = await request.json();

    if (!newsPayload) return NextResponse.json({ error: "MISSING_PAYLOAD" }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" }, 
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `你是一个顶级的跨学科情报合成中枢。用户会输入一条单一行业的新闻。
          你的任务是：不要复述新闻，而是计算该事件在其他不相关行业引发的“蝴蝶效应”。
          
          必须返回严格的 JSON 格式：
          {
            "primary_impact": "<简述该事件对其直接关联领域的首波冲击，50字内>",
            "cross_industry_cascade": "<核心！该事件将如何通过供应链、情绪面或资本转移，传导至看似毫不相干的第二个或第三个行业？必须极具反直觉的洞察力。100字内>",
            "arbitrage_opportunity": "<基于上述传导，指出一个具体的商业、投资或资源重组的套利机会。50字内>"
          }`
        },
        { role: "user", content: `原始情报注入：${newsPayload}` }
      ],
    });

    return NextResponse.json(JSON.parse(completion.choices[0].message.content || "{}"));
  } catch (error) {
    return NextResponse.json({ error: "SYNTHESIS_ENGINE_FAILURE" }, { status: 500 });
  }
}