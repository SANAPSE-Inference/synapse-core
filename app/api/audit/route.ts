import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { headline, action, reason } = await req.json();

  // 🔐 后端对账：强化 reason 校验（长度 < 5 字符直接返回无效）
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return NextResponse.json({ score: 0, penalty: 0, judgment: '逻辑无效' });
  }

  // 1. 调用 DeepSeek 执行逻辑审计（软化为包容性宏观分析师）
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个具有包容性的宏观分析师。根据新闻标题和用户的对赌方向，评估用户理由的逻辑严谨性和市场/技术相关性。输出 JSON 格式：{score: 0-100, judgment: '简短评语'}" },
        { role: "user", content: `新闻：${headline}\n动作：${action}\n理由：${reason}` }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const aiResult = await response.json();
  let audit = JSON.parse(aiResult.choices[0].message.content);

  // 额外本地软判：若理由包含 2 个以上关键词，则确保评分至少 85
  const keywords = ["market","trade","crypto","blockchain","finance","tech","AI","risk","capital","lever","algo","rate"];
  const count = keywords.reduce((acc, kw) => acc + (reason.toLowerCase().includes(kw) ? 1 : 0), 0);
  if (count >= 2) {
    audit.score = Math.max(audit.score ?? 0, 85);
    audit.judgment = audit.judgment || "理由包含关键术语，评分提升";
  }

  // 2. 计算信用惩罚/奖励 (60分以上不扣分，以下统一 500 扣分)
  const penalty = audit.score >= 60 ? 0 : 500;

  return NextResponse.json({ score: audit.score, judgment: audit.judgment, penalty });
}