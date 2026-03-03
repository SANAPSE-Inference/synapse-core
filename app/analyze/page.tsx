"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function DeepAnalyzeView() {
  const params = useSearchParams();
  const title = params?.get('title') || '';
  const url = params?.get('url') || '';
  const source = params?.get('source') || '';

  const [display, setDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!title) return;
    setLoading(true);
    fetch(`/api/deep-analyze?title=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.result) {
          const full: string = j.result;
          let i = 0;
          const timer = setInterval(() => {
            i++;
            setDisplay(full.slice(0, i));
            if (i >= full.length) clearInterval(timer);
          }, 24);
        } else {
          setError('演算出错');
        }
      })
      .catch(() => {
        setError('演算超时，链路重置');
      })
      .finally(() => setLoading(false));
  }, [title]);

  return (
    <div className="min-h-screen bg-[#121212] text-[#EDEDED] font-sans p-6 md:p-12 leading-relaxed">
      <Link href="/" className="text-sm text-[#888] mb-4 inline-block">← 返回全局监控</Link>
      <h1 className="text-xl font-semibold mb-2 break-words">{title}</h1>
      {loading && <p className="text-[#888]">演算引擎运转中...</p>}
      {error && <p className="text-[#FF6B6B]">{error}</p>}
      <div className="prose max-w-none whitespace-pre-wrap text-[#EDEDED] font-mono">{display}</div>
    </div>
  );
}