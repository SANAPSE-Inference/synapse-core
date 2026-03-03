import { NextResponse } from 'next/server';

// 改用稳定的 Node.js 运行时，防止边缘节点环境变量读取失败
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');

  if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

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
          { role: 'system', content: '你是一个精准的金融与科技新闻破译引擎。请将英文原标题翻译成冷峻、专业的商业中文。只输出结果，不加引号或多余标点。' },
          { role: 'user', content: text }
        ],
        temperature: 0.2, 
        max_tokens: 100
      })
    });

    const data = await response.json();
    return NextResponse.json({ result: data.choices[0].message.content.trim() });
    
  } catch (error) {
    console.error('Translate Error:', error);
    return NextResponse.json({ error: '破译网络断开' }, { status: 500 });
  }
}