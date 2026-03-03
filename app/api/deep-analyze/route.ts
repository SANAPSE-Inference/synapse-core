import { NextResponse } from 'next/server';

// 强制解除静态锁定
export const dynamic = 'force-dynamic';

// 1500字扩容版 System Prompt
const SYSTEM_PROMPT = `你是一个基于有限理性假设与非完全信息博弈论的战略演算引擎。请输出约 1500 字的深度结构化分析。必须严格使用以下五个 Markdown 标题：
【事实去噪】（一句话剥离情绪修辞，还原物理事实）
【第一性原理与事件本质】（核心重头戏：用不少于 800 字的篇幅，极度深挖该事件在商业逻辑、技术迭代或地缘政治上的底层原理、历史坐标以及未来 3-5 年的价值延展）
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
        max_tokens: 2500 // 算力扩容
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