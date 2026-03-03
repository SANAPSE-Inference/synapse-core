"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
// 已暂时剥离 Supabase 订阅逻辑，提升首页加载极速体验

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

export default function SynapseDarkPool() {
  const [category, setCategory] = useState<string>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // 拉取 feed 数据
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`/api/feed?category=${category}`);
        const json = await response.json();
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

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory !== category) {
      setCategory(newCategory);
      setCategoryLoading(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#EDEDED] font-sans p-6 md:p-12 leading-relaxed">
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
          <div className="space-y-12 mb-20">
            {reports.map((report, index) => (
              <div key={report.url || report.headline || index} className="bg-[#111111] p-8 md:p-10 rounded-lg mb-6 border border-[#222222]">
                <div className="mb-6">
                  <span className="inline-block text-[#A0A0A0] text-[10px] uppercase tracking-widest mb-3">
                    数据来源：{report.source}
                  </span>
                  <h2 className="text-xl md:text-2xl font-semibold text-[#EDEDED] leading-relaxed hover:text-white transition-colors">
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
                      阅读原文
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 物理切除：删除了多余的 Global Activity Log 和 System Terminal 幽灵区块 */}
    </div>
  );
}