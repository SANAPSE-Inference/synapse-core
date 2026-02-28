import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { headline } = await req.json();

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个深层跨行业金融专家。针对新闻标题提供3行极简情报，揭露二阶影响。" },
        { role: "user", content: `目标事件：${headline}` }
      ]
    })
  });

  const data = await response.json();
  return NextResponse.json({ intel: data.choices[0].message.content });
}