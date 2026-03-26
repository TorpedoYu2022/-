
import React, { useState, useRef } from 'react';
import { AppState, ComicStyle, ComicPanel, StoryLength, AspectRatio } from './types';
import { generateComicScript, generatePanelImage } from './services/geminiService';
import { Header, Footer, Card } from './components/Layout';
import html2canvas from 'html2canvas';

const STYLE_INFO: Record<ComicStyle, { name: string, desc: string }> = {
  [ComicStyle.FLAT_MINIMAL]: {
    name: "极简商务风",
    desc: "干净的线条与明亮的色块。这种风格非常现代且显得专业。"
  },
  [ComicStyle.CORPORATE_MANGA]: {
    name: "职场漫画风",
    desc: "日式职场漫风格。人物表情和动作更丰富，非常有亲和力。"
  },
  [ComicStyle.RETRO_COMIC]: {
    name: "复古经典风",
    desc: "1950年代美式漫画感。具有强烈的突破性和怀旧美感。"
  },
  [ComicStyle.CYBERPUNK]: {
    name: "赛博科技风",
    desc: "蓝图感搭配霓虹冷色调。适合数字化转型或 AI 主题。"
  },
  [ComicStyle.WATERCOLOR]: {
    name: "专业水彩风",
    desc: "柔和的艺术笔触。给人一种人性化、温情和高端的感觉。"
  },
  [ComicStyle.CUSTOM]: {
    name: "自定义风格",
    desc: "输入你想要的特定视觉描述。"
  }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    whitepaperContent: '',
    selectedStyle: ComicStyle.FLAT_MINIMAL,
    customStyleText: '',
    storyLength: 6,
    aspectRatio: '1:1',
    script: null,
    status: 'idle',
  });

  const panelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEffectiveStyle = () => {
    return state.selectedStyle === ComicStyle.CUSTOM 
      ? state.customStyleText 
      : state.selectedStyle;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScriptGeneration = async () => {
    if (!state.whitepaperContent.trim()) return;
    setState(prev => ({ ...prev, status: 'scripting', errorMessage: undefined }));
    try {
      const script = await generateComicScript(
        state.whitepaperContent, 
        getEffectiveStyle(), 
        state.storyLength
      );
      setState(prev => ({ ...prev, script, status: 'ready_to_illustrate' }));
    } catch (err: any) {
      setState(prev => ({ ...prev, status: 'error', errorMessage: err.message }));
    }
  };

  const handleIllustrate = async () => {
    if (!state.script) return;
    setState(prev => ({ ...prev, status: 'illustrating' }));
    
    const panelsWithPlaceholders = state.script.panels.map(p => ({ ...p, isGenerating: true }));
    setState(prev => ({ ...prev, script: { ...prev.script!, panels: panelsWithPlaceholders } }));

    const BATCH_SIZE = 3;
    const allPanels = state.script.panels;

    for (let i = 0; i < allPanels.length; i += BATCH_SIZE) {
      const currentBatch = allPanels.slice(i, i + BATCH_SIZE);
      await Promise.all(currentBatch.map(async (panel, batchIdx) => {
        const globalIdx = i + batchIdx;
        try {
          const imageUrl = await generatePanelImage(
            panel, 
            getEffectiveStyle(), 
            state.script!.visualContext,
            state.aspectRatio
          );
          setState(prev => {
            if (!prev.script) return prev;
            const updatedPanels = [...prev.script.panels];
            updatedPanels[globalIdx] = { ...updatedPanels[globalIdx], imageUrl, isGenerating: false };
            return { ...prev, script: { ...prev.script, panels: updatedPanels } };
          });
        } catch (err) {
          console.error(`Error generating panel ${globalIdx}:`, err);
          setState(prev => {
            if (!prev.script) return prev;
            const updatedPanels = [...prev.script.panels];
            updatedPanels[globalIdx] = { ...updatedPanels[globalIdx], isGenerating: false };
            return { ...prev, script: { ...prev.script, panels: updatedPanels } };
          });
        }
      }));
    }
    setState(prev => ({ ...prev, status: 'ready_to_illustrate' }));
  };

  const exportOnlyImage = async (id: string, index: number): Promise<void> => {
    const element = panelRefs.current[id];
    if (!element) return;
    try {
      const images = element.getElementsByTagName('img');
      await Promise.all(Array.from(images).map((img: unknown) => {
        const image = img as HTMLImageElement;
        if (image.complete) return Promise.resolve();
        return new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
      }));

      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: null,
        logging: false,
        allowTaint: true
      });
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Panel-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { 
      console.error("Export failed", err); 
    }
  };

  const exportAllPanels = async () => {
    if (!state.script) return;
    const confirmed = window.confirm(`确认导出全部 ${state.script.panels.length} 张图片（包含剧情提示文案）吗？`);
    if (!confirmed) return;

    for (let i = 0; i < state.script.panels.length; i++) {
      const panel = state.script.panels[i];
      if (panel.imageUrl) {
        await exportOnlyImage(panel.id, i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  };

  const reset = () => {
    setState({ 
      whitepaperContent: '', 
      selectedStyle: ComicStyle.FLAT_MINIMAL, 
      customStyleText: '',
      storyLength: 6,
      aspectRatio: '1:1',
      script: null, 
      status: 'idle' 
    });
    panelRefs.current = {};
  };

  const aspectClass = {
    "1:1": "aspect-square",
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]"
  }[state.aspectRatio];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">1. 漫画篇幅与画幅</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[6, 9, 12].map((len) => (
                  <button key={len} onClick={() => setState(prev => ({ ...prev, storyLength: len as StoryLength }))}
                    className={`py-2 px-1 rounded-lg border-2 text-xs font-bold transition-all ${state.storyLength === len ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>
                    {len}图
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {["1:1", "16:9", "9:16"].map((ratio) => (
                  <button key={ratio} onClick={() => setState(prev => ({ ...prev, aspectRatio: ratio as AspectRatio }))}
                    className={`py-2 px-1 rounded-lg border-2 text-[10px] font-bold transition-all ${state.aspectRatio === ratio ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}>
                    {ratio}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">2. 公司 Logo</label>
              <div onClick={() => fileInputRef.current?.click()} className="mb-6 border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50">
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                {state.logoUrl ? <img src={state.logoUrl} className="h-8 mx-auto object-contain" /> : <span className="text-[10px] text-slate-400 font-bold">点击上传 Logo</span>}
              </div>

              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">3. 风格选择</label>
              <select className="w-full bg-slate-100 border-2 border-transparent rounded-lg p-3 text-sm font-bold mb-4"
                value={state.selectedStyle} onChange={(e) => setState(prev => ({ ...prev, selectedStyle: e.target.value as ComicStyle }))}>
                {Object.values(ComicStyle).map(style => <option key={style} value={style}>{STYLE_INFO[style].name}</option>)}
              </select>

              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">4. 白皮书内容</label>
              <textarea className="w-full h-40 bg-slate-100 border-none rounded-lg p-3 text-sm mb-4 resize-none"
                placeholder="粘贴核心白皮书内容..." value={state.whitepaperContent} onChange={(e) => setState(prev => ({ ...prev, whitepaperContent: e.target.value }))} />

              <button onClick={handleScriptGeneration} disabled={state.status !== 'idle' || !state.whitepaperContent}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all disabled:bg-slate-300">
                {state.status === 'scripting' ? '构思剧本中...' : '开始生成剧本'}
              </button>
            </Card>
          </div>

          {/* Main Workspace */}
          <div className="lg:col-span-8 space-y-8">
            {state.script && (
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                  <h3 className="font-black text-slate-800">剧本准备就绪</h3>
                  <p className="text-xs text-slate-400">确认后将生成 {state.storyLength} 张包含分镜对话的漫画</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">重置</button>
                  <button onClick={handleIllustrate} disabled={state.status === 'illustrating'}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                    {state.status === 'illustrating' ? '分批绘图中...' : '立即绘图'}
                  </button>
                </div>
              </div>
            )}

            {state.script && state.script.panels.some(p => p.imageUrl) && (
              <div className="flex justify-center sticky top-20 z-40">
                <button onClick={exportAllPanels} className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">
                  批量导出带字幕画稿
                </button>
              </div>
            )}

            <div className="space-y-12">
              {state.script?.panels.map((panel, idx) => (
                <div key={panel.id} className="max-w-xl mx-auto w-full group">
                  {/* The actual exportable container */}
                  <div ref={el => panelRefs.current[panel.id] = el} className={`relative bg-black shadow-2xl overflow-hidden ${aspectClass}`}>
                    {panel.isGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 animate-pulse">
                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="comic-font text-xl uppercase italic">Rendering {idx + 1}</p>
                      </div>
                    ) : panel.imageUrl ? (
                      <>
                        <img src={panel.imageUrl} className="w-full h-full object-cover" />
                        
                        {/* 1. Plot-relevant Dialogue (Small, Subtitle-like at top) */}
                        <div className="absolute top-4 inset-x-0 flex justify-center px-4 pointer-events-none">
                           <div className="bg-black/40 backdrop-blur-[2px] px-2 py-0.5 rounded border border-white/20">
                             <p className="text-white text-[9px] uppercase font-bold tracking-tight text-center leading-tight">
                               {panel.sceneDialogue}
                             </p>
                           </div>
                        </div>

                        {/* 2. Bold Hook (Larger overlay at bottom) */}
                        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none">
                           <div className="bg-white p-4 shadow-xl transform -rotate-1 origin-bottom-left max-w-[85%] border-2 border-black">
                             <p className="text-black font-black text-sm md:text-base leading-tight uppercase comic-font tracking-wide">
                               {panel.imageDialogue}
                             </p>
                           </div>
                        </div>

                        {/* Logo Overlay */}
                        {state.logoUrl && (
                          <div className="absolute bottom-4 right-4 bg-white/60 backdrop-blur-sm p-1 px-2 rounded-sm pointer-events-none">
                            <img src={state.logoUrl} className="h-5 object-contain" />
                          </div>
                        )}
                        {/* Panel Number */}
                        <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 font-black text-[10px] comic-font italic border-r-2 border-b-2 border-white/20">
                          #{idx + 1}
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-slate-200 flex items-center justify-center italic text-slate-400 text-xs text-center p-4">脚本已就绪，点击上方“立即绘图”按钮生成画面...</div>
                    )}
                  </div>

                  {/* UI Reference Text (Chinese) - Not Exported */}
                  <div className="mt-4 p-4 bg-white/50 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">分镜详情 (仅供参考)</p>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">{panel.caption}</p>
                    {panel.imageUrl && (
                      <button onClick={() => exportOnlyImage(panel.id, idx)} className="mt-3 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        导出该单图
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
