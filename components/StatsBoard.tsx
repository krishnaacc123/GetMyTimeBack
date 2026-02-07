import React, { useMemo, useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDayKey, getWeekKey, getMonthKey, getYearKey, formatDuration, formatAbsoluteTime, formatDateRetro } from '../utils/time';
import RetroButton from './RetroButton';
import ConfirmationModal from './ConfirmationModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogs } from '../contexts/LogsContext';
import { StudyLog } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface StatsBoardProps {
  onClose: () => void;
}

type TimeRange = 'TODAY' | 'YESTERDAY' | 'LAST_3_DAYS' | 'LAST_7_DAYS' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL';

// --- LogCard Component ---
interface LogCardProps {
    log: StudyLog;
    deleteLog: (id: string) => void;
    idx: number;
}

const LogCard: React.FC<LogCardProps> = ({ log, deleteLog, idx }) => {
    const { t } = useLanguage();
    const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60);
    const endTime = log.startTime + (duration * 1000);
    const rotation = idx % 2 === 0 ? 'rotate-1' : '-rotate-1';
    const colorClass = log.type === 'STUDY' ? 'bg-retro-yellow text-black' : 'bg-retro-green text-black';

    return (
        <div 
           className={`relative group ${colorClass} border-2 border-black p-2 shadow-sm ${rotation} hover:rotate-0 hover:scale-105 transition-all duration-300 min-h-[100px] flex flex-col justify-center items-center text-center cursor-default`}
        >
           <button
               onClick={(e) => {
                   e.stopPropagation();
                   deleteLog(log.id);
               }}
               className="absolute -top-3 -right-2 w-8 h-8 z-20 flex items-center justify-center group/pin focus:outline-none"
               title="Delete Log"
               aria-label="Delete Log"
           >
               <div className="w-3 h-3 rounded-full bg-red-500 border border-black shadow-sm group-hover/pin:hidden"></div>
               <div className="hidden group-hover/pin:flex w-6 h-6 bg-red-600 text-white border-2 border-black rounded-full items-center justify-center font-bold text-sm shadow-md transition-transform hover:scale-110">
                   ×
               </div>
           </button>
           
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{log.type}</span>
           <div className="font-display text-2xl leading-none mb-1 text-black">
                {formatDuration(duration)}
           </div>

           <div className="text-[10px] font-mono font-bold opacity-50 text-black">
               {formatAbsoluteTime(log.startTime)} - {formatAbsoluteTime(endTime)}
           </div>
        </div>
    );
};

// --- Session Group Component ---
interface SessionGroupProps {
    sessionId?: string;
    logs: StudyLog[];
    deleteLog: (id: string) => void;
}

