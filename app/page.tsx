"use client";
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Report {
  headline: string;
  source: string;
  url?: string;
  butterfly_effect?: string;
  arbitrage_action?: string;
  win_rate?: number;
}

// 建立与云端暗池的物理连接
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SynapseDarkPool() {
  // 节点与账本状态
  const [nodeId, setNodeId] = useState<string>('UNKNOWN_NODE');

  // 页面数据与 UI 状态
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  

  // 活动日志与终端
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  // 私钥/访问控制 (已精简为匿名节点，无需用户输入 Access Key)

  // DEEP_INTEL 状态（按索引）
  const [intelLoading, setIntelLoading] = useState<Record<number, boolean>>({});
  const [intelText, setIntelText] = useState<Record<number, string>>({});

  // 已移除 poolStats 聚合逻辑 — UI 简化为情报提取为主

  // DEEP_INTEL 请求与显示
  const fetchDeepIntel = async (headline: string, idx: number) => {
    setIntelLoading(s => ({ ...s, [idx]: true }));
    setIntelText(s => ({ ...s, [idx]: '正在提取跨域融合情报...' }));
    try {
      const res = await fetch('/api/intel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline }) });
      if (!res.ok) throw new Error('intel request failed');
      const j = await res.json();
      const intel = j.text || j.intel || '无情报';
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

      // 写活动日志与终端（节点提取情报）
      const time = new Date().toLocaleTimeString();
      const line = `${time} > NODE ${nodeId || 'ANON'} EXTRACTED FUSION INTEL FOR: "${headline}"`;
      setActivityLogs(prev => [line, ...prev].slice(0, 10));
      const terminalLine = `[INTEL] ${nodeId || 'ANON'} | ${headline} | ${time}`;
      setTerminalLines(prev => [...prev, terminalLine].slice(-50));
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
    let providedNode = '';

    const setup = async () => {
      // 优先 localStorage，否则生成匿名持久化 ID（零感知登录）
      const stored = localStorage.getItem('synapse_node_id');
      if (stored) {
        providedNode = stored;
      } else {
        providedNode = 'ANON_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('synapse_node_id', providedNode);
      }
      setNodeId(providedNode);

      // 订阅 cognitive_stakes 插入，仅用于活动流展示（语义化为情报提取日志）
      try {
        stakesChannel = supabase
          .channel('schema-db-changes')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cognitive_stakes' }, (payload) => {
            const rec = payload.new as any;
            const time = new Date().toLocaleTimeString();
            const line = `${time} > NODE ${rec.user_node || 'UNKNOWN'} GENERATED FUSION INTEL FOR: "${rec.headline || 'UNKNOWN'}"`;
            setActivityLogs(prev => [line, ...prev].slice(0, 10));
            const terminalLine = `[INTEL] ${rec.user_node || 'UNKNOWN'} | ${rec.headline || 'UNKNOWN'} | ${time}`;
            setTerminalLines(prev => [...prev, terminalLine].slice(-50));
          })
          .subscribe();
      } catch (e) {
        console.error('Failed to subscribe to cognitive_stakes channel', e);
      }
    };

    setup();

    return () => {
      try { if (stakesChannel && typeof stakesChannel.unsubscribe === 'function') stakesChannel.unsubscribe(); }
      catch (_) {}
    };
  }, []);

  // 已移除 handleStake（对赌/审计）逻辑 — 平台核心为情报提取与融合分析

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
        @keyframes slideUp { 0% { transform: translateY(100%); opacity: 0 } 100% { transform: translateY(0); opacity:1 } }
        .log-entry { animation: slideUp 0.5s ease-out }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .terminal-line { animation: fadeIn 0.4s ease-in; color: #00FF41 }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b border-[#333] pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-[0.2em] text-white">SYNAPSE <span className="text-[#00FF41]">// 跨域信息汇编与 AI 融合矩阵</span></h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">泛行业信息聚合与 AI 融合分析平台</p>
          </div>
          <div className="text-right">
            <div className="text-[#00FF41] text-xs font-mono mb-1">■ PIPELINE_ACTIVE</div>
            <div className="text-gray-500 text-[10px] tracking-widest font-mono">
              NODE: <span className="text-white">{nodeId}</span>
              <button onClick={() => { localStorage.removeItem('synapse_node_id'); window.location.reload(); }} className="ml-2 text-[8px] text-gray-400 hover:text-gray-100" title="Reset identity">[X]</button>
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
                  <a href={report.url || '#'} target="_blank" rel="noreferrer" className="inline-block px-2 py-1 bg-[#222] text-gray-400 text-[10px] uppercase tracking-widest mb-3">RAW_DATA_SOURCE // {report.source}</a>
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
                  <span className="text-xs text-gray-500 uppercase tracking-widest">请求跨域融合分析</span>
                  <div className="w-full md:w-auto mb-2 md:mb-0">
                    {intelText[index] && (
                      <div className="mb-2 text-sm text-[#00FF41] font-mono">{intelText[index]}</div>
                    )}
                    <div className="flex flex-col w-full md:w-auto">
                      <button onClick={() => fetchDeepIntel(report.headline, index)} disabled={!!intelLoading[index]} className="mb-2 px-3 py-2 text-sm tracking-widest uppercase bg-[#00FF41] text-black font-semibold border border-[#444] hover:brightness-95">
                        {intelLoading[index] ? '正在提取...' : '请求跨域融合分析'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* poolStats 已移除 — UI 简化，保留标题与情报文本 */}
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