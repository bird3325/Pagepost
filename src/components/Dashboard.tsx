import React, { useEffect, useMemo } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import {
    Search,
    ExternalLink,
    Trash2,
    Filter,
    Calendar,
    Globe,
    Tag,
    StickyNote,
    PenTool,
    BarChart3,
    ChevronRight,
    Download,
    Upload,
    Share2,
    User,
    Play,
    Clock,
    CheckCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
    const {
        notes,
        fetchAllNotes,
        fetchAllMarkups,
        deleteNote,
        searchQuery,
        setSearchQuery,
        stats,
        settings,
        exportData,
        importData
    } = useNoteStore();

    const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAllNotes();
        fetchAllMarkups();
    }, [fetchAllNotes, fetchAllMarkups]);

    // Group notes by domain
    const notesByDomain = useMemo(() => {
        const groups: Record<string, typeof notes> = {};
        notes.forEach(note => {
            if (!groups[note.domain]) groups[note.domain] = [];
            groups[note.domain].push(note);
        });
        return groups;
    }, [notes]);

    const filteredNotes = useMemo(() => {
        let result = notes;
        if (selectedDomain) result = result.filter(n => n.domain === selectedDomain);
        if (statusFilter) result = result.filter(n => n.status === statusFilter);
        return result;
    }, [notes, selectedDomain, statusFilter]);

    const sortedDomains = useMemo(() => {
        return Object.keys(notesByDomain).sort((a, b) =>
            notesByDomain[b].length - notesByDomain[a].length
        );
    }, [notesByDomain]);

    const goToNote = (note: any) => {
        const targetUrl = note.url.includes('#') ? note.url : `${note.url}#pagepost-note-${note.id}`;
        chrome.tabs.create({ url: targetUrl });
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 lg:p-10" style={{ fontFamily: settings.fontFamily }}>
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <StickyNote className="text-brand-primary" size={32} />
                            PagePost Review Dashboard
                        </h1>
                        <p className="mt-2 text-slate-500 font-medium">모든 웹사이트의 주석과 조각들을 한눈에 관리하세요.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-primary" size={18} />
                            <input
                                type="text"
                                placeholder="검색 (메모, 도메인, 태그)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </header>

                {/* Collaboration & Sharing Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button
                        onClick={() => exportData()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-all"
                    >
                        <Download size={16} /> 전체 내보내기
                    </button>
                    {selectedDomain && (
                        <button
                            onClick={() => exportData(selectedDomain)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl shadow-sm text-sm font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
                        >
                            <Share2 size={16} /> {selectedDomain} 공유
                        </button>
                    )}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-all"
                    >
                        <Upload size={16} /> 데이터 가져오기
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    const content = event.target?.result as string;
                                    importData(content);
                                };
                                reader.readAsText(file);
                            }
                        }}
                    />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: '전체 메모', value: stats.totalNotes, icon: StickyNote, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: '마크업 요소', value: stats.totalMarkups, icon: PenTool, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: '작업 사이트', value: stats.domainCount, icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                        { label: '활성 태그', value: notes.reduce((acc, n) => acc + n.tags.length, 0), icon: Tag, color: 'text-amber-500', bg: 'bg-amber-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Sidebar / Domains */}
                    <aside className="lg:col-span-3 space-y-6">
                        {/* Status Filter */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <BarChart3 size={16} /> 진행 상태
                                </h3>
                            </div>
                            <div className="p-2 space-y-1">
                                {[
                                    { id: null, label: '전체 보기', icon: Globe, color: 'text-slate-400' },
                                    { id: 'pending', label: '보류 중 (Pending)', icon: Clock, color: 'text-amber-500' },
                                    { id: 'in-progress', label: '진행 중 (In Progress)', icon: Play, color: 'text-blue-500' },
                                    { id: 'done', label: '완료됨 (Done)', icon: CheckCircle, color: 'text-emerald-500' },
                                ].map(status => (
                                    <button
                                        key={status.id || 'all'}
                                        onClick={() => setStatusFilter(status.id)}
                                        className={`w-full px-3 py-2 rounded-lg text-left text-sm font-bold flex items-center gap-3 transition-colors ${statusFilter === status.id ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <status.icon size={16} className={statusFilter === status.id ? 'text-white' : status.color} />
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Filter size={16} /> 사이트 리스트
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto font-sans">
                                <button
                                    onClick={() => setSelectedDomain(null)}
                                    className={`w-full px-4 py-3.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group ${!selectedDomain ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : ''}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${!selectedDomain ? 'text-brand-primary' : 'text-slate-700'}`}>모든 사이트</span>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">전체 {notes.length}개의 주석</span>
                                    </div>
                                    {!selectedDomain && <ChevronRight size={14} className="text-brand-primary" />}
                                </button>
                                {sortedDomains.map(domain => (
                                    <button
                                        key={domain}
                                        onClick={() => setSelectedDomain(domain)}
                                        className={`w-full px-4 py-3.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group ${selectedDomain === domain ? 'bg-brand-primary/5 border-l-4 border-brand-primary' : ''}`}
                                    >
                                        <div className="flex flex-col truncate pr-2">
                                            <span className={`text-sm font-bold truncate group-hover:text-brand-primary ${selectedDomain === domain ? 'text-brand-primary' : 'text-slate-700'}`}>{domain}</span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{notesByDomain[domain].length}개의 주석</span>
                                        </div>
                                        {selectedDomain === domain && <ChevronRight size={14} className="text-brand-primary" />}
                                    </button>
                                ))}
                                {sortedDomains.length === 0 && (
                                    <div className="p-10 text-center text-slate-400 text-sm italic font-medium">데이터가 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Note Feed */}
                    <main className="lg:col-span-9 space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                                <Calendar size={20} className="text-brand-primary" />
                                Recent Activity
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredNotes.map(note => (
                                <article key={note.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all flex flex-col group">
                                    {/* Note Header */}
                                    <div className="p-5 flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: note.color }} />
                                            <div className="flex flex-col max-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-brand-primary truncate uppercase tracking-wide">{note.domain}</span>
                                                    {note.status && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${note.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                                                                note.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-amber-100 text-amber-600'
                                                            }`}>
                                                            {note.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <time className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {new Date(note.updatedAt).toLocaleDateString()} · {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </time>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => goToNote(note)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-brand-primary transition-colors">
                                                <ExternalLink size={18} />
                                            </button>
                                            <button onClick={() => deleteNote(note.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Assignee display */}
                                    {note.assignee && (
                                        <div className="px-5 py-2 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                                            <User size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">담당자: {note.assignee}</span>
                                        </div>
                                    )}

                                    {/* Note Content */}
                                    <div className="px-5 pb-5 flex-1">
                                        <p className="text-slate-700 leading-relaxed text-sm lg:text-base line-clamp-6 whitespace-pre-wrap italic font-serif"
                                            style={{
                                                fontFamily: note.fontFamily || settings.fontFamily,
                                                fontSize: `${(note.fontSize || settings.fontSize) + 2}px`,
                                                color: note.textColor || settings.textColor
                                            }}>
                                            {note.content || "박성된 내용이 없습니다."}
                                        </p>
                                    </div>

                                    {/* Note Footer */}
                                    {note.tags.length > 0 && (
                                        <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/30 flex flex-wrap gap-2">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="text-[11px] font-bold px-2.5 py-1 bg-white text-slate-500 rounded-lg border border-slate-100 shadow-sm flex items-center gap-1.5 transition-colors hover:border-brand-primary/20 hover:text-brand-primary">
                                                    <Tag size={10} /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}

                            {notes.length === 0 && (
                                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <BarChart3 size={48} strokeWidth={1} />
                                    <p className="font-bold uppercase tracking-widest text-sm">No annotations found</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