const SessionGroup: React.FC<SessionGroupProps> = ({ sessionId, logs, deleteLog }) => {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);

    // Calculate session totals
    const totalWork = logs.filter(l => l.type === 'STUDY').reduce((acc, l) => acc + (l.durationSeconds ?? 0), 0);
    const totalBreak = logs.filter(l => l.type === 'BREAK').reduce((acc, l) => acc + (l.durationSeconds ?? 0), 0);
    
    const startTime = logs[logs.length - 1].startTime; // Logs are typically reverse chronological
    const endTime = logs[0].startTime + (logs[0].durationSeconds ?? 0) * 1000;
    
    // Check if session is manual (if any log in session is manual)
    const isManual = logs.some(l => l.isManual);

    // If no sessionId (legacy logs), just render them as single cards without a group wrapper
    if (!sessionId) {
        return (
            <>
                {logs.map((log, idx) => (
                    <LogCard key={log.id} log={log} deleteLog={deleteLog} idx={idx} />
                ))}
            </>
        );
    }

    return (
        <div className="col-span-full border-4 border-black bg-white shadow-retro mb-3 transition-all">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-retro-blue focus:ring-inset"
            >
                {/* Left: Time only */}
                <div className="flex items-center gap-3">
                    {isManual && (
                       <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]">
                           {t('manualBadge')}
                       </span>
                    )}
                    <span className="font-bold text-xs font-mono tracking-wide text-gray-600 border-b-2 border-black/10 pb-0.5">
                        {formatAbsoluteTime(startTime)} - {formatAbsoluteTime(endTime)}
                    </span>
                </div>

                {/* Right: Stats and Arrow */}
                <div className="flex items-center gap-3 sm:gap-6 ml-auto sm:ml-0">
                     <div className="flex gap-3">
                         <div className="flex items-baseline gap-1 bg-retro-yellow/20 px-2 py-1 rounded border border-black/10">
                            <span className="text-[10px] font-bold uppercase opacity-60 text-black">Work</span>
                            <span className="font-display text-lg leading-none text-black">{formatDuration(totalWork)}</span>
                         </div>
                         <div className="flex items-baseline gap-1 bg-retro-green/20 px-2 py-1 rounded border border-black/10">
                            <span className="text-[10px] font-bold uppercase opacity-60 text-black">Break</span>
                            <span className="font-display text-lg leading-none text-black">{formatDuration(totalBreak)}</span>
                         </div>
                     </div>
                     
                     <div className={`transition-transform duration-200 ${expanded ? 'rotate-180' : 'rotate-0'}`}>
                        <div className="w-6 h-6 flex items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-full group-hover:shadow-none group-hover:translate-x-px group-hover:translate-y-px transition-all">
                            <span className="text-[10px] font-bold leading-none select-none text-black">▼</span> 
                        </div>
                     </div>
                </div>
            </button>

            {expanded && (
                <div className="p-4 bg-retro-paper border-t-4 border-black grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {[...logs].reverse().map((log, idx) => (
                        <LogCard key={log.id} log={log} deleteLog={deleteLog} idx={idx} />
                    ))}
                </div>
            )}
        </div>
    );
};

