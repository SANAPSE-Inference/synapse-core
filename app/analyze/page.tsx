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
  const [copied, setCopied] = useState(false); // 复制状态开关

  useEffect(() => {
    if (!title) return;
    setLoading(true);
    setError('');
    setDisplay('');
    setCopied(false);
    
    // 建立高阶流式接收管道 (带缓冲池，修复断流)
    const fetchStream = async () => {
      try {
        const res = await fetch(`/api/deep-analyze?title=${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error('算力节点拒绝连接');
        
        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        if (!reader) throw new Error('流媒体通道建立失败');

        let done = false;
        let buffer = ''; // 缓冲池：专门接收断裂的数据包

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // 保留最后一行不完整的数据在缓冲池中
            buffer = lines.pop() || ''; 

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(trimmedLine.replace('data: ', ''));
                  const content = data.choices[0]?.delta?.content || '';
                  setDisplay(prev => prev + content); // 逐字渲染
                } catch (e) {
                  // 静默处理，交给缓冲池在下一波数据中自动修复
                }
              }
            }
          }
        }
      } catch (err) {
        setError('演算中断：遭遇高维网络阻断或超时');
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, [title]);

  // 物理剪贴板写入指令
  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // 2秒后恢复原状
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
      <div className="max-w-4xl mx-auto relative">
        <button
          onClick={() => window.close()}
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

        <div className="bg-[#111111] border border-[#222222] p-6 md:p-10 rounded-lg min-h-[400px] relative">
          
          {/* 绝对定位的复制按钮：仅在加载完成且有内容时显示 */}
          {!loading && display && (
            <button
              onClick={handleCopy}
              className={`absolute top-4 right-4 md:top-6 md:right-6 text-[10px] tracking-widest uppercase border px-3 py-1.5 rounded transition-all backdrop-blur-sm z-10 ${
                copied 
                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                  : 'border-[#333] text-[#888] hover:text-white hover:border-white bg-[#111]/80'
              }`}
            >
              {copied ? '已复制 (COPIED)' : '复制报告 (COPY)'}
            </button>
          )}

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