import React, { useEffect } from 'react';
import { useNoteStore } from './store/useNoteStore';
import { StickyNote, Search, Settings, ExternalLink, Trash2, MapPin, X, ChevronLeft, AlertTriangle, Eye, EyeOff, MinusCircle, Play, CheckCircle2, Keyboard, Folder, FolderPlus, History, Layout, HelpCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [isFullPage, setIsFullPage] = React.useState(window.innerWidth > 500);

  useEffect(() => {
    const handleResize = () => setIsFullPage(window.innerWidth > 500);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isFullPage) {
    return <Dashboard />;
  }

  return <PopupView />;
};

const PopupView: React.FC = () => {
  const {
    notes, fetchAllNotes, deleteNote, deleteAllNotes, updateNote,
    searchQuery, setSearchQuery,
    settings, updateSettings, loadSettings,
    projects, currentProjectId, setCurrentProjectId, fetchAllProjects, addProject, deleteProject,
    stats, fetchAllMarkups
  } = useNoteStore();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [viewingHistoryNoteId, setViewingHistoryNoteId] = React.useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    fetchAllProjects();
    fetchAllNotes();
    fetchAllMarkups();
  }, [fetchAllNotes, loadSettings, fetchAllProjects, fetchAllMarkups]);

  useEffect(() => {
    fetchAllNotes();
  }, [searchQuery, fetchAllNotes]);

  const goToNote = (note: any) => {
    const targetUrl = note.url.includes('#') ? note.url : `${note.url}#pagepost-note-${note.id}`;
    chrome.tabs.create({ url: targetUrl });
  };

  return (
    <div className="w-[320px] h-[480px] bg-gray-50 flex flex-col font-sans overflow-hidden"
      style={{ fontFamily: settings.fontFamily }}>
      {/* Header */}
      <div className="p-4 bg-brand-primary flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2">
          {isSettingsOpen || isHelpOpen ? (
            <button onClick={() => { setIsSettingsOpen(false); setIsHelpOpen(false); }} className="p-1 hover:bg-black/5 rounded">
              <ChevronLeft size={20} className="text-gray-900" />
            </button>
          ) : (
            <img src="icon48.png" className="w-5 h-5 rounded shadow-sm" alt="PagePost Logo" />
          )}
          <h1 className="text-lg font-bold text-gray-900">
            {isSettingsOpen ? '설정' : (isHelpOpen ? '도움말' : 'PagePost')}
          </h1>
        </div>
        <div className="flex gap-2 text-gray-700 items-center">
          {!isSettingsOpen && !isHelpOpen && (
            <>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-1 hover:bg-black/5 rounded ${isSearchOpen ? 'bg-black/5' : ''}`}
                title="검색"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => window.open('index.html', '_blank')}
                className="p-1 hover:bg-black/5 rounded"
                title="대시보드"
              >
                <Layout size={18} />
              </button>
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-1 hover:bg-black/5 rounded"
                title="도움말"
              >
                <HelpCircle size={18} />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 hover:bg-black/5 rounded"
                title="설정"
              >
                <Settings size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && !isSettingsOpen && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <div className="flex-1 relative">
            <input
              autoFocus
              type="text"
              placeholder="메모, 태그, 도메인 검색..."
              className="w-full bg-gray-100 border-none rounded-md py-1.5 pl-8 pr-3 text-sm focus:ring-1 focus:ring-brand-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Project Selector Bar */}
      {!isSettingsOpen && !isHelpOpen && !viewingHistoryNoteId && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setCurrentProjectId(null)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${!currentProjectId ? 'bg-brand-primary text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              전체
            </button>
            {stats.totalNotes > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[12px] h-[12px] flex items-center justify-center bg-gray-600 text-white text-[7px] font-black rounded-full shadow-sm border border-white pointer-events-none">
                {stats.totalNotes}
              </span>
            )}
          </div>
          {projects.map(project => (
            <div key={project.id} className="relative group flex-shrink-0">
              <button
                onClick={() => setCurrentProjectId(project.id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ${currentProjectId === project.id ? 'bg-brand-primary text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                <Folder size={10} />
                {project.name}
              </button>
              {stats.projectCounts[project.id] > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1 min-w-[14px] h-[14px] flex items-center justify-center bg-gray-600 text-white text-[7px] font-black rounded-full shadow-sm border border-white pointer-events-none transition-all duration-200 group-hover:scale-0 group-hover:opacity-0 z-20">
                  {stats.projectCounts[project.id]}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?\n(속한 메모들은 삭제되지 않고 유지됩니다.)`)) {
                    deleteProject(project.id);
                  }
                }}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-white border border-gray-100 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 z-10 scale-0 group-hover:scale-100"
                title="프로젝트 삭제"
              >
                <Trash2 size={8} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const name = prompt('새 프로젝트 이름을 입력하세요 (예: 2026 이사 준비):');
              if (name && name.trim()) {
                const newProject = {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
                addProject(newProject);
              }
            }}
            className="flex-shrink-0 p-1 rounded bg-gray-50 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-all ml-1"
            title="새 프로젝트 추가"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      )
      }



      {isHelpOpen ? (
        /* Help Section */
        <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-white animate-in slide-in-from-right duration-300">
          {[
            {
              title: '1. 즉각적인 메모 생성',
              desc: '웹페이지 어디서든 **더블 클릭**하거나 **Alt+N** 단축키를 눌러보세요. 현재 보고 있는 위치에 노란색 점착 메모가 즉시 생성됩니다.',
              img: 'help/step1_note.png'
            },
            {
              title: '2. 시각적인 마크업 도구',
              desc: '하단 툴바의 **펜이나 형광펜** 아이콘을 클릭하여 웹페이지에 직접 그리거나 중요한 텍스트를 강조할 수 있습니다. 다양한 도형도 추가해 보세요.',
              img: 'help/step2_markup.png'
            },
            {
              title: '3. 강력한 스크롤 캡쳐',
              desc: '카메라 아이콘의 **스크롤 캡쳐** 기능을 사용하여 긴 웹페이지 전체를 하나의 이미지로 자동 저장할 수 있습니다. 복잡한 영역 선택도 가능합니다.',
              img: 'help/step3_capture.png'
            },
            {
              title: '4. 한눈에 보는 관리 가이드',
              desc: '우측 **미니맵**의 점들을 클릭하여 메모 위치로 즉시 이동하거나, **대시보드**에서 모든 프로젝트와 메모 히스토리를 체계적으로 관리하세요.',
              img: 'help/step4_nav.png'
            }
          ].map((item, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center bg-brand-primary rounded-full text-[10px] text-gray-900">{idx + 1}</span>
                {item.title}
              </h3>
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                <img src={item.img} alt={item.title} className="w-full object-cover" />
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                {item.desc.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="text-brand-primary">{part}</strong> : part)}
              </p>
            </div>
          ))}
          <div className="pt-4 pb-8 border-t border-gray-100">
            <p className="text-[10px] text-center text-gray-400 italic font-medium">
              PagePost로 당신의 브라우징 경험을 더 효율적으로 만드세요.
            </p>
          </div>
        </div>
      ) : isSettingsOpen ? (
        /* Settings Panel */
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white animate-in fade-in duration-200">


          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
              {settings.showToolbar ? <Eye size={14} /> : <EyeOff size={14} />} 플로팅 툴바 설정
            </h2>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700 uppercase">플로팅 툴바 표시</span>
                <span className="text-[10px] text-gray-400 italic font-medium">웹페이지 하단 툴바 노출 여부</span>
              </div>
              <button
                onClick={() => updateSettings({ showToolbar: !settings.showToolbar })}
                className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out ${settings.showToolbar ? 'bg-brand-primary' : 'bg-gray-300'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${settings.showToolbar ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-700 uppercase">클린 뷰 투명도</span>
                <span className="text-[10px] font-bold text-brand-primary">{Math.round(settings.cleanViewOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={settings.cleanViewOpacity}
                onChange={(e) => updateSettings({ cleanViewOpacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-gray-400">투명</span>
                <span className="text-[8px] text-gray-400">반투명</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-700 uppercase">툴바 자체 투명도</span>
                <span className="text-[10px] font-bold text-brand-primary">{Math.round(settings.toolbarOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={settings.toolbarOpacity}
                onChange={(e) => updateSettings({ toolbarOpacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-gray-400">투명</span>
                <span className="text-[8px] text-gray-400">불투명</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
              <Keyboard size={14} /> 생산성 단축키
            </h2>
            <div className="space-y-2">
              {[
                { key: 'Alt + N', desc: '새 메모 생성' },
                { key: 'Alt + A', desc: '마크업 모드 토글' },
                { key: 'Alt + R', desc: '리뷰 모드 토글' },
                { key: 'Alt + C', desc: '클린 뷰 토글' },
                { key: 'Esc', desc: '선택 해제 / 닫기' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded leading-none">{item.key}</span>
                  <span className="text-[10px] text-gray-500 font-medium">{item.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-red-400 uppercase mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} /> 데이터 관리
            </h2>
            <button
              onClick={deleteAllNotes}
              className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors text-sm font-semibold"
            >
              <Trash2 size={16} /> 모든 메모 삭제하기
            </button>
            <p className="mt-2 text-[10px] text-gray-400 font-sans">
              데이터를 삭제하면 모든 웹페이지의 메모가 영구적으로 지워집니다.
            </p>
          </section>
        </div>
      ) : (
        /* Note List */
        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <StickyNote size={32} strokeWidth={1.5} className="opacity-50" />
              <p className="text-sm">{searchQuery ? '검색 결과가 없습니다.' : '현재 상태에 메모가 없습니다.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:border-brand-primary transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-4 rounded-full"
                        style={{ backgroundColor: note.color }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-brand-primary truncate max-w-[120px]">
                          {note.domain}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(note.updatedAt).toLocaleDateString()} {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {note.isPinned && <MapPin size={10} className="text-red-400" />}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const statusMap: Record<string, any> = {
                            'pending': 'in-progress',
                            'in-progress': 'done',
                            'done': 'pending',
                            'active': 'pending'
                          };
                          updateNote(note.id, { status: statusMap[note.status] || 'pending' });
                        }}
                        className={`p-1 rounded flex items-center gap-1 ${note.status === 'done' ? 'bg-green-500/10 text-green-600' :
                          note.status === 'in-progress' ? 'bg-blue-500/10 text-blue-600' :
                            'hover:bg-gray-100 text-gray-400'
                          }`}
                        title={`상태: ${note.status}`}
                      >
                        {note.status === 'done' ? <CheckCircle2 size={12} /> :
                          note.status === 'in-progress' ? <Play size={12} /> :
                            <MinusCircle size={12} />}
                      </button>
                      {note.history && note.history.length > 0 && (
                        <button
                          onClick={() => setViewingHistoryNoteId(note.id)}
                          className="p-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-600 border border-blue-100 transition-colors"
                          title="수정 히스토리"
                        >
                          <History size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => goToNote(note)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        title="페이지로 이동"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 hover:bg-gray-100 rounded text-red-400"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-3 leading-relaxed"
                    style={{
                      fontFamily: note.fontFamily || settings.fontFamily,
                      fontSize: `${note.fontSize || settings.fontSize}px`,
                      color: note.textColor || settings.textColor
                    }}>
                    {note.content || <span className="text-gray-300 italic">내용 없음</span>}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
      }

      {/* History View Overlay */}
      {
        viewingHistoryNoteId && (
          <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <button onClick={() => setViewingHistoryNoteId(null)} className="p-1 hover:bg-gray-200 rounded">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-bold">수정 히스토리</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {notes.find(n => n.id === viewingHistoryNoteId)?.history?.map((entry, idx) => (
                <div key={idx} className="border-l-2 border-brand-primary pl-3 py-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {idx === 0 ? '이전 버전' : `버전 ${notes.find(n => n.id === viewingHistoryNoteId)!.history!.length - idx}`}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(entry.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 italic">
                    {entry.content}
                  </p>
                </div>
              ))}
              <div className="border-l-2 border-green-500 pl-3 py-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-green-600 uppercase">현재 버전</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(notes.find(n => n.id === viewingHistoryNoteId)!.updatedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-800 leading-relaxed bg-green-50 p-2 rounded border border-green-100">
                  {notes.find(n => n.id === viewingHistoryNoteId)!.content}
                </p>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default App;
