import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TUTORIAL_MODULES, TutorialLesson, TutorialModule } from '../data/tutorialVideos';
import {
  Play,
  PlayCircle,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Clock,
  GraduationCap
} from 'lucide-react';

// Watched lessons are a per-device convenience (like Kiwify's "concluída"
// tick) — kept in localStorage, never required for anything to work.
const PROGRESS_KEY = 'zushy-tutorial-progress';

const loadProgress = (): string[] => {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveProgress = (ids: string[]) => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids));
  } catch {
    // storage blocked — progress just won't persist
  }
};

const youtubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
};

const lessonThumb = (lesson: TutorialLesson): string | undefined => {
  if (lesson.thumbnail) return lesson.thumbnail;
  const yt = youtubeId(lesson.videoUrl);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : undefined;
};

const allLessons = TUTORIAL_MODULES.flatMap(m => m.lessons.map(l => ({ lesson: l, module: m })));

export default function TutorialVideos() {
  const [watched, setWatched] = useState<string[]>(loadProgress);
  const [current, setCurrent] = useState<{ moduleId: string; lessonId: string } | null>(null);

  useEffect(() => saveProgress(watched), [watched]);

  const totalLessons = allLessons.length;
  const totalWatched = allLessons.filter(x => watched.includes(x.lesson.id)).length;
  const overallPercent = totalLessons ? Math.round((totalWatched / totalLessons) * 100) : 0;

  const moduleProgress = (m: TutorialModule) => {
    const done = m.lessons.filter(l => watched.includes(l.id)).length;
    return { done, percent: m.lessons.length ? Math.round((done / m.lessons.length) * 100) : 0 };
  };

  // First lesson not yet watched — what "Continuar assistindo" opens.
  const nextUp = allLessons.find(x => !watched.includes(x.lesson.id)) ?? allLessons[0];

  const openModule = (m: TutorialModule) => {
    const firstPending = m.lessons.find(l => !watched.includes(l.id)) ?? m.lessons[0];
    if (firstPending) setCurrent({ moduleId: m.id, lessonId: firstPending.id });
  };

  const toggleWatched = (lessonId: string) => {
    setWatched(prev => (prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]));
  };

  if (current) {
    return (
      <LessonPlayer
        moduleId={current.moduleId}
        lessonId={current.lessonId}
        watched={watched}
        onSelect={(moduleId, lessonId) => setCurrent({ moduleId, lessonId })}
        onToggleWatched={toggleWatched}
        onMarkWatched={(id) => setWatched(prev => (prev.includes(id) ? prev : [...prev, id]))}
        onBack={() => setCurrent(null)}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0C0A08] font-sans text-slate-100" id="sushi-tutorial-videos">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#2A211A]">
        {lessonThumb(nextUp.lesson) && (
          <img
            src={lessonThumb(nextUp.lesson)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105 blur-[2px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0A08] via-[#0C0A08]/85 to-[#0C0A08]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A08] via-transparent to-transparent" />

        <div className="relative px-4 sm:px-8 md:px-10 py-10 sm:py-14 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-[#FB923C]" />
            <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Área de Membros</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#F5F0EA] tracking-tight leading-tight">
            Vídeos Tutoriais
          </h2>
          <p className="text-sm text-[#A8A29A] mt-2 max-w-xl">
            Aprenda a usar cada recurso do Zushy e transforme seu delivery em uma máquina de vendas.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={() => setCurrent({ moduleId: nextUp.module.id, lessonId: nextUp.lesson.id })}
              className="flex items-center justify-center gap-2 px-6 py-3 btn-sushi-primary text-white text-sm font-bold shadow-lg shadow-orange-950/40 cursor-pointer self-start"
            >
              <Play className="w-4 h-4 fill-white" />
              {totalWatched === 0 ? 'Começar agora' : 'Continuar assistindo'}
            </button>
            <div className="text-xs text-[#A8A29A]">
              <p className="text-[#F5F0EA] font-semibold truncate max-w-xs">{nextUp.lesson.title}</p>
              <p>{nextUp.module.title}</p>
            </div>
          </div>

          <div className="mt-6 max-w-sm">
            <div className="flex justify-between text-[11px] text-[#A8A29A] mb-1.5">
              <span>Seu progresso</span>
              <span className="font-mono font-bold text-[#FB923C]">{totalWatched}/{totalLessons} aulas · {overallPercent}%</span>
            </div>
            <div className="h-1.5 bg-[#2A211A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#C2410C] to-[#F97316] rounded-full transition-all" style={{ width: `${overallPercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Módulos — vitrine em capas verticais */}
      <section className="px-4 sm:px-8 md:px-10 pt-8">
        <h3 className="text-lg font-display font-extrabold text-[#F5F0EA] mb-4">Módulos</h3>
        <ModuleRow>
          {TUTORIAL_MODULES.map((m, index) => {
            const { done, percent } = moduleProgress(m);
            return (
              <button
                key={m.id}
                onClick={() => openModule(m)}
                className="group relative shrink-0 w-[160px] sm:w-[190px] aspect-[2/3] rounded-2xl overflow-hidden border border-[#2A211A] hover:border-[#F97316] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/50 cursor-pointer text-left snap-start"
                style={{ background: `linear-gradient(160deg, ${m.coverFrom}, ${m.coverTo})` }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
                <span className="absolute top-3 left-3 text-[10px] font-mono font-bold uppercase tracking-widest text-white/80 bg-black/25 px-2 py-0.5 rounded-full">
                  Módulo {index + 1}
                </span>
                <span className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
                  {m.emoji}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-12">
                  <h4 className="font-display font-extrabold text-white text-sm leading-tight">{m.title}</h4>
                  <p className="text-[10px] text-white/70 mt-0.5 line-clamp-2">{m.subtitle}</p>
                  <div className="flex items-center justify-between text-[10px] text-white/80 mt-2 font-mono">
                    <span>{m.lessons.length} aulas</span>
                    <span>{done}/{m.lessons.length}</span>
                  </div>
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-white rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-[#C2410C] fill-[#C2410C] ml-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </ModuleRow>
      </section>

      {/* Uma fileira de aulas por módulo */}
      <div className="px-4 sm:px-8 md:px-10 pb-12 space-y-8 mt-6">
        {TUTORIAL_MODULES.map((m, index) => (
          <section key={m.id}>
            <div className="flex items-baseline gap-2 mb-3">
              <h3 className="text-base font-display font-extrabold text-[#F5F0EA]">{m.title}</h3>
              <span className="text-[10px] font-mono text-[#A8A29A] uppercase tracking-wider">Módulo {index + 1} · {m.lessons.length} aulas</span>
            </div>
            <ModuleRow>
              {m.lessons.map((lesson, i) => {
                const isDone = watched.includes(lesson.id);
                const thumb = lessonThumb(lesson);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrent({ moduleId: m.id, lessonId: lesson.id })}
                    className="group shrink-0 w-[240px] sm:w-[280px] text-left cursor-pointer snap-start"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-[#2A211A] group-hover:border-[#F97316] transition-colors bg-[#181512]">
                      {thumb ? (
                        <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${m.coverFrom}, ${m.coverTo})` }} />
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                      </span>
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold bg-black/75 text-white px-1.5 py-0.5 rounded">
                        {lesson.duration}
                      </span>
                      {isDone && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold bg-[#16A34A] text-white px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Assistida
                        </span>
                      )}
                      {isDone && <div className="absolute bottom-0 inset-x-0 h-1 bg-[#F97316]" />}
                    </div>
                    <p className="text-[10px] font-mono text-[#FB923C] mt-2 font-bold">AULA {i + 1}</p>
                    <h4 className="text-xs font-bold text-[#F5F0EA] leading-snug line-clamp-2 group-hover:text-[#FB923C] transition-colors">{lesson.title}</h4>
                  </button>
                );
              })}
            </ModuleRow>
          </section>
        ))}
      </div>
    </div>
  );
}

