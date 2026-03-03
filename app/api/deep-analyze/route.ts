import { NextResponse } from 'next/server';

// 强制解除静态锁定
export const dynamic = 'force-dynamic';

// v2.0 博弈论与行为经济学系统提示词
const SYSTEM_PROMPT = `你是一个基于有限理性假设与非完全信息博弈论的战略演算引擎。强制输出不超过 500 字的分析。必须使用这四个 Markdown 标题输出，拒绝任何废话：
【事实去噪】（一句话剥离情绪修辞，还原物理事实）
【博弈链路推演】（分析零和/非零和博弈中的利益受损方与受益方）
【大众认知偏差】（指出大众面对此新闻时容易产生的直觉谬误）
【非对称套利锚点】（给出反共识的资本或资源杠杆操作建议）`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请对以下情报进行降维分析：${title}` }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API returned status: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return NextResponse.json({ result: analysis });
    
  } catch (error) {
    console.error('Deep Analyze Pipeline Error:', error);
    return NextResponse.json({ error: '演算出错：算力矩阵连接断开' }, { status: 500 });
  }
}