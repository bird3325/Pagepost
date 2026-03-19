import React, { useEffect, useMemo } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { type Project } from '../db';
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
    MinusCircle,
    CheckCircle,
    Folder,
    FolderPlus,
    Layout,
    History,
    Lock,
    Settings,
    Send,
    X,
    Eye,
    EyeOff,
    List,
    Layout as LayoutIcon,
    ChevronDown
} from 'lucide-react';
import { CanvasDashboard } from './CanvasDashboard';

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
        importData,
        projects,
        currentProjectId,
        setCurrentProjectId,
        fetchAllProjects,
        addProject,
        deleteProject,
        updateProject,
        shareSnapshot,
        toggleNoteSharing,
        updateSettings,
        loadSettings,
        dashboardViewMode,
        setDashboardViewMode,
        moveNoteToProject
    } = useNoteStore();

    const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
    const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
    const [expandedHistoryId, setExpandedHistoryId] = React.useState<string | null>(null);
    const [showIntegrations, setShowIntegrations] = React.useState(false);
    const [activeProjectMenuId, setActiveProjectMenuId] = React.useState<string | null>(null);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [visibleFields, setVisibleFields] = React.useState<Record<string, boolean>>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const toggleVisibility = (field: string) => {
        setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        loadSettings();
        fetchAllProjects();
        fetchAllNotes();
        fetchAllMarkups();
    }, [loadSettings, fetchAllProjects, fetchAllNotes, fetchAllMarkups]);

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
        if (currentProjectId) result = result.filter(n => n.projectId === currentProjectId);
        if (selectedDomain) result = result.filter(n => n.domain === selectedDomain);
        if (statusFilter) result = result.filter(n => n.status === statusFilter);
        return result;
    }, [notes, currentProjectId, selectedDomain, statusFilter]);

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
                            onClick={async () => {
                                const link = await shareSnapshot(selectedDomain);
                                await navigator.clipboard.writeText(link);
                                alert(`'${selectedDomain}' 도메인의 인터랙티브 스냅샷 링크가 복사되었습니다!\n함께 작업하는 팀원에게 공유하세요.`);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl shadow-sm text-sm font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all animate-in fade-in duration-500"
                        >
                            <Share2 size={16} /> {selectedDomain} 스냅샷 공유
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
                                    { id: 'pending', label: '보류 중 (Pending)', icon: MinusCircle, color: 'text-amber-500' },
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

                        {/* Project Management Sidebar Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Folder size={16} /> 프로젝트
                                </h3>
                                <button
                                    onClick={() => {
                                        const name = prompt('새 프로젝트 이름을 입력하세요:');
                                        if (name && name.trim()) {
                                            addProject({
                                                id: crypto.randomUUID(),
                                                name: name.trim(),
                                                createdAt: Date.now(),
                                                updatedAt: Date.now()
                                            });
                                        }
                                    }}
                                    className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                                    title="새 프로젝트 추가"
                                >
                                    <FolderPlus size={16} />
                                </button>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setCurrentProjectId(null)}
                                    className={`w-full px-3 py-2 rounded-lg text-left text-sm font-bold flex items-center justify-between transition-colors ${!currentProjectId ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Layout size={16} />
                                        <span>모든 프로젝트</span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!currentProjectId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {stats.totalNotes}
                                    </span>
                                </button>
                                {projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => setCurrentProjectId(project.id)}
                                        className={`w-full px-3 py-2 rounded-lg text-left text-sm font-bold flex items-center justify-between group transition-colors ${currentProjectId === project.id ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <Folder size={16} className={currentProjectId === project.id ? 'text-white' : 'text-slate-400'} />
                                            <span className="truncate">{project.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingProject(project);
                                                }}
                                                className={`p-1 hover:bg-white/20 rounded transition-all ${currentProjectId === project.id ? 'text-white' : 'text-slate-400 hover:text-brand-primary'}`}
                                                title="프로젝트 연동 설정"
                                            >
                                                <Settings size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateProject(project.id, { isPublic: !project.isPublic });
                                                }}
                                                className={`p-1 hover:bg-white/20 rounded transition-all ${project.isPublic ? 'text-emerald-400' : 'text-slate-400'} ${currentProjectId === project.id ? 'opacity-100' : ''}`}
                                                title={project.isPublic ? "공개 프로젝트" : "비공개 프로젝트"}
                                            >
                                                {project.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`'${project.name}' 프로젝트를 삭제하시겠습니까?\n(속한 메모들은 삭제되지 않고 유지됩니다.)`)) {
                                                        deleteProject(project.id);
                                                    }
                                                }}
                                                className={`p-1 hover:bg-red-50 rounded transition-all ${currentProjectId === project.id ? 'bg-white/20 text-white' : 'text-slate-300 hover:text-red-500'}`}
                                                title="프로젝트 삭제"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
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
                            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto font-sans">
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

                        <button
                            onClick={() => setShowIntegrations(true)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-center text-sm font-bold flex items-center justify-center gap-2 text-slate-500 hover:border-brand-primary hover:text-brand-primary transition-all group"
                        >
                            <Settings size={18} className="group-hover:rotate-90 transition-transform text-slate-400 group-hover:text-brand-primary" />
                            <span>공통 계정/API 키 설정</span>
                        </button>
                    </aside>

                    {/* Note Feed */}
                    <main className="lg:col-span-9 space-y-8">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 uppercase tracking-tight">
                                <Calendar size={20} className="text-brand-primary" />
                                {dashboardViewMode === 'canvas' ? 'Infinite Canvas' : 'Recent Activity'}
                            </h2>

                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    onClick={() => setDashboardViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight ${dashboardViewMode === 'list' ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <List size={14} /> 목록 형태
                                </button>
                                <button
                                    onClick={() => setDashboardViewMode('canvas')}
                                    className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight ${dashboardViewMode === 'canvas' ? 'bg-white shadow-sm text-brand-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <LayoutIcon size={14} /> 캔버스 보드
                                </button>
                            </div>
                        </div>

                        {dashboardViewMode === 'canvas' ? (
                            <div className="h-[calc(100vh-280px)] min-h-[500px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
                                <CanvasDashboard />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredNotes.map(note => (
                                    <article key={note.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col group relative">
                                        {/* Note Header */}
                                        <div className="p-5 flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: note.color }} />
                                                <div className="flex flex-col max-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-brand-primary truncate uppercase tracking-wide">{note.domain}</span>
                                                        {note.status && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${note.status === 'done' ? 'bg-emerald-100 text-emerald-600' :
                                                                note.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-amber-100 text-amber-600'
                                                                }`}>
                                                                {note.status === 'done' ? <CheckCircle size={10} /> :
                                                                    note.status === 'in-progress' ? <Play size={10} /> :
                                                                        <MinusCircle size={10} />}
                                                                {note.status}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        {/* Project Selector - Folder Assignment UI */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveProjectMenuId(activeProjectMenuId === note.id ? null : note.id);
                                                                }}
                                                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-[10px] font-bold text-slate-500 group/prj"
                                                            >
                                                                <Folder size={10} className={note.projectId ? "text-brand-primary" : "text-slate-400"} />
                                                                <span className="truncate max-w-[80px]">
                                                                    {projects.find(p => p.id === note.projectId)?.name || '미분류'}
                                                                </span>
                                                                <ChevronDown size={10} className="text-slate-300 group-hover/prj:text-brand-primary" />
                                                            </button>

                                                            {activeProjectMenuId === note.id && (
                                                                <>
                                                                    <div className="fixed inset-0 z-[60]" onClick={() => setActiveProjectMenuId(null)} />
                                                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-[70] py-1 animate-in zoom-in-95 duration-200">
                                                                        <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 font-serif">프로젝트 이동</div>
                                                                        <button
                                                                            onClick={() => {
                                                                                moveNoteToProject(note.id, null);
                                                                                setActiveProjectMenuId(null);
                                                                            }}
                                                                            className={`w-full px-3 py-2 text-left text-[11px] hover:bg-slate-50 flex items-center gap-2 ${!note.projectId ? 'text-brand-primary font-bold' : 'text-slate-600'}`}
                                                                        >
                                                                            <div className="w-2 h-2 rounded-full bg-slate-200" /> 미분류 (기본)
                                                                        </button>
                                                                        {projects.map(project => (
                                                                            <button
                                                                                key={project.id}
                                                                                onClick={() => {
                                                                                    moveNoteToProject(note.id, project.id);
                                                                                    setActiveProjectMenuId(null);
                                                                                }}
                                                                                className={`w-full px-3 py-2 text-left text-[11px] hover:bg-slate-50 flex items-center gap-2 ${note.projectId === project.id ? 'text-brand-primary font-bold' : 'text-slate-600'}`}
                                                                            >
                                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#CBD5E1' }} />
                                                                                {project.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {note.assignee && (
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100/50 text-slate-400">
                                                                    <User size={10} />
                                                                    <span className="text-[9px] font-bold uppercase">{note.assignee}</span>
                                                                </div>
                                                            )}
                                                            <time className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                                {new Date(note.updatedAt).toLocaleDateString()}
                                                            </time>
                                                            {note.integrations?.syncedAt && (
                                                                <div className="flex items-center gap-1 px-1 py-0.5 bg-slate-50 rounded border border-slate-100/50 scale-90">
                                                                    {note.integrations.notionId && <div className="w-1.5 h-1.5 rounded-full bg-slate-800" title="Synced to Notion" />}
                                                                    {note.integrations.slackTs && <div className="w-1.5 h-1.5 rounded-full bg-[#4A154B]" title="Synced to Slack" />}
                                                                    {note.integrations.trelloId && <div className="w-1.5 h-1.5 rounded-full bg-[#0079BF]" title="Synced to Trello" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleNoteSharing(note.id)}
                                                    className={`p-2 rounded-xl transition-colors ${note.isShared ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'}`}
                                                    title={note.isShared ? "공개됨 (클릭하여 비공개)" : "나만 보기 (클릭하여 공유)"}
                                                >
                                                    {note.isShared ? <Globe size={18} /> : <Lock size={18} />}
                                                </button>
                                                {note.history && note.history.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedHistoryId(expandedHistoryId === note.id ? null : note.id)}
                                                        className={`p-2 rounded-xl transition-colors ${expandedHistoryId === note.id ? 'bg-brand-primary text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-brand-primary'}`}
                                                        title="수정 히스토리"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => goToNote(note)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-brand-primary transition-colors">
                                                    <ExternalLink size={18} />
                                                </button>
                                                <button onClick={() => deleteNote(note.id)} className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Note Content */}
                                        <div className="px-5 pb-5 flex-1">
                                            <p className="text-slate-700 leading-relaxed text-sm lg:text-base line-clamp-6 whitespace-pre-wrap italic font-serif"
                                                style={{
                                                    fontFamily: note.fontFamily || settings.fontFamily,
                                                    fontSize: `${(note.fontSize || settings.fontSize) + 2}px`,
                                                    color: note.textColor || settings.textColor
                                                }}>
                                                {note.content || "작성된 내용이 없습니다."}
                                            </p>
                                        </div>

                                        {/* History Timeline */}
                                        {expandedHistoryId === note.id && note.history && (
                                            <div className="px-5 pb-5 animate-in slide-in-from-top duration-300">
                                                <div className="pt-4 border-t border-slate-100 space-y-4">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Revision Timeline</h4>
                                                    {note.history.map((entry, idx) => (
                                                        <div key={idx} className="relative pl-5 border-l border-slate-200 pb-2 last:pb-0">
                                                            <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 border border-white" />
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {idx === 0 ? '이전 버전' : `V${note.history!.length - idx}`}
                                                                </span>
                                                                <span className="text-[9px] text-slate-400">
                                                                    {new Date(entry.updatedAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl italic">
                                                                {entry.content}
                                                            </p>
                                                        </div>
                                                    ))}
                                                    <div className="relative pl-5 border-l border-brand-primary pb-2">
                                                        <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-brand-primary border border-white" />
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[9px] font-bold text-brand-primary">현재 버전</span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {new Date(note.updatedAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-brand-primary/5 p-2.5 rounded-xl border border-brand-primary/10">
                                                            {note.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

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
                        )}
                    </main>
                </div>
            </div>

            {/* Integrations Settings Modal */}
            {showIntegrations && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Send className="text-brand-primary" size={24} />
                                공통 계정 설정 (Global Keys)
                            </h2>
                            <button onClick={() => setShowIntegrations(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </header>
                        <div className="p-6 overflow-y-auto space-y-8 max-h-[70vh]">
                            {/* Notion */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-xs tracking-widest">
                                    <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px]">N</div>
                                    Notion Integration
                                </div>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type={visibleFields['notionToken'] ? "text" : "password"}
                                            placeholder="Notion Internal Integration Token"
                                            value={settings.apiKeys?.notionToken || ''}
                                            onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, notionToken: e.target.value } })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none pr-10"
                                        />
                                        <button
                                            onClick={() => toggleVisibility('notionToken')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors"
                                        >
                                            {visibleFields['notionToken'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">토큰은 모든 프로젝트에서 공통으로 사용됩니다. 데이터베이스 ID는 각 프로젝트 설정에서 관리하세요.</p>
                                </div>
                            </section>

                            {/* Slack */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-[#4A154B] font-black uppercase text-xs tracking-widest">
                                    <div className="w-6 h-6 bg-[#4A154B] rounded flex items-center justify-center text-white text-[10px]">#</div>
                                    Slack Integration
                                </div>
                                <div className="relative">
                                    <input
                                        type={visibleFields['slackWebhookUrl'] ? "text" : "password"}
                                        placeholder="Incoming Webhook URL"
                                        value={settings.apiKeys?.slackWebhookUrl || ''}
                                        onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, slackWebhookUrl: e.target.value } })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none pr-10"
                                    />
                                    <button
                                        onClick={() => toggleVisibility('slackWebhookUrl')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors"
                                    >
                                        {visibleFields['slackWebhookUrl'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </section>

                            {/* Trello */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-[#0079BF] font-black uppercase text-xs tracking-widest">
                                    <div className="w-6 h-6 bg-[#0079BF] rounded flex items-center justify-center text-white text-[10px]">T</div>
                                    Trello Integration
                                </div>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input
                                            type={visibleFields['trelloKey'] ? "text" : "password"}
                                            placeholder="API Key"
                                            value={settings.apiKeys?.trelloKey || ''}
                                            onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, trelloKey: e.target.value } })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none pr-10"
                                        />
                                        <button
                                            onClick={() => toggleVisibility('trelloKey')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors"
                                        >
                                            {visibleFields['trelloKey'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={visibleFields['trelloToken'] ? "text" : "password"}
                                            placeholder="OAuth Token"
                                            value={settings.apiKeys?.trelloToken || ''}
                                            onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, trelloToken: e.target.value } })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none pr-10"
                                        />
                                        <button
                                            onClick={() => toggleVisibility('trelloToken')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-primary transition-colors"
                                        >
                                            {visibleFields['trelloToken'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">키와 토큰은 전역 설정입니다. 특정 보드의 리스트 ID는 프로젝트 설정에서 관리하세요.</p>
                                </div>
                            </section>
                        </div>
                        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setShowIntegrations(false)}
                                className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
                            >
                                설정 저장 및 닫기
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Project Integration Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Folder className="text-brand-primary" size={24} />
                                [{editingProject.name}] 동기화 설정
                            </h2>
                            <button onClick={() => setEditingProject(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </header>
                        <div className="p-6 overflow-y-auto space-y-8 max-h-[70vh]">
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                이 프로젝트에 속한 메모들이 각각 어떤 서비스의 목적지로 동기화될지 설정합니다. 인증 정보는 '공통 설정'을 따릅니다.
                            </p>

                            <section className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center text-white text-[8px]">N</div>
                                    Notion Database ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Notion Database ID for this project"
                                    value={editingProject.integrations?.notionDatabaseId || ''}
                                    onChange={(e) => setEditingProject({ ...editingProject, integrations: { ...editingProject.integrations, notionDatabaseId: e.target.value } })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                                />
                            </section>

                            <section className="space-y-4">
                                <label className="text-xs font-black text-[#0079BF] uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 bg-[#0079BF] rounded flex items-center justify-center text-white text-[8px]">T</div>
                                    Trello List ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Trello List ID for this project"
                                    value={editingProject.integrations?.trelloListId || ''}
                                    onChange={(e) => setEditingProject({ ...editingProject, integrations: { ...editingProject.integrations, trelloListId: e.target.value } })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                                />
                            </section>

                            <section className="space-y-4 opacity-50">
                                <label className="text-xs font-black text-[#4A154B] uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-5 h-5 bg-[#4A154B] rounded flex items-center justify-center text-white text-[8px]">#</div>
                                    Slack Integration (Planned)
                                </label>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
                                    슬랙 채널별 분기는 다음 업데이트에 포함될 예정입니다.
                                </div>
                            </section>
                        </div>
                        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingProject(null)}
                                className="px-5 py-2.5 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    if (editingProject) {
                                        updateProject(editingProject.id, { integrations: editingProject.integrations });
                                        setEditingProject(null);
                                    }
                                }}
                                className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
                            >
                                변경사항 저장
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