const StatsBoard: React.FC<StatsBoardProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { logs, clearLogs, deleteLog } = useLogs();
  const { settings } = useSettings();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [confirmClear, setConfirmClear] = useState<'TODAY' | 'ALL' | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeRange]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  const filteredLogs = useMemo(() => {
    let sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    
    // Time Filter logic
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (timeRange !== 'ALL') {
      sorted = sorted.filter(log => {
        const logTime = log.timestamp;
        switch (timeRange) {
          case 'TODAY':
            return logTime >= startOfToday;
          case 'YESTERDAY':
            const startOfYesterday = startOfToday - 86400000;
            return logTime >= startOfYesterday && logTime < startOfToday;
          case 'LAST_3_DAYS':
            return logTime >= startOfToday - (2 * 86400000); // Today + 2 previous days
          case 'LAST_7_DAYS':
            return logTime >= startOfToday - (6 * 86400000); // Today + 6 previous days
          case 'THIS_WEEK':
            return getWeekKey(logTime) === getWeekKey(now.getTime());
          case 'THIS_MONTH':
            return getMonthKey(logTime) === getMonthKey(now.getTime());
          default:
            return true;
        }
      });
    }

    return sorted;
  }, [logs, timeRange]);

  // Group logs by Day for Pagination
  const { dateKeys, logsByDate } = useMemo(() => {
    const groups: Record<string, StudyLog[]> = {};
    const keys: string[] = [];

    filteredLogs.forEach(log => {
        const dateKey = getDayKey(log.timestamp);
        if (!groups[dateKey]) {
            groups[dateKey] = [];
            keys.push(dateKey);
        }
        groups[dateKey].push(log);
    });

    return { dateKeys: keys, logsByDate: groups };
  }, [filteredLogs]);

  const totalPages = dateKeys.length;

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [totalPages, currentPage]);

  const currentDayLogs = useMemo(() => {
      if (totalPages === 0) return [];
      const dateKey = dateKeys[currentPage - 1];
      return logsByDate[dateKey] || [];
  }, [currentPage, dateKeys, logsByDate, totalPages]);
  
  // Group current page logs by Session ID
  const groupedSessionLogs = useMemo(() => {
      const finalGroups: { sessionId?: string, items: StudyLog[] }[] = [];
      const seenSessions = new Set<string>();
      
      currentDayLogs.forEach(log => {
          if (log.sessionId) {
              if (!seenSessions.has(log.sessionId)) {
                  seenSessions.add(log.sessionId);
                  // Find all logs for this session on this day
                  const sessionItems = currentDayLogs.filter(l => l.sessionId === log.sessionId);
                  finalGroups.push({ sessionId: log.sessionId, items: sessionItems });
              }
              // If seen, skip, because we added the group already
          } else {
              finalGroups.push({ items: [log] });
          }
      });
      
      return finalGroups;
  }, [currentDayLogs]);

  const currentDayLabel = useMemo(() => {
      if (currentDayLogs.length > 0) {
          const timestamp = currentDayLogs[0].timestamp;
          const dateStr = formatDateRetro(timestamp);
          
          const date = new Date(timestamp);
          const now = new Date();
          
          // Calculate total work duration for this day (page)
          const totalWorkSeconds = currentDayLogs
            .filter(l => l.type === 'STUDY')
            .reduce((acc, l) => {
                const duration = l.durationSeconds ?? ((l as any).durationMinutes * 60) ?? 0;
                return acc + duration;
            }, 0);
            
          const durationStr = formatDuration(totalWorkSeconds);
          
          // Check Today
          if (date.toDateString() === now.toDateString()) {
              return `${t('filterToday')} - ${dateStr} (${durationStr})`;
          }
          
          // Check Yesterday
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          if (date.toDateString() === yesterday.toDateString()) {
               return `${t('filterYesterday')} - ${dateStr} (${durationStr})`;
          }
          
          return `${dateStr} (${durationStr})`;
      }
      return '';
  }, [currentDayLogs, t]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayKey = getDayKey(now.getTime());
    const weekKey = getWeekKey(now.getTime());
    const monthKey = getMonthKey(now.getTime());
    const yearKey = getYearKey(now.getTime());

    let todaySec = 0;
    let weekSec = 0;
    let monthSec = 0;
    let yearSec = 0;

    const studyLogs = logs.filter(l => l.type === 'STUDY');

    studyLogs.forEach(log => {
      const logDay = getDayKey(log.timestamp);
      const logWeek = getWeekKey(log.timestamp);
      const logMonth = getMonthKey(log.timestamp);
      const logYear = getYearKey(log.timestamp);
      
      const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60);

      if (logDay === todayKey) todaySec += duration;
      if (logWeek === weekKey) weekSec += duration;
      if (logMonth === monthKey) monthSec += duration;
      if (logYear === yearKey) yearSec += duration;
    });

    // Count unique sessions (all time)
    const uniqueSessions = new Set<string>();
    let legacyCount = 0;
    studyLogs.forEach(log => {
        if (log.sessionId) {
            uniqueSessions.add(log.sessionId);
        } else {
            legacyCount++;
        }
    });

    return {
      today: formatDuration(todaySec),
      week: formatDuration(weekSec),
      month: formatDuration(monthSec),
      year: formatDuration(yearSec),
      totalWorkSessions: uniqueSessions.size + legacyCount,
    };
  }, [logs]);

  const chartData = useMemo(() => {
    const grouped = logs.reduce((acc, log) => {
      const key = getDayKey(log.timestamp);
      if (!acc[key]) acc[key] = { study: 0, break: 0 };
      
      const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60);
      
      if (log.type === 'STUDY') acc[key].study += duration;
      else acc[key].break += duration;
      return acc;
    }, {} as Record<string, { study: number, break: number }>);

    return Object.entries(grouped)
      .map(([date, data]) => {
        const seconds = data as { study: number; break: number };
        return {
          name: date.split('/').slice(0, 2).join('/'),
          workHours: parseFloat((seconds.study / 3600).toFixed(4)),
          breakHours: parseFloat((seconds.break / 3600).toFixed(4)),
          fullDate: date
        };
      })
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .slice(-7);
  }, [logs]);

  const TimeButton = ({ range, label }: { range: TimeRange, label: string }) => (
    <button 
      onClick={() => setTimeRange(range)} 
      aria-pressed={timeRange === range}
      className={`h-8 px-3 font-bold text-xs leading-none rounded border-2 border-black transition-all flex items-center justify-center ${timeRange === range ? 'bg-retro-blue text-white shadow-none translate-y-[2px]' : 'bg-white text-black shadow-sm hover:bg-gray-50 active:translate-y-[2px] active:shadow-none'}`}
    >
      {label}
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="bg-white w-full max-w-5xl h-[90vh] border-4 border-black shadow-retro flex flex-col overflow-hidden backdrop:bg-black/80 backdrop:backdrop-blur-sm p-0 m-auto open:flex"
    >
        <div className="p-4 border-b-4 border-black flex justify-between items-center bg-retro-blue z-10">
          <h2 className="text-3xl font-display text-white stroke-black" style={{ WebkitTextStroke: '1px black' }}>{t('activityBoard')}</h2>
          <RetroButton onClick={onClose} variant="danger" className="py-1 px-3 text-sm">{t('close')}</RetroButton>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-retro-paper transition-colors">
          {/* Global Stats */}
          <div className="flex flex-col gap-4 mb-8">
             {/* Priority: Work Today */}
             <div className="bg-white border-4 border-black p-6 text-center shadow-retro transform hover:scale-[1.01] transition-transform">
                <p className="text-lg font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">{t('workToday')}</p>
                <p className="text-6xl font-display stroke-black text-black">{stats.today}</p>
             </div>

             {/* Secondary Stats */}
             <div className="grid grid-cols-3 gap-4">
                 <div className="bg-white border-2 border-black p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 truncate">{t('workThisWeek')}</p>
                    <p className="text-lg sm:text-xl font-display leading-none mt-1 text-black">{stats.week}</p>
                 </div>
                 <div className="bg-white border-2 border-black p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 truncate">{t('workThisMonth')}</p>
                    <p className="text-lg sm:text-xl font-display leading-none mt-1 text-black">{stats.month}</p>
                 </div>
                 <div className="bg-white border-2 border-black p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 truncate">{t('totalSessions')}</p>
                    <p className="text-lg sm:text-xl font-display leading-none mt-1 text-black">{stats.totalWorkSessions}</p>
                 </div>
             </div>
          </div>

          {/* Chart */}
          <div className="bg-retro-paper border-4 border-black p-4 shadow-retro mb-8 h-64 text-black relative flex flex-col">
             <div className="flex justify-between items-center mb-2 relative z-10 pl-2 pr-2">
                 <p className="text-sm font-bold uppercase">{t('past7Days')}</p>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-retro-yellow border border-black"></div>
                        <span className="text-xs font-bold font-body">WORK</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-retro-green border border-black"></div>
                        <span className="text-xs font-bold font-body">BREAK</span>
                    </div>
                 </div>
             </div>
             
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
             
             <div className="flex-1 min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                   <XAxis 
                        dataKey="name" 
                        stroke="#000" 
                        tick={{fontFamily: 'Bangers', fontSize: 12}} 
                        tickLine={false} 
                    />
                   <YAxis 
                        stroke="#000" 
                        tick={{fontFamily: 'Bangers', fontSize: 12}} 
                        tickLine={false} 
                    />
                   <Tooltip 
                     contentStyle={{ 
                         border: '2px solid black', 
                         fontFamily: 'Comic Neue', 
                         color: 'black', 
                         borderRadius: '4px',
                         backgroundColor: 'white'
                     }}
                     cursor={{fill: 'rgba(0,0,0,0.05)'}}
                   />
                   <Bar dataKey="workHours" name="Work" stackId="a" fill="#ffeb3b" stroke="#000" strokeWidth={2} />
                   <Bar dataKey="breakHours" name="Break" stackId="a" fill="#b9f6ca" stroke="#000" strokeWidth={2} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Notice Board / Logs */}
          <div className="mb-6 relative">
             <div className="bg-[#5c4033] absolute -inset-4 opacity-10 rounded-xl" /> {/* Corkboard feel bg */}
             
             {/* Filter Bar */}
             <div className="flex flex-col xl:flex-row justify-between items-center mb-4 relative z-10 border-b-4 border-black/10 pb-4 gap-4">
                {/* Header with Session Badge Style */}
                <div className="transform -rotate-1">
                    <h3 className="text-3xl font-display bg-black text-white px-4 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] leading-none m-0 tracking-wide">
                        {t('recentActivity')}
                    </h3>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-end w-full xl:w-auto">
                    {/* Time Filters */}
                    <TimeButton range="TODAY" label={t('filterToday')} />
                    <TimeButton range="YESTERDAY" label={t('filterYesterday')} />
                    
                    {/* Dropdown */}
                    <div className="relative h-8">
                        <select 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                            className="h-full appearance-none pl-3 pr-8 font-bold text-xs rounded border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-retro-blue cursor-pointer shadow-sm hover:bg-gray-50 flex items-center"
                        >
                            <option value="ALL">{t('filterAllTime')}</option>
                            <option value="TODAY">{t('filterToday')}</option>
                            <option value="YESTERDAY">{t('filterYesterday')}</option>
                            <option value="LAST_3_DAYS">{t('filterLast3Days')}</option>
                            <option value="LAST_7_DAYS">{t('filterLast7Days')}</option>
                            <option value="THIS_WEEK">{t('filterThisWeek')}</option>
                            <option value="THIS_MONTH">{t('filterThisMonth')}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
             </div>

             {/* Date Header for Current Page */}
             {currentDayLogs.length > 0 && (
                <div className="relative z-10 mb-4 flex justify-center">
                    <div className="bg-white border-2 border-black px-4 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-1">
                        <span className="font-display text-xl text-black">{currentDayLabel}</span>
                    </div>
                </div>
             )}

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2 relative z-10">
               {groupedSessionLogs.length === 0 ? (
                 <div className="col-span-full flex justify-center items-center py-10">
                    <div className="bg-white border-2 border-black p-4 rotate-2 shadow-retro text-center">
                        <p className="text-gray-500 italic font-bold text-lg">{t('noActivity')}</p>
                    </div>
                 </div>
               ) : (
                 groupedSessionLogs.map((group, idx) => (
                    <SessionGroup 
                        key={group.sessionId || `legacy-${idx}`} 
                        sessionId={group.sessionId} 
                        logs={group.items} 
                        deleteLog={deleteLog} 
                    />
                 ))
               )}
             </div>

             {totalPages > 1 && (
                 <div className="flex justify-center items-center mt-8 gap-4 relative z-10">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="w-12 h-12 flex items-center justify-center rounded-full font-bold bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
                        aria-label={t('prev')}
                    >
                        ←
                    </button>
                    <div className="bg-white px-4 py-2 border-2 border-black font-display text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                        {t('page')} {currentPage} / {totalPages}
                    </div>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="w-12 h-12 flex items-center justify-center rounded-full font-bold bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
                        aria-label={t('next')}
                    >
                        →
                    </button>
                 </div>
             )}
          </div>

          <div className="border-t-4 border-black pt-6">
            <h3 className="text-xl font-display mb-3 text-red-600">{t('dangerZone')}</h3>
            <div className="flex gap-4">
               <button 
                  onClick={() => setConfirmClear('TODAY')} 
                  className="bg-gray-200 border-2 border-black px-4 py-2 font-bold text-sm hover:bg-red-100 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 text-black"
               >
                 {t('clearToday')}
               </button>
               <button 
                  onClick={() => setConfirmClear('ALL')} 
                  className="bg-red-500 text-white border-2 border-black px-4 py-2 font-bold text-sm hover:bg-red-600 transition-colors shadow-sm active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-red-900"
               >
                 {t('resetAll')}
               </button>
            </div>
          </div>
        </div>

      {confirmClear && (
         <ConfirmationModal 
            title={confirmClear === 'ALL' ? t('nukeTitle') : t('clearTitle')}
            message={confirmClear === 'ALL' ? t('nukeMsg') : t('clearMsg')}
            onConfirm={() => {
               clearLogs(confirmClear);
               setConfirmClear(null);
            }}
            onCancel={() => setConfirmClear(null)}
         />
      )}
    </dialog>
  );
};

export default StatsBoard;