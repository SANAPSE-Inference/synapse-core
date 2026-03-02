import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();

    if (!headline) {
      return NextResponse.json({ text: "⚠️ 逻辑断裂：缺失核心输入变量(Headline)。" }, { status: 400 });
    }

    // 核心护城河：跨域融合系统提示词
    const systemPrompt = `你是一个“高维跨域融合演算引擎”。
你的唯一任务是剥离新闻表象，提取底层逻辑，并进行跨行业映射。
请针对用户提供的【事件/新闻标题】，强制输出且仅输出三行结论（禁止任何废话、问候或Markdown格式）：
第一行 [本质破译]：用一句话说明该事件底层的经济、技术或行为学逻辑。
第二行 [跨域映射]：预测该事件将如何产生蝴蝶效应，重击或重塑一个看似完全不相关的传统/新兴行业。
第三行 [行动杠杆]：为创业者或个体提供一个高非对称收益（低成本、高潜能）的应对策略或认知视角。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `演算目标：${headline}` }
        ],
        max_tokens: 300,
        temperature: 0.7 // 保持一定的发散性以产生跨域灵感
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API 链路异常:", errorData);
      return NextResponse.json({ text: "⚠️ 认知引擎过载，未能接通算力节点。" }, { status: 500 });
    }

    const data = await response.json();
    const intelContent = data.choices[0].message.content.trim();

    // 直接返回解析后的结构化文本，供前端三行展示
    return NextResponse.json({ text: intelContent });

  } catch (error) {
    console.error("Intel API 物理崩溃:", error);
    return NextResponse.json({ text: "⚠️ 系统物理链路断开，情报提取失败。" }, { status: 500 });
  }
}