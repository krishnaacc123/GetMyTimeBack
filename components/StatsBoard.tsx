import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { StudyLog } from '../types';
import { getDayKey, getWeekKey, getMonthKey, getYearKey, formatDuration, formatAbsoluteTime } from '../utils/time';
import RetroButton from './RetroButton';
import ConfirmationModal from './ConfirmationModal';

interface StatsBoardProps {
  logs: StudyLog[];
  onClose: () => void;
  onClearLogs: (scope: 'TODAY' | 'ALL') => void;
}

const StatsBoard: React.FC<StatsBoardProps> = ({ logs, onClose, onClearLogs }) => {
  const [filter, setFilter] = useState<'ALL' | 'STUDY' | 'BREAK'>('ALL');
  const [confirmClear, setConfirmClear] = useState<'TODAY' | 'ALL' | null>(null);

  const filteredLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === 'ALL') return sorted;
    return sorted.filter(l => l.type === filter);
  }, [logs, filter]);

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

    // We only count STUDY (Work) type for the summary stats at the top
    logs.filter(l => l.type === 'STUDY').forEach(log => {
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

    return {
      today: formatDuration(todaySec),
      week: formatDuration(weekSec),
      month: formatDuration(monthSec),
      year: formatDuration(yearSec),
      totalWorkSessions: logs.filter(l => l.type === 'STUDY').length,
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
          // Using 4 decimal places ensures small durations (like 30s) are not rounded to 0
          workHours: parseFloat((seconds.study / 3600).toFixed(4)),
          breakHours: parseFloat((seconds.break / 3600).toFixed(4)),
          fullDate: date
        };
      })
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .slice(-7);
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] border-4 border-black shadow-retro flex flex-col overflow-hidden">
        <div className="p-4 border-b-4 border-black flex justify-between items-center bg-retro-blue">
          <h2 className="text-3xl font-display text-white stroke-black" style={{ WebkitTextStroke: '1px black' }}>Activity Board</h2>
          <RetroButton onClick={onClose} variant="danger" className="py-1 px-3 text-sm">Close</RetroButton>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-retro-paper">
          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
             <div className="bg-white border-4 border-black p-3 text-center shadow-retro">
                <p className="text-xs font-bold uppercase text-gray-500">Work Today</p>
                <p className="text-xl font-display">{stats.today}</p>
             </div>
             <div className="bg-white border-4 border-black p-3 text-center shadow-retro">
                <p className="text-xs font-bold uppercase text-gray-500">Work This Week</p>
                <p className="text-xl font-display">{stats.week}</p>
             </div>
             <div className="bg-white border-4 border-black p-3 text-center shadow-retro">
                <p className="text-xs font-bold uppercase text-gray-500">Work This Month</p>
                <p className="text-xl font-display">{stats.month}</p>
             </div>
             <div className="bg-white border-4 border-black p-3 text-center shadow-retro">
                <p className="text-xs font-bold uppercase text-gray-500">Total Sessions</p>
                <p className="text-xl font-display">{stats.totalWorkSessions}</p>
             </div>
          </div>

          {/* Chart */}
          <div className="bg-white border-4 border-black p-4 shadow-retro mb-6 h-64">
             <p className="text-sm font-bold mb-2 uppercase">Past 7 Days (Hours)</p>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <XAxis dataKey="name" stroke="#000" tick={{fontFamily: 'Bangers'}} />
                 <YAxis stroke="#000" tick={{fontFamily: 'Bangers'}} />
                 <Tooltip 
                   contentStyle={{ border: '2px solid black', fontFamily: 'Comic Neue' }}
                   cursor={{fill: '#f0f0f0'}}
                 />
                 <Legend />
                 <Bar dataKey="workHours" name="Work" stackId="a" fill="#ffeb3b" stroke="#000" strokeWidth={2} />
                 <Bar dataKey="breakHours" name="Break" stackId="a" fill="#b9f6ca" stroke="#000" strokeWidth={2} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          {/* Detailed Logs */}
          <div className="mb-6">
             <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-2">
                <h3 className="text-2xl font-display">Recent Activity</h3>
                <div className="flex gap-2 text-sm">
                   <button onClick={() => setFilter('ALL')} className={`px-2 py-1 font-bold ${filter === 'ALL' ? 'bg-black text-white' : 'bg-gray-200'}`}>ALL</button>
                   <button onClick={() => setFilter('STUDY')} className={`px-2 py-1 font-bold ${filter === 'STUDY' ? 'bg-retro-yellow text-black border-2 border-black' : 'bg-gray-200'}`}>WORK</button>
                   <button onClick={() => setFilter('BREAK')} className={`px-2 py-1 font-bold ${filter === 'BREAK' ? 'bg-retro-green text-black border-2 border-black' : 'bg-gray-200'}`}>BREAK</button>
                </div>
             </div>

             <div className="space-y-3">
               {filteredLogs.length === 0 ? (
                 <p className="text-center text-gray-500 italic py-4">No activity logged yet.</p>
               ) : (
                 filteredLogs.map(log => {
                   const duration = log.durationSeconds ?? ((log as any).durationMinutes * 60);
                   const endTime = log.startTime + (duration * 1000);
                   
                   return (
                     <div key={log.id} className="bg-white border-2 border-black p-3 shadow-sm flex justify-between items-center hover:translate-x-1 transition-transform">
                        <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full border border-black ${log.type === 'STUDY' ? 'bg-retro-yellow' : 'bg-retro-green'}`} />
                           <div>
                              <p className="font-bold leading-none">{log.type === 'STUDY' ? 'WORK' : 'BREAK'}</p>
                              <p className="text-xs text-gray-500 font-mono">
                                {formatAbsoluteTime(log.startTime)} - {formatAbsoluteTime(endTime)}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="font-display text-xl">{formatDuration(duration)}</span>
                           <p className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                        </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t-4 border-black pt-6">
            <h3 className="text-xl font-display mb-3 text-red-600">Danger Zone</h3>
            <div className="flex gap-4">
               <button 
                  onClick={() => setConfirmClear('TODAY')} 
                  className="bg-gray-200 border-2 border-black px-4 py-2 font-bold text-sm hover:bg-red-100 transition-colors"
               >
                 Clear Today's Data
               </button>
               <button 
                  onClick={() => setConfirmClear('ALL')} 
                  className="bg-red-500 text-white border-2 border-black px-4 py-2 font-bold text-sm hover:bg-red-600 transition-colors shadow-sm active:translate-y-1"
               >
                 Reset All Data
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmClear && (
         <ConfirmationModal 
            title={confirmClear === 'ALL' ? "Nuke Everything?" : "Clear Today?"}
            message={confirmClear === 'ALL' ? "This will permanently delete ALL your study logs. There is no going back!" : "This will remove all sessions logged today."}
            onConfirm={() => {
               onClearLogs(confirmClear);
               setConfirmClear(null);
            }}
            onCancel={() => setConfirmClear(null)}
         />
      )}
    </div>
  );
};

export default StatsBoard;