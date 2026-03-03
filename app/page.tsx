"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

interface Report {
  headline: string;
  source: string;
  url?: string;
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

  // 页面加载：初始化节点并订阅实时数据库
  useEffect(() => {
    let stakesChannel: any = null;
    let providedNode = '';

    const setup = async () => {
      const stored = localStorage.getItem('synapse_node_id');
      if (stored) {
        providedNode = stored;
      } else {
        providedNode = 'ANON_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('synapse_node_id', providedNode);
      }
      setNodeId(providedNode);

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

  // 拉取 feed 数据
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`/api/feed?category=${category}`);
        const json = await response.json();
        // 这里的 json 结构需与后端 API 匹配，假设返回格式为 { data: [...] }
        if (json.data) setReports(json.data);
      } catch (e) {
        console.error('Engine Offline');
      } finally { 
        setIsLoading(false); 
        setCategoryLoading(false); 
      }
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

  // 自动滚动日志
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
          <div className="space-y-12 mb-40">
            {reports.map((report, index) => (
              <div key={report.url || report.headline || index} className="bg-[#111111] p-8 md:p-10 rounded-lg mb-6 border border-[#222222]">
                <div className="mb-6">
                  <span className="inline-block text-[#A0A0A0] text-[10px] uppercase tracking-widest mb-3">
                    数据来源：{report.source}
                  </span>
                  <h2 className="text-xl md:text-2xl font-semibold text-[#EDEDED] leading-relaxed">
                    {report.headline}
                  </h2>
                </div>

                <div className="border-t border-[#222] pt-6 flex gap-6">
                  <Link 
                    href={`/analyze?title=${encodeURIComponent(report.headline)}&url=${encodeURIComponent(report.url || '')}&source=${encodeURIComponent(category)}`}
                    target="_blank" 
                    className="text-sm tracking-widest uppercase text-[#888888] hover:text-[#EDEDED] transition-colors"
                  >
                    请求深度分析
                  </Link>
                  {report.url && (
                    <a 
                      href={report.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-sm tracking-widest uppercase text-[#444] hover:text-[#666] transition-colors"
                    >
                      原始链
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 全局博弈日志 (固定在底部左侧) */}
      <div ref={logContainerRef} className="fixed bottom-0 left-0 w-full md:w-1/2 max-h-40 overflow-y-auto bg-[#121212] bg-opacity-95 text-[#A0A0A0] text-xs font-sans p-4 border-t border-[#333333] z-50">
        <div className="text-[10px] text-[#444] mb-2 tracking-widest uppercase">Global Activity Log // 实时情报流</div>
        {activityLogs.map((log, i) => (<div key={i} className="log-entry py-1 border-b border-[#1a1a1a] last:border-0">{log}</div>))}
      </div>

      {/* ActivityTerminal: 黑客帝国风格实时流 (固定在底部右侧) */}
      <div ref={terminalRef} className="fixed bottom-0 right-0 hidden md:block w-1/2 h-40 overflow-y-auto bg-[#121212] bg-opacity-95 text-[#8AB4F8] text-[10px] font-mono p-4 border-t border-l border-[#333333] z-50">
        <div className="text-[#444] mb-2 tracking-widest uppercase">System Terminal // 节点状态</div>
        {terminalLines.map((l, i) => (<div key={i} className="terminal-line mb-1">{l}</div>))}
      </div>
    </div>
  );
}