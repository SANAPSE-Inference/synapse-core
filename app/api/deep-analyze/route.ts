import { NextResponse, NextRequest } from 'next/server';

// 不缓存，深度演算每次都重新请求
export const revalidate = 0;

const SYSTEM_PROMPT = `你是一个基于博弈论的战略演算引擎。强制输出不超过 500 字的分析。必须使用这四个 Markdown 标题：【事实去噪】、【博弈链路推演】、【大众认知偏差】、【非对称套利锚点】。拒绝任何免责声明与废话。`;}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title') || '';
  if (!title) {
    return NextResponse.json({ error: 'missing title' }, { status: 400 });
  }

  try {
    const resp = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.example/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM_PROMPT, input: title })
    });
    const data = await resp.json();
    return NextResponse.json({ result: data.result || data.text || '' });
  } catch (e) {
    console.error('deep analyze error', e);
    return NextResponse.json({ error: 'analysis failed' }, { status: 500 });
  }
}