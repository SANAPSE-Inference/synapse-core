import { NextResponse } from 'next/server';

export const runtime = 'edge'; 

const SYSTEM_PROMPT = `你是一个基于有限理性假设与非完全信息博弈论的战略演算引擎。
【绝对排版禁令】：
严禁使用任何 Markdown 符号（绝对不要出现 #, ##, ***, ** 等符号）。
只能使用换行符和中文全角括号【】来区分标题。正文必须纯文本输出，不要加粗。

【强制结构指令】：
你必须且只能严格按照以下5个模块顺序输出，绝对不能遗漏，绝对不要自己合并：
【事实去噪】
（剥离修辞，还原物理事实）
【第一性原理与事件本质】
（深挖底层逻辑、历史坐标与3-5年价值延展）
【博弈链路推演】
（分析零和/非零和博弈中的受损方与受益方）
【大众认知偏差】
（指出直觉谬误）
【非对称套利锚点】
（给出资本或资源杠杆操作建议）`;

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
          { role: 'user', content: `请对以下情报进行降维分析：${title}` }
        ],
        temperature: 0.6,
        max_tokens: 4096,
        stream: true
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: '算力节点连接失败' }, { status: response.status });
    }

    // 构建抗脆弱流媒体转换管道
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream disrupted:", e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
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