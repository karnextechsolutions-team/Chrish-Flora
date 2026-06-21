'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BusinessHours } from '@/lib/business-hours';

interface Props {
  businessHours: BusinessHours;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May',
  'June','July','August','September','October','November','December'];
const DAY_KEYS = ['sunday','monday','tuesday','wednesday',
  'thursday','friday','saturday'] as const;

export default function DeliveryCalendar({ 
  businessHours, selectedDate, onDateSelect 
}: Props) {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const [viewMonth, setViewMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const prevMonth = () => setViewMonth(d => 
    new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(d => 
    new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Build calendar grid
  const firstDay = new Date(
    viewMonth.getFullYear(), viewMonth.getMonth(), 1
  );
  const lastDay = new Date(
    viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0
  );
  
  const startPad = firstDay.getDay(); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) =>
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
    ),
  ];
  // Fill to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isAvailable = (date: Date): boolean => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    if (d < today) return false; // Past dates
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30); // 30 days ahead
    if (d > maxDate) return false;
    
    const dayKey = DAY_KEYS[d.getDay()];
    const hours = businessHours[dayKey];
    if (!hours || hours.closed) return false;
    
    // Same day: check if enough time (2hr buffer)
    if (d.getTime() === today.getTime()) {
      const now = new Date();
      const [closeH] = hours.close.split(':').map(Number);
      const closeTime = new Date();
      closeTime.setHours(closeH - 2, 0, 0, 0);
      if (now >= closeTime) return false;
    }
    
    return true;
  };

  const isSelected = (date: Date) =>
    selectedDate?.toDateString() === date.toDateString();

  const isToday = (date: Date) =>
    date.toDateString() === today.toDateString();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={prevMonth}
          disabled={viewMonth <= new Date(today.getFullYear(), today.getMonth(), 1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} className="text-flora-brown" />
        </button>
        
        <p className="font-serif text-lg text-flora-brown font-medium">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </p>
        
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={18} className="text-flora-brown" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map(day => (
          <div key={day} 
            className="py-2 text-center text-[10px] font-sans font-bold text-flora-brown/40 tracking-widest uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          
          const available = isAvailable(date);
          const selected = isSelected(date);
          const todayDate = isToday(date);
          
          return (
            <button
              key={i}
              type="button"
              disabled={!available}
              onClick={() => available && onDateSelect(date)}
              className={`
                aspect-square flex flex-col items-center justify-center
                rounded-xl text-sm font-sans transition-all
                ${selected
                  ? 'bg-gold-600 text-white font-bold shadow-sm'
                  : available
                    ? todayDate
                      ? 'bg-olive-50 text-flora-brown hover:bg-gold-50 hover:text-gold-700 border border-olive-300'
                      : 'text-flora-brown hover:bg-gold-50 hover:text-gold-700'
                    : 'text-gray-300 cursor-not-allowed'
                }
              `}
            >
              <span className="font-medium">{date.getDate()}</span>
              {todayDate && !selected && (
                <span className="w-1 h-1 rounded-full bg-gold-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[10px] font-sans text-flora-brown/50">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gold-600 inline-block" />
          Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-olive-50 border border-olive-300 inline-block" />
          Today
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
          Unavailable
        </span>
      </div>
    </div>
  );
}
