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

const CATEGORIES = [
  { id: 'all', label: 'All 全部' },
  { id: 'ai', label: 'AI 与算力' },
  { id: 'finance', label: '宏观金融' },
  { id: 'geopolitics', label: '地缘博弈' },
  { id: 'china', label: '大中华区' },
  { id: 'industry', label: '实体工业' },
  { id: 'biotech', label: '合成生物' },
  { id: 'web3', label: 'Web3' }
];

export default function SynapseDarkPool() {
  // 节点与账本状态
  const [nodeId, setNodeId] = useState<string>('UNKNOWN_NODE');

  // 页面数据与 UI 状态
  const [category, setCategory] = useState<string>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  

  // 活动日志与终端
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  // 私钥/访问控制 (已精简为匿名节点，无需用户输入 Access Key)

  // DEEP_INTEL 状态（按索引）
  const [intelLoading, setIntelLoading] = useState<Record<number, boolean>>({});
  const [intelText, setIntelText] = useState<Record<number, string>>({});
  const [intelSaved, setIntelSaved] = useState<Record<number, boolean>>({});
  const [intelAnalysis, setIntelAnalysis] = useState<Record<number, string>>({});
  const [savingIntel, setSavingIntel] = useState<Record<number, boolean>>({});
  const [intelError, setIntelError] = useState<Record<number, string>>({});

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
      setIntelAnalysis(s => ({ ...s, [idx]: formattedIntel }));
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

  // 保存分析结果到智库档案
  const saveIntelToArchive = async (headline: string, analysis: string, idx: number) => {
    setSavingIntel(s => ({ ...s, [idx]: true }));
    setIntelError(s => ({ ...s, [idx]: '' }));
    try {
      const res = await fetch('/api/save-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: headline,
          source_url: '',
          analysis
        })
      });
      
      if (res.ok) {
        setIntelSaved(s => ({ ...s, [idx]: true }));
        setIntelError(s => ({ ...s, [idx]: '' }));
        const time = new Date().toLocaleTimeString();
        const line = `${time} > NODE ${nodeId || 'ANON'} ARCHIVED INTEL FOR: "${headline}"`;
        setActivityLogs(prev => [line, ...prev].slice(0, 10));
      } else {
        const errData = await res.json();
        const errMsg = errData.error || '存档失败，请重试';
        setIntelError(s => ({ ...s, [idx]: errMsg }));
        console.error('Save failed:', errMsg);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '网络链接异常';
      setIntelError(s => ({ ...s, [idx]: errMsg }));
      console.error('Archive failed', e);
    } finally {
      setSavingIntel(s => ({ ...s, [idx]: false }));
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
        const response = await fetch(`/api/feed?category=${category}`);
        const json = await response.json();
        if (json.data) setReports(json.data);
      } catch (e) {
        console.error('Engine Offline');
      } finally { setIsLoading(false); setCategoryLoading(false); }
    };
    fetchReports();
  }, [category]);

  // 处理分类切换
  const handleCategoryChange = (newCategory: string) => {
    if (newCategory !== category) {
      setCategory(newCategory);
      setCategoryLoading(true);
    }
  };

  // log auto-scroll
  useEffect(() => { if (logContainerRef.current) logContainerRef.current.scrollTop = 0; }, [activityLogs]);
  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [terminalLines]);

  return (
    <div className="min-h-screen bg-[#121212] text-[#EDEDED] font-sans p-6 md:p-12 leading-relaxed">
      <style>{`
        @keyframes slideUp { 0% { transform: translateY(100%); opacity: 0 } 100% { transform: translateY(0); opacity:1 } }
        .log-entry { animation: slideUp 0.5s ease-out }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .terminal-line { animation: fadeIn 0.4s ease-in; color: #8AB4F8 }
      `}</style>

      <div className="max-w-5xl mx-auto">
        <header className="mb-12 pb-6">
          <h1 className="text-3xl font-bold tracking-widest text-[#EDEDED]">SYNAPSE // 跨域融合演算矩阵</h1>
          <p className="text-sm text-[#A0A0A0] mt-2">泛行业信息聚合与 AI 融合分析平台</p>
        </header>

        {/* 七大分类导航栏 */}
        <nav className="mb-12 pb-6 border-b border-[#222222]">
          <div className="flex flex-wrap gap-6 md:gap-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`text-sm tracking-widest uppercase transition-all ${
                  category === cat.id
                    ? 'text-[#EDEDED] font-bold'
                    : 'text-[#666666] hover:text-[#888888]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {categoryLoading && (
            <div className="mt-4 text-xs text-[#888888] animate-pulse">正在接通该域数据管线...</div>
          )}
        </nav>

        {isLoading || categoryLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-[#121212]">
            <div className="w-12 h-12 border-4 border-[#444] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#A0A0A0] uppercase animate-pulse">{categoryLoading ? '正在接通该域...' : '加载中...'}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {reports.map((report, index) => (
              <div key={index} className="bg-[#111111] p-8 md:p-10 rounded-lg mb-6 border border-[#222222]">
                <div className="mb-6">
                  <a href={report.url || '#'} target="_blank" rel="noreferrer" className="inline-block px-2 py-1 text-[#A0A0A0] text-[10px] uppercase tracking-widest mb-3">数据来源：{report.source}</a>
                  <h2 className="text-xl md:text-2xl font-semibold text-[#EDEDED] leading-relaxed">{report.headline}</h2>
                </div>

                <div className="border-t border-[#222] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <span className="text-xs text-gray-500 uppercase tracking-widest">请求跨域融合分析</span>
                  <div className="w-full md:w-auto mb-2 md:mb-0">
                    {intelText[index] && (
                      <div className="mb-2 text-sm bg-[#1A1A1A] text-[#8AB4F8] font-sans p-4 rounded whitespace-pre-wrap border-l-2 border-[#8AB4F8]">{intelText[index]}</div>
                    )}
                    <div className="flex flex-col w-full md:w-auto gap-2">
                      <button onClick={() => fetchDeepIntel(report.headline, index)} disabled={!!intelLoading[index]} className="mb-2 px-4 py-2 text-sm tracking-widest uppercase bg-[#333333] text-[#EDEDED] font-semibold border border-[#444] hover:bg-[#444] disabled:opacity-50">
                        {intelLoading[index] ? '正在提取...' : '请求跨域融合分析'}
                      </button>
                      {intelAnalysis[index] && (
                        <>
                          <button 
                            onClick={() => saveIntelToArchive(report.headline, intelAnalysis[index], index)} 
                            disabled={intelSaved[index] || savingIntel[index]}
                            className={`px-4 py-2 text-sm tracking-widest uppercase font-semibold border flex items-center gap-2 justify-center transition-all ${
                              intelSaved[index] 
                                ? 'bg-[#2A3A2A] text-[#90EE90] border-[#4A6A4A] opacity-50' 
                                : 'bg-[#333333] text-[#EDEDED] border-[#444] hover:bg-[#444] disabled:opacity-50'
                            }`}
                          >
                            {savingIntel[index] ? (
                              <>
                                <span className="inline-block w-4 h-4 border-2 border-[#EDEDED] border-t-transparent rounded-full animate-spin"></span>
                                <span>正在刻录...</span>
                              </>
                            ) : intelSaved[index] ? (
                              <>
                                <span className="text-[#90EE90]">✓</span>
                                <span>已永久存档</span>
                              </>
                            ) : (
                              <span>存入智库档案</span>
                            )}
                          </button>
                          {intelError[index] && (
                            <div className="text-[10px] text-[#FF6B6B]">⚠ {intelError[index]}</div>
                          )}
                        </>
                      )}
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
      <div ref={logContainerRef} className="fixed bottom-0 left-0 w-full max-h-40 overflow-y-auto bg-[#121212] text-[#A0A0A0] text-xs font-sans p-2 border-t border-[#333333]">
        {activityLogs.map((log, i) => (<div key={i} className="log-entry py-1">{log}</div>))}
      </div>
      {/* ActivityTerminal: 黑客帝国风格实时流 */}
      <div ref={terminalRef} className="fixed bottom-0 right-0 w-80 h-40 overflow-y-auto bg-[#121212] bg-opacity-90 text-[#8AB4F8] text-xs font-sans p-2 border-t border-l border-[#333333]">
        {terminalLines.map((l, i) => (<div key={i} className="terminal-line">{l}</div>))}
      </div>
    </div>
  );
}