// Horizontal carousel with arrow buttons on desktop and swipe on mobile.
function ModuleRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <div className="relative group/row">
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute -left-4 top-1/3 z-10 w-9 h-9 rounded-full bg-[#141210]/95 border border-[#2A211A] items-center justify-center text-[#F5F0EA] opacity-0 group-hover/row:opacity-100 transition-opacity hover:border-[#F97316] cursor-pointer"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute -right-4 top-1/3 z-10 w-9 h-9 rounded-full bg-[#141210]/95 border border-[#2A211A] items-center justify-center text-[#F5F0EA] opacity-0 group-hover/row:opacity-100 transition-opacity hover:border-[#F97316] cursor-pointer"
        aria-label="Próximo"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

interface LessonPlayerProps {
  moduleId: string;
  lessonId: string;
  watched: string[];
  onSelect: (moduleId: string, lessonId: string) => void;
  onToggleWatched: (lessonId: string) => void;
  onMarkWatched: (lessonId: string) => void;
  onBack: () => void;
}

function LessonPlayer({ moduleId, lessonId, watched, onSelect, onToggleWatched, onMarkWatched, onBack }: LessonPlayerProps) {
  const index = allLessons.findIndex(x => x.lesson.id === lessonId && x.module.id === moduleId);
  const { lesson, module } = allLessons[Math.max(0, index)];
  const prev = index > 0 ? allLessons[index - 1] : null;
  const next = index < allLessons.length - 1 ? allLessons[index + 1] : null;
  const isDone = watched.includes(lesson.id);
  const yt = youtubeId(lesson.videoUrl);
  const moduleNumber = TUTORIAL_MODULES.findIndex(m => m.id === module.id) + 1;
  const [openModules, setOpenModules] = useState<string[]>([module.id]);

  useEffect(() => {
    setOpenModules(prevOpen => (prevOpen.includes(module.id) ? prevOpen : [...prevOpen, module.id]));
  }, [module.id]);

  const lessonNumberInModule = useMemo(() => module.lessons.findIndex(l => l.id === lesson.id) + 1, [module, lesson]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0C0A08] font-sans text-slate-100">
      <div className="px-4 sm:px-6 md:px-8 py-4 border-b border-[#2A211A] flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#A8A29A] hover:text-[#FB923C] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos módulos
        </button>
        <span className="text-[#2A211A]">|</span>
        <span className="text-[11px] text-[#A8A29A] truncate">Módulo {moduleNumber} · {module.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 md:p-8">
        {/* Player + detalhes */}
        <div className="flex-1 min-w-0">
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#2A211A] shadow-2xl shadow-black/50">
            {yt ? (
              <iframe
                key={lesson.id}
                src={`https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`}
                title={lesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                key={lesson.id}
                src={lesson.videoUrl}
                poster={lessonThumb(lesson)}
                controls
                playsInline
                className="w-full h-full"
                onEnded={() => onMarkWatched(lesson.id)}
              />
            )}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">
                Módulo {moduleNumber} · Aula {lessonNumberInModule}
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">{lesson.title}</h2>
              <p className="flex items-center gap-1 text-[11px] text-[#A8A29A] mt-1 font-mono">
                <Clock className="w-3 h-3" /> {lesson.duration}
              </p>
            </div>
            <button
              onClick={() => onToggleWatched(lesson.id)}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                isDone
                  ? 'bg-[#16A34A]/15 border-[#16A34A]/50 text-[#4ADE80]'
                  : 'bg-[#141210] border-[#2A211A] text-slate-200 hover:border-[#F97316] hover:text-[#FB923C]'
              }`}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {isDone ? 'Aula concluída' : 'Marcar como concluída'}
            </button>
          </div>

          <p className="text-sm text-[#A8A29A] mt-4 leading-relaxed bg-[#141210] border border-[#2A211A] rounded-xl p-4">
            {lesson.description}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              disabled={!prev}
              onClick={() => prev && onSelect(prev.module.id, prev.lesson.id)}
              className="flex items-center gap-2 p-3 rounded-xl bg-[#141210] border border-[#2A211A] hover:border-[#F97316] transition-colors text-left cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-w-0"
            >
              <ChevronLeft className="w-5 h-5 text-[#FB923C] shrink-0" />
              <span className="min-w-0">
                <span className="block text-[10px] text-[#A8A29A] uppercase font-mono">Anterior</span>
                <span className="block text-xs font-bold text-[#F5F0EA] truncate">{prev?.lesson.title ?? '—'}</span>
              </span>
            </button>
            <button
              disabled={!next}
              onClick={() => {
                if (!next) return;
                onMarkWatched(lesson.id);
                onSelect(next.module.id, next.lesson.id);
              }}
              className="flex items-center justify-end gap-2 p-3 rounded-xl btn-sushi-primary text-white text-right cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-w-0"
            >
              <span className="min-w-0">
                <span className="block text-[10px] text-orange-100 uppercase font-mono">Próxima aula</span>
                <span className="block text-xs font-bold truncate">{next?.lesson.title ?? 'Você chegou ao fim!'}</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Lista de módulos e aulas */}
        <aside className="lg:w-[340px] shrink-0">
          <div className="bg-[#141210] border border-[#2A211A] rounded-2xl overflow-hidden lg:sticky lg:top-4">
            <div className="p-4 border-b border-[#2A211A]">
              <h3 className="text-sm font-display font-extrabold text-[#F5F0EA]">Conteúdo do curso</h3>
              <p className="text-[11px] text-[#A8A29A] mt-0.5">
                {watched.filter(id => allLessons.some(x => x.lesson.id === id)).length} de {allLessons.length} aulas concluídas
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#2A211A]">
              {TUTORIAL_MODULES.map((m, mi) => {
                const isOpen = openModules.includes(m.id);
                const done = m.lessons.filter(l => watched.includes(l.id)).length;
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => setOpenModules(prevOpen => (isOpen ? prevOpen.filter(id => id !== m.id) : [...prevOpen, m.id]))}
                      className="w-full flex items-center gap-3 p-3.5 hover:bg-[#181512] transition-colors cursor-pointer text-left"
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ background: `linear-gradient(160deg, ${m.coverFrom}, ${m.coverTo})` }}
                      >
                        {m.emoji}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[10px] font-mono text-[#A8A29A] uppercase">Módulo {mi + 1}</span>
                        <span className="block text-xs font-bold text-[#F5F0EA] truncate">{m.title}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#A8A29A]">{done}/{m.lessons.length}</span>
                      <ChevronDown className={`w-4 h-4 text-[#A8A29A] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="pb-2">
                        {m.lessons.map((l, li) => {
                          const active = l.id === lesson.id && m.id === module.id;
                          const lDone = watched.includes(l.id);
                          return (
                            <button
                              key={l.id}
                              onClick={() => onSelect(m.id, l.id)}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer border-l-4 ${
                                active ? 'bg-[#1F1209] border-[#F97316]' : 'border-transparent hover:bg-[#181512]'
                              }`}
                            >
                              {lDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                              ) : active ? (
                                <PlayCircle className="w-4 h-4 text-[#F97316] shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#4A3F36] shrink-0" />
                              )}
                              <span className="flex-1 min-w-0">
                                <span className={`block text-xs truncate ${active ? 'font-bold text-[#FB923C]' : 'text-slate-200'}`}>
                                  {li + 1}. {l.title}
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-[#A8A29A] shrink-0">{l.duration}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
