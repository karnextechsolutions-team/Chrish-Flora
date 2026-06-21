/**
 * Utility to manage store business hours and calculate delivery date & time slots.
 */

export interface DayConfig {
  open: string;    // E.g. "08:00"
  close: string;   // E.g. "18:00"
  closed: boolean;
}

export interface BusinessHours {
  monday: DayConfig;
  tuesday: DayConfig;
  wednesday: DayConfig;
  thursday: DayConfig;
  friday: DayConfig;
  saturday: DayConfig;
  sunday: DayConfig;
}

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: '08:00', close: '18:00', closed: false },
  tuesday: { open: '08:00', close: '18:00', closed: false },
  wednesday: { open: '08:00', close: '18:00', closed: false },
  thursday: { open: '08:00', close: '18:00', closed: false },
  friday: { open: '08:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '17:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: false },
};

/**
 * Generate the next 7 days, filtering out days where the store is closed.
 */
export function getAvailableDeliveryDates(businessHours: BusinessHours = DEFAULT_HOURS): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof BusinessHours;
    const config = businessHours[dayName] || DEFAULT_HOURS[dayName];
    
    // Check if the store is closed on this day
    if (config.closed) {
      continue;
    }
    
    // For today, check if current time is already past closing time minus a 1-hour buffer
    if (i === 0) {
      const [closeH, closeM] = config.close.split(':').map(Number);
      const closeTime = new Date(d);
      closeTime.setHours(closeH, closeM, 0, 0);
      
      // If current time is past (closing - 1 hour), skip today
      if (Date.now() > closeTime.getTime() - 60 * 60 * 1000) {
        continue;
      }
    }
    
    dates.push(d);
  }

  return dates;
}

/**
 * Generate 2-hour interval time slots for a given date, applying a 2-hour future buffer if the date is today.
 */
export function getTimeSlotsForDate(date: Date, businessHours: BusinessHours = DEFAULT_HOURS): string[] {
  const slots: string[] = [];
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof BusinessHours;
  const config = businessHours[dayName] || DEFAULT_HOURS[dayName];

  if (config.closed) {
    return [];
  }

  const [openH, openM] = config.open.split(':').map(Number);
  const [closeH, closeM] = config.close.split(':').map(Number);

  // Generate 2-hour slots from open time to close time
  let currentHour = openH;
  
  while (currentHour + 2 <= closeH || (currentHour + 2 === closeH && closeM > 0)) {
    const startHour = currentHour;
    const endHour = currentHour + 2;
    
    const formatTime = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH.toString().padStart(2, '0')}:00 ${ampm}`;
    };
    
    const label = `${formatTime(startHour)} - ${formatTime(endHour)}`;
    
    // Check if the date is today, and only include slots starting at least 2 hours in the future
    const isToday = new Date().toDateString() === date.toDateString();
    if (isToday) {
      const slotStartTime = new Date(date);
      slotStartTime.setHours(startHour, 0, 0, 0);
      
      const bufferTime = Date.now() + 2 * 60 * 60 * 1000; // 2-hour buffer
      if (slotStartTime.getTime() >= bufferTime) {
        slots.push(label);
      }
    } else {
      slots.push(label);
    }
    
    currentHour += 2;
  }

  return slots;
}
