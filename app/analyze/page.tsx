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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!title) return;
    setLoading(true);
    setError('');
    setDisplay('');
    setCopied(false);
    
    const fetchStream = async () => {
      let currentText = '';
      try {
        const res = await fetch(`/api/deep-analyze?title=${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error('算力节点拒绝连接');
        
        const reader = res.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        if (!reader) throw new Error('流媒体通道建立失败');

        let done = false;
        let buffer = ''; 

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的块

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(trimmedLine.replace('data: ', ''));
                  const content = data.choices[0]?.delta?.content || '';
                  currentText += content;
                  setDisplay(currentText); 
                } catch (e) {
                  // 忽略无法解析的碎块
                }
              }
            }
          }
        }
        
        // 核心修复：打捞缓冲池中最后残留的数据
        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
           try {
               const data = JSON.parse(buffer.trim().replace('data: ', ''));
               const content = data.choices[0]?.delta?.content || '';
               currentText += content;
               setDisplay(currentText);
           } catch(e) {}
        }

        // 核心防线：检查文章是否完整输出（是否包含最后的锚点模块）
        if (!currentText.includes('套利') && !currentText.includes('锚点')) {
           setDisplay(prev => prev + '\n\n[ 系统警告：算力连接被云端强制切断，输出不完整。请关闭重试。 ]');
        }

      } catch (err) {
        setError('演算中断：遭遇高维网络阻断或超时');
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, [title]);

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
      <div className="max-w-4xl mx-auto relative">
        <button
          onClick={() => window.close()}
          className="text-sm tracking-widest text-[#999] hover:text-[#EDEDED] mb-8 inline-block transition-colors"
        >
          [X] 关闭深潜终端
        </button>
        
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-[#EDEDED] leading-relaxed mb-4">
            {title}
          </h1>
          {source && (
            <p className="text-xs text-[#777] uppercase tracking-widest">
              数据来源: {source}
            </p>
          )}
        </div>

        <div className="bg-[#0d0d0d] border border-[#222] p-6 md:p-10 rounded-lg min-h-[400px] relative">
          
          {!loading && display && (
            <button
              onClick={handleCopy}
              className={`absolute top-4 right-4 md:top-6 md:right-6 text-[10px] tracking-widest uppercase border px-3 py-1.5 rounded transition-all backdrop-blur-sm z-10 ${
                copied 
                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                  : 'border-[#444] text-[#888] hover:text-white hover:border-[#888] bg-[#111]/80'
              }`}
            >
              {copied ? '已复制 (COPIED)' : '复制报告 (COPY)'}
            </button>
          )}

          {loading && !display && (
            <div className="text-[#888] animate-pulse text-sm tracking-widest">
              正在接通 DeepSeek 流式算力通道...
            </div>
          )}
          
          {error && (
            <div className="text-red-900 bg-red-100/10 p-4 rounded text-sm tracking-widest">
              {error}
            </div>
          )}
          
          {display && (
            <div className={`text-[15px] leading-loose whitespace-pre-wrap font-sans ${display.includes('系统警告') ? 'text-[#D4D4D4]' : 'text-[#D4D4D4]'}`}>
              {display}
              {loading && <span className="animate-pulse inline-block ml-1 w-2 h-4 bg-[#888] translate-y-1"></span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeepAnalyzeView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] text-[#888] p-12 animate-pulse tracking-widest">初始化深潜环境...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}