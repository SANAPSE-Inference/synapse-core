"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Report {
  headline: string;
  source: string;
  url?: string;
}

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

export default function SynapseMatrix() {
  const [hasEntered, setHasEntered] = useState(false); 
  const [category, setCategory] = useState<string>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!hasEntered) return;
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/feed?category=${category}`);
        const json = await response.json();
        if (json.data) setReports(json.data);
      } catch (e) {
        console.error('Engine Offline');
      } finally { setIsLoading(false); }
    };
    fetchReports();
  }, [category, hasEntered]);

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory !== category) {
      setCategory(newCategory);
      setTranslations({}); 
    }
  };

  const handleTranslate = async (text: string, index: number) => {
    if (translations[index] || translating[index]) return;
    setTranslating(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch(`/api/translate?text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('API Fault');
      const data = await res.json();
      if (data.result) {
        setTranslations(prev => ({ ...prev, [index]: data.result }));
      } else {
        setTranslations(prev => ({ ...prev, [index]: "【系统提示：破译失败，请重试】" }));
      }
    } catch (e) {
      setTranslations(prev => ({ ...prev, [index]: "【网络阻断：无法连接破译中心】" }));
    } finally {
      setTranslating(prev => ({ ...prev, [index]: false }));
    }
  };

  if (!hasEntered) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-50 text-[#ededed] font-sans selection:bg-[#333]">
        <div className="text-center">
          <h1 className="text-xs md:text-sm tracking-[0.6em] text-[#777] mb-16 animate-pulse uppercase font-mono">
            SYNAPSE // SYSTEM STANDBY
          </h1>
          <button 
            onClick={() => setHasEntered(true)}
            className="border border-[#444] hover:border-[#ededed] hover:bg-[#ededed] hover:text-[#050505] transition-all duration-700 px-12 py-4 tracking-[0.4em] text-xs uppercase text-[#aaa]"
          >
            [ INITIALIZE MATRIX ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#EDEDED] font-sans p-6 md:p-12 leading-relaxed selection:bg-[#444]">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-1000">
        
        <header className="mb-14 pb-8 border-b border-[#222]">
          <h1 className="text-2xl md:text-3xl font-bold tracking-[0.15em] text-[#EDEDED] uppercase">
            SYNAPSE // 跨域融合演算矩阵
          </h1>
          <p className="text-[10px] tracking-[0.3em] text-[#888] mt-4 uppercase">泛行业高密情报聚合与 AI 战略推演</p>
        </header>

        <nav className="mb-12">
          <div className="flex flex-wrap gap-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`text-[11px] tracking-widest uppercase transition-all duration-300 ${
                  category === cat.id
                    ? 'text-[#EDEDED] font-bold border-b border-[#EDEDED] pb-1.5'
                    : 'text-[#888] hover:text-[#fff] pb-1.5 border-b border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </nav>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <div className="w-8 h-8 border-2 border-[#555] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-[#888] tracking-[0.3em] uppercase animate-pulse">Establishing Secure Uplink...</p>
          </div>
        ) : (
          <div className="space-y-8 mb-32">
            {reports.map((report, index) => (
              <div key={index} className="group relative bg-[#0d0d0d] p-8 rounded border border-[#222] hover:border-[#555] transition-all duration-500 overflow-hidden">
                
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ededed] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="flex justify-between items-start mb-5">
                  <span className="inline-block text-[#888] text-[9px] uppercase tracking-[0.2em] font-mono">
                    SRC_NODE: {report.source}
                  </span>
                  <button 
                    onClick={() => handleTranslate(report.headline, index)}
                    className="text-[9px] tracking-[0.2em] text-[#888] hover:text-[#ededed] transition-colors uppercase border border-[#333] hover:border-[#888] px-2 py-1 rounded"
                  >
                    {translating[index] ? 'DECODING...' : translations[index] ? 'DECODED' : 'TRANSLATE'}
                  </button>
                </div>

                <h2 className="text-xl font-medium text-[#EDEDED] leading-relaxed group-hover:text-white transition-colors">
                  {report.headline}
                </h2>

                {translations[index] && (
                  <div className="mt-5 pt-4 border-t border-[#222] animate-in slide-in-from-top-2 fade-in duration-500">
                    <p className="text-[14px] text-[#A0A0A0] leading-loose">
                      {translations[index]}
                    </p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-[#222] flex gap-8 items-center">
                  <Link 
                    href={`/analyze?title=${encodeURIComponent(report.headline)}&source=${encodeURIComponent(category)}`}
                    target="_blank" 
                    className="text-[10px] tracking-[0.2em] uppercase text-[#999] hover:text-[#ededed] transition-colors"
                  >
                    [ 启动高维分析 ]
                  </Link>
                  {report.url && (
                    <a 
                      href={report.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] tracking-[0.2em] uppercase text-[#777] hover:text-[#ededed] transition-colors"
                    >
                      阅读信源
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}