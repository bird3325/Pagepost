import React, { useEffect } from 'react';
import { useNoteStore } from './store/useNoteStore';
import { StickyNote, Search, Settings, ExternalLink, Trash2, MapPin, X, ChevronLeft, AlertTriangle, Eye, EyeOff, Clock, Play, CheckCircle2 } from 'lucide-react';
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
    settings, updateSettings, loadSettings
  } = useNoteStore();

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  useEffect(() => {
    loadSettings();
    fetchAllNotes();
  }, [fetchAllNotes, loadSettings]);

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
          {isSettingsOpen ? (
            <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-black/5 rounded">
              <ChevronLeft size={20} className="text-gray-900" />
            </button>
          ) : (
            <StickyNote className="text-gray-900" size={20} />
          )}
          <h1 className="text-lg font-bold text-gray-900">
            {isSettingsOpen ? '설정' : 'PagePost'}
          </h1>
        </div>
        <div className="flex gap-2 text-gray-700 items-center">
          {!isSettingsOpen && (
            <>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`p-1 hover:bg-black/5 rounded ${isSearchOpen ? 'bg-black/5' : ''}`}
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 hover:bg-black/5 rounded"
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

      {/* Current Page Summary */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">전체 메모 리스트</span>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded-full font-bold">
            {notes.length}
          </span>
        </div>
        <div className="text-[11px] text-gray-400 truncate max-w-full italic">
          작성된 모든 메모가 표시됩니다.
        </div>
      </div>


      {isSettingsOpen ? (
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
                            <Clock size={12} />}
                      </button>
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
      )}

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-white flex justify-center">
        <button
          onClick={() => window.open('index.html', '_blank')}
          className="text-xs text-gray-500 hover:text-brand-accent transition-colors"
        >
          대시보드 전체보기
        </button>
      </div>
    </div>
  );
};

export default App;
