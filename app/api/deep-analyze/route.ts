import { NextResponse } from 'next/server';

export const runtime = 'edge'; 
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是一个基于有限理性假设与非完全信息博弈论的战略演算引擎。
【绝对排版禁令】：
严禁使用任何 Markdown 符号（绝对不要出现 #, ##, ***, ** 等符号）。
只能使用换行符和中文全角括号【】来区分标题。
正文必须纯文本输出，不要加粗。

【强制结构指令】：
你必须且只能严格按照以下 5 个模块的顺序输出，绝对不能遗漏任何一个模块，绝对不要自己合并模块：

【事实去噪】
（用一两句话剥离媒体的情绪修辞，还原冰冷的物理事实）

【第一性原理与事件本质】
（用极其深度的篇幅，深挖该事件在商业逻辑、技术迭代或地缘政治上的底层原理、历史坐标以及未来 3-5 年的价值延展）

【博弈链路推演】
（分析零和/非零和博弈中，到底谁是利益受损方，谁是隐蔽的受益方）

【大众认知偏差】
（一针见血地指出，普通大众或散户面对此新闻时，最容易产生的直觉谬误或冲动反应）

【非对称套利锚点】
（给出极具反共识的资本、资源分配或风险对冲的具体操作建议）`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

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
          { role: 'user', content: `请对以下情报进行降维分析，记住绝对禁止使用#或**等排版符号：${title}` }
        ],
        temperature: 0.6, // 微调温度，提升输出速度与稳定性
        max_tokens: 4096, // 核心防御：拉高 Token 墙，防止模型因字数限制自行腰斩
        stream: true
      })
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: '演算出错：算力矩阵连接断开' }, { status: 500 });
  }
}