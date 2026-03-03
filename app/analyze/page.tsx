"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AnalyzeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const title = params.get('title') || '';
  const source = params.get('source') || '';

  const [display, setDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!title) return;
    setLoading(true);
    setError('');
    
    fetch(`/api/deep-analyze?title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.result) {
          // 打字机特效演算输出
          const full = j.result;
          let i = 0;
          const timer = setInterval(() => {
            i += 2; // 调整打字速度
            setDisplay(full.slice(0, i));
            if (i >= full.length) {
              clearInterval(timer);
              setLoading(false);
            }
          }, 10);
        } else {
          setError(j.error || '分析失败：未获取到有效数据');
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        setError('演算出错：算力矩阵连接断开或超时');
        setLoading(false);
      });
  }, [title]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* 修复失忆的返回按钮 */}
      <button
        onClick={() => router.back()}
        className="text-sm tracking-widest text-[#888888] hover:text-[#EDEDED] mb-8 inline-block transition-colors"
      >
        &larr; 返回全局监控
      </button>
      
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-[#EDEDED] leading-relaxed mb-4">
          {title}
        </h1>
        {source && (
          <p className="text-xs text-[#666666] uppercase tracking-widest">
            数据来源: {source}
          </p>
        )}
      </div>

      <div className="bg-[#111111] border border-[#222222] p-6 md:p-10 rounded-lg min-h-[400px]">
        {loading && !display && (
          <div className="text-[#888888] animate-pulse text-sm tracking-widest">
            正在呼叫 DeepSeek 算力矩阵，进行高维降解...
          </div>
        )}
        
        {error && (
          <div className="text-red-900 bg-red-100/10 p-4 rounded text-sm tracking-widest">
            {error}
          </div>
        )}
        
        {display && (
          <div className="text-[#D4D4D4] text-[15px] leading-loose whitespace-pre-wrap font-sans">
            {display}
            {loading && <span className="animate-pulse inline-block ml-1 w-2 h-4 bg-[#888888] translate-y-1"></span>}
          </div>
        )}
      </div>
    </div>
  );
}

// 解决 Next.js 静态打包报错的护盾边界
export default function DeepAnalyzeView() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-12 text-[#888888] animate-pulse tracking-widest">正在接通深潜管线...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}