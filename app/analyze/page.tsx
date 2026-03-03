"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AnalyzeContent() {
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
    setDisplay('');
    
    // 建立真实的流式接收管道
    const fetchStream = async () => {
      try {
        const res = await fetch(`/api/deep-analyze?title=${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error('算力节点拒绝连接');
        
        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        if (!reader) throw new Error('流媒体通道建立失败');

        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.replace('data: ', ''));
                  const content = data.choices[0]?.delta?.content || '';
                  setDisplay(prev => prev + content); // 逐字渲染
                } catch (e) {
                  // 忽略断流碎片
                }
              }
            }
          }
        }
      } catch (err) {
        setError('演算中断：遭遇高维网络阻断');
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, [title]);

  return (
    // 强制全局暗黑底色，彻底修复白屏刺眼 Bug
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => window.close()} // 改为关闭当前标签页
          className="text-sm tracking-widest text-[#888888] hover:text-[#EDEDED] mb-8 inline-block transition-colors"
        >
          [X] 关闭深潜终端
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
              正在接通 DeepSeek 流式算力通道...
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
    </div>
  );
}

export default function DeepAnalyzeView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] text-[#888888] p-12 animate-pulse tracking-widest">初始化深潜环境...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}