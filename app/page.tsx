"use client";
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Report {
  headline: string;
  source: string;
  butterfly_effect: string;
  arbitrage_action: string;
  win_rate: number;
}

// 建立与云端暗池的物理连接
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SynapseDarkPool() {
  // 节点与账本状态
  const [nodeId, setNodeId] = useState<string>('UNKNOWN_NODE');
  const [credit, setCredit] = useState<number>(10000);
  const [creditPulsing, setCreditPulsing] = useState<boolean>(false);

  // 页面数据与 UI 状态
  const [poolStats, setPoolStats] = useState<Record<string, { LONG: number; SHORT: number }>>({});
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stakedItems, setStakedItems] = useState<Record<number, 'LONG' | 'SHORT'>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [auditing, setAuditing] = useState<Record<number, boolean>>({});

  // 活动日志与终端
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  // 私钥/访问控制
  const [accessKey, setAccessKey] = useState<string | null>(null);

  // DEEP_INTEL 状态（按索引）
  const [intelLoading, setIntelLoading] = useState<Record<number, boolean>>({});
  const [intelText, setIntelText] = useState<Record<number, string>>({});

  // 聚合多空统计
  const fetchPoolStats = async () => {
    try {
      const { data, error } = await supabase.from('cognitive_stakes').select('headline, action');
      if (error) {
        console.error('fetchPoolStats error', error);
        return;
      }
      if (data) {
        const stats: Record<string, { LONG: number; SHORT: number }> = {};
        data.forEach((row: any) => {
          if (!stats[row.headline]) stats[row.headline] = { LONG: 0, SHORT: 0 };
          if (row.action === 'LONG' || row.action === 'SHORT') {
            stats[row.headline][row.action as 'LONG' | 'SHORT'] += 1;
          }
        });
        setPoolStats(prev => {
          const merged = { ...prev };
          Object.keys(stats).forEach(h => { merged[h] = stats[h]; });
          return merged;
        });
      }
    } catch (e) {
      console.error('fetchPoolStats failed', e);
    }
  };

  // DEEP_INTEL 请求与显示
  const fetchDeepIntel = async (headline: string, idx: number) => {
    if (!nodeId || nodeId === 'UNKNOWN_NODE') {
      alert('警告: 节点身份未确定，无法获取情报');
      return;
    }
    setIntelLoading(s => ({ ...s, [idx]: true }));
    setIntelText(s => ({ ...s, [idx]: '正在提取机密变量...' }));
    try {
      const res = await fetch('/api/intel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline }) });
      if (!res.ok) throw new Error('intel request failed');
      const j = await res.json();
      const intel = j.text || j.intel || '无情报';
      // 保证三行显示
      const lines = intel.split('\n').slice(0, 3);
      const formattedIntel = lines.join('\n');

      // 打字机效果
      setIntelText(s => ({ ...s, [idx]: '' }));
      let i = 0;
      const speed = 24;
      const timer = setInterval(() => {
        i++;
        setIntelText(prev => ({ ...prev, [idx]: formattedIntel.slice(0, i) }));
        if (i >= formattedIntel.length) clearInterval(timer);
      }, speed);

      // 自动消耗 100 PTS 获取情报
      const penalty = 100;
      const { data: nodeRow, error: nodeReadErr } = await supabase
        .from('synapse_nodes')
        .select('credit')
        .eq('node_id', nodeId)
        .maybeSingle();
      if (nodeReadErr) { alert('无法读取节点账本'); setIntelLoading(s => ({ ...s, [idx]: false })); return; }
      if (!nodeRow || nodeRow.credit < penalty) { alert('认知信用不足'); setIntelLoading(s => ({ ...s, [idx]: false })); return; }
      const newCredit = nodeRow.credit - penalty;
      const { error: updErr } = await supabase.from('synapse_nodes').update({ credit: newCredit }).eq('node_id', nodeId);
      if (updErr) { alert('扣分失败'); setIntelLoading(s => ({ ...s, [idx]: false })); return; }
    } catch (e) {
      console.error('Deep Intel failed', e);
      setIntelText(s => ({ ...s, [idx]: '机密提取失败' }));
    } finally {
      setIntelLoading(s => ({ ...s, [idx]: false }));
    }
  };

  // 页面加载：初始化节点（localStorage 优先，强制 prompt）并订阅实时
  useEffect(() => {
    let stakesChannel: any = null;
    let nodesChannel: any = null;
    let providedNode = '';

    const setup = async () => {
      // 优先 localStorage
      const stored = localStorage.getItem('synapse_node_id');
      if (stored) {
        providedNode = stored;
      } else {
        // 强制循环 prompt 直到输入有效
        while (!providedNode || providedNode.trim() === '') {
          const answer = prompt('SYSTEM ALERT: INITIATE NODE IDENTIFICATION\n请输入你的节点代号 (如 0xAlpha, Sathya_Prime):\n（不能为空，不可取消）');
          if (answer !== null) providedNode = answer.trim();
        }
        localStorage.setItem('synapse_node_id', providedNode);
      }
      setNodeId(providedNode);

      // 读取或创建云端节点账本，并强制 Access Key 验证/创建
      try {
        // 优先检查本地 access key
        let storedKey = localStorage.getItem('synapse_access_key') || '';
        if (!storedKey) {
          // 强制输入 access key（不可取消或为空）
          while (!storedKey || storedKey.trim() === '') {
            const k = prompt('请输入节点访问密钥 Access Key（用于身份验证，不能为空）:');
            if (k !== null) storedKey = k.trim();
          }
          localStorage.setItem('synapse_access_key', storedKey);
        }

        // 查询云端节点信息
        const { data: nodeData, error: nodeErr } = await supabase
          .from('synapse_nodes')
          .select('node_id, credit, access_key')
          .eq('node_id', providedNode)
          .maybeSingle();
        if (nodeErr) console.error('Failed to read synapse_nodes:', nodeErr);

        if (nodeData) {
          // 如果数据库中已有 access_key，必须匹配
          if (nodeData.access_key && nodeData.access_key !== storedKey) {
            alert('警告: Access Key 校验失败。请重新输入正确的 Access Key。');
            localStorage.removeItem('synapse_access_key');
            return;
          }
          setCredit(nodeData.credit ?? 10000);
        } else {
          // 不存在则创建，并保存 access_key
          const { error: insertErr } = await supabase
            .from('synapse_nodes')
            .insert([{ node_id: providedNode, credit: 10000, access_key: storedKey }]);
          if (insertErr) console.error('Failed to create synapse_node:', insertErr);
          setCredit(10000);
        }
        setAccessKey(storedKey || null);
      } catch (e) {
        console.error('node init error', e);
      }

      // 初始拉取共识雷达
      await fetchPoolStats();

      // 订阅 cognitive_stakes 插入
      try {
        stakesChannel = supabase
          .channel('schema-db-changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cognitive_stakes' }, (payload) => {
            fetchPoolStats();
            const rec = payload.new as any;
            const time = new Date().toLocaleTimeString();
            const score = rec.audit_score != null ? rec.audit_score : 'NA';
            const penalty = rec.penalty != null ? rec.penalty : 'NA';
            const line = `${time} > ${rec.user_node || 'UNKNOWN'} EXECUTED [${rec.action}] | AUDIT: ${score}/100 | -${penalty} PTS`;
            setActivityLogs(prev => [line, ...prev].slice(0, 10));
            const terminalLine = `[STAKE] ${rec.user_node || 'UNKNOWN'} | ${rec.action} | SCORE: ${score} | ${time}`;
            setTerminalLines(prev => [...prev, terminalLine].slice(-50));
          })
          .subscribe();
      } catch (e) {
        console.error('Failed to subscribe to cognitive_stakes channel', e);
      }

      // 订阅 synapse_nodes 当前节点更新
      try {
        nodesChannel = supabase
          .channel('schema-db-changes:nodes')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'synapse_nodes', filter: `node_id=eq.${providedNode}` }, (payload) => {
            if (payload.new && typeof payload.new.credit === 'number') {
              const newCreditVal = payload.new.credit;
              setCredit(newCreditVal);
              setCreditPulsing(true);
              setTimeout(() => setCreditPulsing(false), 600);
            }
          })
          .subscribe();
      } catch (e) {
        console.error('Failed to subscribe to synapse_nodes channel', e);
      }
    };

    setup();

    return () => {
      try { if (stakesChannel && typeof stakesChannel.unsubscribe === 'function') stakesChannel.unsubscribe(); }
      catch (_) {}
      try { if (nodesChannel && typeof nodesChannel.unsubscribe === 'function') nodesChannel.unsubscribe(); }
      catch (_) {}
    };
  }, []);

  // 核心：向暗池数据库发送对赌指令（含 AI 审计）
  const handleStake = async (headline: string, action: 'LONG' | 'SHORT', idx?: number) => {
    const STAKE_AMOUNT = 500;

    if (!nodeId || nodeId === 'UNKNOWN_NODE') {
      alert('警告: 节点身份未确定，无法执行对赌');
      if (typeof idx === 'number') setAuditing(s => ({ ...s, [idx]: false }));
      return;
    }

    // 强制理由输入
    const rawReason = prompt('请输入对赌理由/逻辑（必填，至少 5 个字符）:');
    if (rawReason === null || rawReason.trim().length < 5) {
      alert('❌ 指令撤销：理由缺失或过短（需至少 5 个字符）');
      return;
    }
    const reason = rawReason.trim();

    if (typeof idx === 'number') setAuditing(s => ({ ...s, [idx]: true }));

    // 调用后端审计
    let auditScore = 50;
    let auditJudgment = '无法获得审计结果';
    let penalty = 0;

    try {
      const auditRes = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, action, reason })
      });
      if (!auditRes.ok) throw new Error('audit request failed');
      const auditData = await auditRes.json();
      auditScore = auditData.score ?? 50;
      auditJudgment = auditData.judgment ?? '无法获得评语';
      penalty = typeof auditData.penalty === 'number' ? auditData.penalty : 0;
    } catch (e) {
      console.error('AI 审计调用失败:', e);
      alert('⚠️ AI 审计服务暂时不可用，指令已撤销。');
      if (typeof idx === 'number') setAuditing(s => ({ ...s, [idx]: false }));
      return;
    }

    // 若审计通过（API 返回），再执行写入；且扣分动作依赖于 penalty
    if (typeof idx === 'number') setAuditing(s => ({ ...s, [idx]: false }));
    if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: true }));

    // 将对赌记录写入暗池（包含审计结果）
    let insertError: any = null;
    let inserted = false;
    try {
      const { error } = await supabase
        .from('cognitive_stakes')
        .insert([{ headline, action, user_node: nodeId, reason, audit_score: auditScore, audit_judgment: auditJudgment, penalty }]);
      insertError = error;
      if (!error) inserted = true;
    } catch (e) { insertError = e; }

    if (!inserted) {
      console.warn('Initial insert failed (maybe missing reason column). Error:', insertError);
      try {
        const { error } = await supabase
          .from('cognitive_stakes')
          .insert([{ headline, action, user_node: nodeId }]);
        insertError = error;
        if (!error) inserted = true;
      } catch (e) { insertError = e; }
    }

    if (insertError) {
      alert('❌ 暗池网络连接阻断: ' + (insertError.message || insertError));
      if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
      return;
    }

    // 仅当 penalty > 0 时对云端账本进行扣分操作；否则跳过扣分
    if (inserted) {
      if (penalty > 0) {
        const { data: nodeRow, error: nodeReadErr } = await supabase
          .from('synapse_nodes')
          .select('credit')
          .eq('node_id', nodeId)
          .maybeSingle();
        if (nodeReadErr) {
          alert('❌ 无法读取节点账本: ' + nodeReadErr.message);
          if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
          return;
        }
        if (!nodeRow) {
          alert('❌ 未在云端账本中找到当前节点记录。');
          if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
          return;
        }
        if (nodeRow.credit < penalty) {
          alert('❌ 认知信用不足 (INSUFFICIENT CREDIT FOR PENALTY). 实际消耗: ' + penalty);
          if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
          return;
        }

        const newCredit = nodeRow.credit - penalty;
        const { error: updErr } = await supabase
          .from('synapse_nodes')
          .update({ credit: newCredit })
          .eq('node_id', nodeId);
        if (updErr) {
          alert('❌ 更新云端账本失败: ' + updErr.message);
          if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
          return;
        }
      }

      alert(`✅ 指令已刻录。节点 [${nodeId}] 执行 [${action}]。\n⚠️ AI评分: ${auditScore}/100 | 评语: ${auditJudgment}\n惩罚: ${penalty} PTS。`);
      await fetchPoolStats();
      if (typeof idx === 'number') setSubmitting(s => ({ ...s, [idx]: false }));
    }
  };

  // 页面其它初始化：拉取 feed
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/feed');
        const json = await response.json();
        if (json.data) setReports(json.data);
      } catch (e) {
        console.error('Engine Offline');
      } finally { setIsLoading(false); }
    };
    fetchReports();
  }, []);

  // log auto-scroll
  useEffect(() => { if (logContainerRef.current) logContainerRef.current.scrollTop = 0; }, [activityLogs]);
  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [terminalLines]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-mono p-4 md:p-12">
      <style>{`
        @keyframes creditPulse { 0%,100% { color: #00FF41 } 50% { color: #FFFFFF } }
        .credit-pulse { animation: creditPulse 0.6s ease-in-out; }
        @keyframes slideUp { 0% { transform: translateY(100%); opacity: 0 } 100% { transform: translateY(0); opacity:1 } }
        .log-entry { animation: slideUp 0.5s ease-out }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .terminal-line { animation: fadeIn 0.4s ease-in; color: #00FF41 }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b border-[#333] pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-[0.2em] text-white">SYNAPSE <span className="text-[#00FF41]">DARK_POOL</span></h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">Global Arbitrage & Cognitive Staking Engine</p>
          </div>
          <div className="text-right">
            <div className="text-[#00FF41] text-xs font-mono mb-1">■ PIPELINE_ACTIVE</div>
            <div className="text-gray-500 text-[10px] tracking-widest font-mono">
              NODE: <span className="text-white">{nodeId}</span>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="ml-2 text-[8px] text-gray-400 hover:text-gray-100" title="Reset identity (clear all localStorage)">[X]</button>
              | CREDIT: <span className={`${creditPulsing ? 'credit-pulse' : 'text-[#00FF41]'}`}>{credit.toLocaleString()}</span> PTS
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 border border-[#222] bg-[#111]">
            <div className="w-12 h-12 border-4 border-[#00FF41] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#00FF41] tracking-[0.3em] uppercase animate-pulse">DeepSeek Extracting Alpha...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {reports.map((report, index) => (
              <div key={index} className="border border-[#333] bg-[#111] p-6 md:p-8 relative overflow-hidden transition-all hover:border-[#555]">
                <div className="mb-6">
                  <span className="inline-block px-2 py-1 bg-[#222] text-gray-400 text-[10px] uppercase tracking-widest mb-3">RAW_DATA_SOURCE // {report.source}</span>
                  <h2 className="text-lg md:text-xl font-semibold text-white leading-relaxed">{report.headline}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 border-l-2 border-[#00FF41] pl-6">
                  <div>
                    <h3 className="text-[10px] text-[#00FF41] uppercase tracking-widest mb-2">Secondary Butterfly Effect</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{report.butterfly_effect}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] text-[#00FF41] uppercase tracking-widest mb-2">Arbitrage Action (Win Rate: {report.win_rate}%)</h3>
                    <p className="text-sm text-gray-300 font-medium leading-relaxed">{report.arbitrage_action}</p>
                  </div>
                </div>

                <div className="border-t border-[#222] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <span className="text-xs text-gray-500 uppercase tracking-widest">{stakedItems[index] ? 'POSITION_LOCKED' : 'STAKE YOUR COGNITIVE CREDIT:'}</span>
                  <div className="w-full md:w-auto mb-2 md:mb-0">
                    {intelText[index] && (
                      <div className="mb-2 text-sm text-[#00FF41] font-mono">{intelText[index]}</div>
                    )}
                    <div className="flex flex-col w-full md:w-auto">
                      <button onClick={() => fetchDeepIntel(report.headline, index)} disabled={!!intelLoading[index]} className="mb-2 px-2 py-1 text-[10px] tracking-widest uppercase bg-[#111] border border-[#444] text-[#00FF41] hover:bg-[#0b0b0b]">
                        {intelLoading[index] ? '正在提取机密变量...' : 'DEEP_INTEL'}
                      </button>
                      <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={() => handleStake(report.headline, 'LONG', index)} disabled={!!stakedItems[index] || !!submitting[index] || !!auditing[index]} className={`flex-1 md:w-32 py-3 text-xs font-bold tracking-widest uppercase transition-all ${stakedItems[index] === 'LONG' ? 'bg-[#00FF41] text-black' : stakedItems[index] === 'SHORT' ? 'bg-transparent text-[#333] border border-[#333]' : 'bg-transparent border border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black'}`}>{auditing[index] ? 'AUDITING...' : submitting[index] ? 'Submitting...' : 'LONG (做多)'}</button>
                        <button onClick={() => handleStake(report.headline, 'SHORT', index)} disabled={!!stakedItems[index] || !!submitting[index] || !!auditing[index]} className={`flex-1 md:w-32 py-3 text-xs font-bold tracking-widest uppercase transition-all ${stakedItems[index] === 'SHORT' ? 'bg-red-600 text-white' : stakedItems[index] === 'LONG' ? 'bg-transparent text-[#333] border border-[#333]' : 'bg-transparent border border-red-600 text-red-600 hover:bg-red-600 hover:text-white'}`}>{auditing[index] ? 'AUDITING...' : submitting[index] ? 'Submitting...' : 'SHORT (做空)'}</button>
                      </div>
                    </div>
                  </div>
                </div>

                {poolStats[report.headline] && (poolStats[report.headline].LONG > 0 || poolStats[report.headline].SHORT > 0) && (
                  <div className="mt-6 pt-4 border-t border-[#222]">
                    <div className="flex justify-between text-[10px] font-mono mb-2"><span className="text-[#00FF41]">LONG VOL: {poolStats[report.headline].LONG}</span><span className="text-gray-600 tracking-widest">GLOBAL CONSENSUS</span><span className="text-[#FF003C]">SHORT VOL: {poolStats[report.headline].SHORT}</span></div>
                    <div className="w-full h-1 bg-[#111] flex overflow-hidden">
                      <div className="h-full bg-[#00FF41] transition-all duration-700 ease-out" style={{ width: `${(poolStats[report.headline].LONG / (poolStats[report.headline].LONG + poolStats[report.headline].SHORT)) * 100}%`, transition: 'all 0.5s ease' }}></div>
                      <div className="h-full bg-[#FF003C] transition-all duration-700 ease-out" style={{ width: `${(poolStats[report.headline].SHORT / (poolStats[report.headline].LONG + poolStats[report.headline].SHORT)) * 100}%`, transition: 'all 0.5s ease' }}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 全局博弈日志 (固定在底部，可滚动显示最新条目) */}
      <div ref={logContainerRef} className="fixed bottom-0 left-0 w-full max-h-40 overflow-y-auto bg-[#111] text-[#00FF41] text-xs font-mono p-2 border-t border-[#222]">
        {activityLogs.map((log, i) => (<div key={i} className="log-entry py-1">{log}</div>))}
      </div>
      {/* ActivityTerminal: 黑客帝国风格实时流 */}
      <div ref={terminalRef} className="fixed bottom-0 right-0 w-80 h-40 overflow-y-auto bg-black bg-opacity-80 text-[#00FF41] text-xs font-mono p-2 border-t border-l border-[#222]">
        {terminalLines.map((l, i) => (<div key={i} className="terminal-line">{l}</div>))}
      </div>
    </div>
  );
}