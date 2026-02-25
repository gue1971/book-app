import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Settings, 
  Bookmark, 
  Search, 
  X, 
  MoreHorizontal,
  Home,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { entries } from './content/entries';

/**
 * ブックアプリ 仕様 v0.4 準拠 + PWA機能
 * - Canvas: 1080 x 1920 px
 * - Safe Area: 1080 x 1800 px
 * - PWA Install Logic 追加
 */

const APP_ID = "modern-book-app-v1";
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const FOOTER_HEIGHT = 120;
const MAIN_HEIGHT = 1800;
const TOC_ROW_HEIGHT = 88;
const NO_INDENT_HEAD_RE = /^[「『（【〈《〔［｛〝“]/;
const DIALOGUE_DASH_RE = /^[-―—]{2,}/;
const JP_CHAR_RE = /[ぁ-んァ-ヶー一-龠々〆ヵヶ]/;

export default function App() {
  const [currentPage, setCurrentPage] = useState(0); 
  const [currentViewId, setCurrentViewId] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [marks, setMarks] = useState([]);
  const [settings, setSettings] = useState({ fontSize: 24, theme: 'dark' });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const containerRef = useRef(null);
  const normalizedEntries = useMemo(
    () =>
      entries.map((entry, idx) => {
        if (Array.isArray(entry.views) && entry.views.length > 0) {
          return {
            ...entry,
            initialView: entry.initialView || entry.views[0].id
          };
        }
        return {
          ...entry,
          id: entry.id ?? `entry-${idx + 1}`,
          initialView: "v-text",
          views: [
            {
              id: "v-text",
              type: "text",
              title: entry.author ? `本文（${entry.author}）` : "本文",
              content: entry.content ?? ""
            }
          ]
        };
      }),
    []
  );

  // --- 初期化 & PWA対応 ---
  useEffect(() => {
    // 状態復元
    const saved = localStorage.getItem(APP_ID);
    if (saved) {
      try {
        const { page, viewId, marks, settings } = JSON.parse(saved);
        const maxPage = normalizedEntries.length + 1;
        const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 0), maxPage) : 0;
        setCurrentPage(safePage);
        setCurrentViewId(viewId ?? null);
        setMarks(Array.isArray(marks) ? marks : []);
        setSettings(settings || { fontSize: 24, theme: 'dark' });
      } catch {
        localStorage.removeItem(APP_ID);
      }
    }
    
    // リサイズ処理
    const handleResize = () => {
      const clientWidth = window.innerWidth;
      const clientHeight = window.innerHeight;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const s = Math.min(clientWidth / CANVAS_WIDTH, clientHeight / CANVAS_HEIGHT);
      setScale(s);
      setOffset({
        x: (clientWidth - CANVAS_WIDTH * s) / 2,
        y: (clientHeight - CANVAS_HEIGHT * s) / 2
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // PWAインストールイベントの捕捉
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Service Worker登録（本番のみ）
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(err => {
          console.log('SW registration failed: ', err);
        });
      });
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 状態保存
  useEffect(() => {
    localStorage.setItem(APP_ID, JSON.stringify({
      page: currentPage,
      viewId: currentViewId,
      marks,
      settings
    }));
  }, [currentPage, currentViewId, marks, settings]);

  const currentEntry = currentPage >= 2 ? normalizedEntries[currentPage - 2] : null;
  const contentFontSize = useMemo(() => {
    if (!Number.isFinite(scale) || scale <= 0) return settings.fontSize;
    const minReadablePxOnDevice = 18;
    const logicalMinSize = Math.ceil(minReadablePxOnDevice / scale);
    return Math.max(settings.fontSize, logicalMinSize);
  }, [scale, settings.fontSize]);

  const goToPage = (pageIdx) => {
    setCurrentPage(pageIdx);
    setShowOverlay(false);
    if (pageIdx >= 2) {
      const entry = normalizedEntries[pageIdx - 2];
      setCurrentViewId(entry.initialView);
    }
  };

  const next = () => { if (currentPage < normalizedEntries.length + 1) goToPage(currentPage + 1); };
  const prev = () => { if (currentPage > 0) goToPage(currentPage - 1); };

  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (x > CANVAS_WIDTH * 0.35 && x < CANVAS_WIDTH * 0.65 &&
        y > CANVAS_HEIGHT * 0.2 && y < CANVAS_HEIGHT * 0.8) {
      setShowOverlay(!showOverlay);
    } else if (x < CANVAS_WIDTH * 0.35) {
      prev();
    } else if (x > CANVAS_WIDTH * 0.65) {
      next();
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- Views ---

  const CoverView = () => (
    <div className="relative h-full w-full bg-[#f5f5f5] text-[#161616]">
      <div
        className="absolute inset-8 border-[6px]"
        style={{ borderColor: "#7a899b" }}
      />
      <div
        className="absolute inset-[56px] border-[2px]"
        style={{ borderColor: "#9aa7b5" }}
      />

      <div className="absolute left-0 top-[560px] w-full px-20 text-center">
        <h1
          className="text-[84px] font-semibold tracking-[0.06em]"
          style={{ fontFamily: `"Hiragino Mincho ProN", "Yu Mincho", "Hiragino Serif", serif` }}
        >
          あみちゃん
        </h1>
        <p
          className="mt-8 text-[44px] tracking-[0.03em]"
          style={{ fontFamily: `"Hiragino Mincho ProN", "Yu Mincho", "Hiragino Serif", serif` }}
        >
          第２１９回短編小説新人賞　最終選考作品
        </p>
      </div>

      <div className="absolute bottom-[250px] left-0 w-full px-20 text-center">
        <p
          className="text-[72px] font-semibold tracking-[0.05em]"
          style={{ fontFamily: `"Hiragino Mincho ProN", "Yu Mincho", "Hiragino Serif", serif` }}
        >
          御厨佐代子
        </p>
      </div>
    </div>
  );

  const TOCView = () => (
    <div className="w-full h-full bg-white text-slate-900 flex flex-col pt-16">
      <div className="px-10 mb-12">
        <h2 className="text-5xl font-black">目次</h2>
        <div className="w-20 h-2 bg-indigo-600 mt-4" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {normalizedEntries.map((entry, i) => (
          <button
            key={entry.id}
            onClick={() => goToPage(i + 2)}
            className="w-full flex items-center px-10 border-b border-slate-100"
            style={{ height: TOC_ROW_HEIGHT }}
          >
            <span className="text-slate-300 font-mono text-xl w-12">{i + 1}</span>
            <span className="flex-1 text-left text-2xl font-bold truncate mx-4">{entry.title}</span>
            <span className="text-slate-400 font-mono text-lg">p.{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const EntryContent = () => {
    if (!currentEntry) {
      return (
        <div className="h-full w-full bg-white p-10 pt-16 text-slate-900">
          <h3 className="mb-4 text-3xl font-bold">表示できるコンテンツがありません</h3>
          <p className="text-xl text-slate-600">目次に戻ってページを選び直してください。</p>
        </div>
      );
    }
    const view = currentEntry.views.find(v => v.id === currentViewId) || currentEntry.views[0];
    const textParagraphs = String(view.content ?? "")
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((paragraph) =>
        paragraph
          .split("\n")
          .map((line) => line.replace(/^ +/, "").trimEnd())
          .join("")
          .replace(/([ぁ-んァ-ヶー一-龠々〆ヵヶ]) +([ぁ-んァ-ヶー一-龠々〆ヵヶ])/g, "$1$2")
          .trimEnd()
      )
      .filter(Boolean);

    return (
      <div className="w-full h-full bg-white text-slate-900 p-10 pt-16">
        {view.type === 'text' && (
          <div className="h-full overflow-y-auto pr-2">
            <h3 className="text-4xl font-bold mb-10">{currentEntry.title}</h3>
            {currentEntry.author && (
              <p className="mb-8 text-xl tracking-wide text-slate-500">著者: {currentEntry.author}</p>
            )}
            <div className="space-y-6">
              {textParagraphs.map((paragraph, idx) => {
                const start = paragraph.trimStart();
                const noIndentByLeading = start.startsWith("　");
                const noIndentByHead =
                  NO_INDENT_HEAD_RE.test(start) ||
                  DIALOGUE_DASH_RE.test(start) ||
                  !JP_CHAR_RE.test(start.charAt(0));

                return (
                  <p
                    key={idx}
                    className="whitespace-pre-wrap text-slate-800"
                    style={{
                      fontSize: contentFontSize,
                      lineHeight: 1.9,
                      letterSpacing: "0.01em",
                      textAlign: "left",
                      lineBreak: "strict",
                      wordBreak: "normal",
                      overflowWrap: "break-word",
                      fontFamily: `"Hiragino Mincho ProN", "Yu Mincho", "Hiragino Serif", serif`,
                      textIndent: noIndentByLeading || noIndentByHead ? "0em" : "1em"
                    }}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        )}
        {view.type === 'image' && (
          <div className="absolute inset-0 bg-black">
            <img src={view.content} className="w-full h-full object-cover" alt={view.title} />
          </div>
        )}
        {view.type === 'quiz' && (
          <div className="h-full bg-indigo-50 p-10 pt-16">
            <div className="mb-6 flex items-center gap-3 font-bold uppercase tracking-widest text-indigo-600">
              <AlertCircle size={32} />
              Question
            </div>
            <h3 className="mb-10 text-4xl font-bold text-slate-800">{view.content}</h3>
            <div className="space-y-4">
              {view.options?.map((opt, idx) => (
                <button
                  key={idx}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-6 text-left text-2xl font-medium shadow-sm active:bg-slate-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
        {view.type === 'answer' && (
          <div className="h-full bg-emerald-50 p-10 pt-16">
            <div className="mb-6 flex items-center gap-3 font-bold uppercase tracking-widest text-emerald-600">
              <CheckCircle2 size={32} />
              Answer
            </div>
            <p className="text-3xl font-medium leading-relaxed text-slate-800">{view.content}</p>
          </div>
        )}
      </div>
    );
  };

  const OverlayUI = () => (
    <div className={`absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col transition-opacity duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="p-10 flex justify-between items-start">
        <button onClick={() => goToPage(1)} className="p-4 bg-white/10 rounded-full text-white"><List size={40} /></button>
        <div className="flex gap-4">
          {deferredPrompt && (
            <button onClick={handleInstall} className="p-4 bg-indigo-600 rounded-full text-white animate-bounce">
              <Download size={40} />
            </button>
          )}
          <button className="p-4 bg-white/10 rounded-full text-white"><Settings size={40} /></button>
        </div>
      </div>
      <div className="flex-1" />
      <div className="p-10 bg-black/40">
        <input type="range" min="0" max={normalizedEntries.length + 1} value={currentPage} onChange={(e) => goToPage(parseInt(e.target.value, 10))} className="w-full h-2 mb-8 accent-white" />
        <div className="flex justify-between text-white">
          <button onClick={prev} className="p-6 bg-white/10 rounded-full"><ChevronLeft size={48} /></button>
          <div className="text-center">
            <div className="text-sm opacity-50 uppercase mb-1">Entry</div>
            <div className="text-2xl font-bold">{currentEntry?.title || "Index"}</div>
          </div>
          <button onClick={next} className="p-6 bg-white/10 rounded-full"><ChevronRight size={48} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      <div 
        className="absolute bg-white shadow-2xl overflow-hidden transition-transform duration-150 origin-top-left"
        style={{ 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT, 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` 
        }}
        onClick={handleCanvasClick}
      >
        <div className="absolute top-0 left-0 w-full" style={{ height: MAIN_HEIGHT }}>
          {currentPage === 0 && <CoverView />}
          {currentPage === 1 && <TOCView />}
          {currentPage >= 2 && <EntryContent />}
        </div>
        
        {currentPage >= 2 && (
          <div className="absolute bottom-0 left-0 w-full bg-slate-900 flex items-center px-6" style={{ height: FOOTER_HEIGHT }}>
            {currentEntry?.views.length > 1 ? (
              <div className="flex gap-2">
                {currentEntry.views.map(v => (
                  <button key={v.id} onClick={(e) => { e.stopPropagation(); setCurrentViewId(v.id); }} className={`px-4 py-2 rounded-lg font-bold ${currentViewId === v.id ? 'bg-white text-slate-900' : 'text-white/60'}`}>
                    {v.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-white/40 font-mono">P.{currentPage - 1} / {normalizedEntries.length}</div>
            )}
          </div>
        )}
        <OverlayUI />
      </div>
    </div>
  );
}
