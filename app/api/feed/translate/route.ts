import { NextResponse } from 'next/server';

export const runtime = 'edge';

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
          { role: 'system', content: 'Translate to professional Chinese. Output result only.' },
          { role: 'user', content: text }
        ],
        temperature: 0.1, // 极限收敛，禁止模型发散思考，换取最高响应速度
        max_tokens: 60
      })
    });

    if (!response.ok) {
        throw new Error(`API Refused: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ result: data.choices[0].message.content.trim() });
    
  } catch (error: any) {
    return NextResponse.json({ error: `破译失败: ${error.message}` }, { status: 500 });
  }
}