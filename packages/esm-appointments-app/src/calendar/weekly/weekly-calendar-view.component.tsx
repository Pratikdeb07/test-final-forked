import React, { useMemo } from 'react';
import { type Dayjs } from 'dayjs';
import {
  parseDate,
  toCalendar,
  getDayOfWeek,
  startOfWeek,
  today,
  getLocalTimeZone,
  GregorianCalendar,
  EthiopicCalendar,
  IslamicCivilCalendar,
  PersianCalendar,
  type Calendar,
} from '@internationalized/date';
import { useAppointmentsByDate } from '../../hooks/useAppointmentsByDate';
import { type Appointment } from '../../types';
import { formatHourLabel } from '../utils/calendar-colors';
import styles from './weekly-calendar-view.scss';

const LOCALE_MAP: Record<string, string> = {
  gregory: 'en-US',
  ethiopic: 'am-ET',
  islamic: 'ar-SA',
  persian: 'fa-IR',
};

const DOW_LOCALE: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function getCalendar(calKey: string): Calendar {
  switch (calKey) {
    case 'ethiopic':
      return new EthiopicCalendar();
    case 'islamic':
      return new IslamicCivilCalendar();
    case 'persian':
      return new PersianCalendar();
    default:
      return new GregorianCalendar();
  }
}

interface WeekDay {
  iso: string;
  day: number;
  month: number;
  year: number;
  dow: number;
}

interface WeeklyCalendarViewProps {
  calKey: string;
  calendarSelectedDate: Dayjs;
  onSelectDate: (isoDate: string, hour: number) => void;
}

/** Count appointments in a given hour, handling null startDateTime. */
function countInHour(appointments: Array<Appointment>, hour: number): number {
  let n = 0;
  for (const a of appointments) {
    if (a.startDateTime != null && new Date(a.startDateTime).getHours() === hour) {
      n += 1;
    }
  }
  return n;
}

const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({ calKey, calendarSelectedDate, onSelectDate }) => {
  const todayISO = today(getLocalTimeZone()).toString();
  const isoDate = calendarSelectedDate.format('YYYY-MM-DD');
  const locale = LOCALE_MAP[calKey] ?? 'en-US';
  const cal = useMemo(() => getCalendar(calKey), [calKey]);

  const weekDays: ReadonlyArray<WeekDay> = useMemo(() => {
    const pivot = parseDate(isoDate);
    const firstDay = calKey === 'persian' ? 6 : 0;
    const weekStart = startOfWeek(pivot, 'en-US', DOW_LOCALE[firstDay]);
    return Array.from({ length: 7 }, (_, i) => {
      const gregDay = weekStart.add({ days: i });
      const calDay = toCalendar(gregDay, cal);
      return {
        iso: gregDay.toString(),
        day: calDay.day,
        month: calDay.month,
        year: calDay.year,
        dow: getDayOfWeek(gregDay, 'en-US', 'sun'),
      };
    });
  }, [isoDate, cal, calKey]);

  // ── Fetch appointments for all 7 days ──────────────────────────────────
  // SWR deduplicates concurrent calls for the same date — 7 unique keys.
  const day0 = useAppointmentsByDate(weekDays[0].iso);
  const day1 = useAppointmentsByDate(weekDays[1].iso);
  const day2 = useAppointmentsByDate(weekDays[2].iso);
  const day3 = useAppointmentsByDate(weekDays[3].iso);
  const day4 = useAppointmentsByDate(weekDays[4].iso);
  const day5 = useAppointmentsByDate(weekDays[5].iso);
  const day6 = useAppointmentsByDate(weekDays[6].iso);
  const dayData = [day0, day1, day2, day3, day4, day5, day6];

  const isLoading = dayData.some((d) => d.isLoading);

  // ── Only render hours that have appointments somewhere in the week ──────
  const populatedHours: ReadonlyArray<number> = useMemo(() => {
    const set = new Set<number>();
    dayData.forEach(({ appointments }) =>
      appointments.forEach((a) => {
        if (a.startDateTime != null) set.add(new Date(a.startDateTime).getHours());
      }),
    );
    return Array.from(set).sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    day0.appointments,
    day1.appointments,
    day2.appointments,
    day3.appointments,
    day4.appointments,
    day5.appointments,
    day6.appointments,
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* ── Column headers ─────────────────────────────────────────────── */}
        <div className={styles.cornerCell} />
        {weekDays.map((wd) => {
          const isToday = wd.iso === todayISO;
          const [y, m, d] = wd.iso.split('-').map(Number);
          const jsDate = new Date(y, m - 1, d);
          const dowLabel = new Intl.DateTimeFormat(locale, { weekday: 'short', calendar: calKey }).format(jsDate);
          const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', calendar: calKey }).format(jsDate);
          return (
            <div key={wd.iso} className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
              <div className={styles.dowLabel}>{dowLabel}</div>
              <div className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{wd.day}</div>
              <div className={styles.monthLabel}>{monthName}</div>
            </div>
          );
        })}

        {/* ── Empty week ─────────────────────────────────────────────────── */}
        {!isLoading && populatedHours.length === 0 && <p className={styles.emptyWeek}>No appointments this week</p>}

        {/* ── Populated hour rows only ───────────────────────────────────── */}
        {populatedHours.map((hr) => (
          <React.Fragment key={hr}>
            <div className={styles.timeLabel}>{formatHourLabel(hr)}</div>
            {weekDays.map((wd, dayIdx) => {
              const count = countInHour(dayData[dayIdx].appointments, hr);
              const hasAppts = count > 0;
              const isToday = wd.iso === todayISO;
              const hourLabel = formatHourLabel(hr);
              return (
                <div
                  key={wd.iso}
                  role="button"
                  tabIndex={hasAppts ? 0 : -1}
                  aria-label={hasAppts ? `${count} appointments at ${hourLabel}` : undefined}
                  onClick={() => hasAppts && onSelectDate(wd.iso, hr)}
                  onKeyDown={(e) => {
                    if (hasAppts && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectDate(wd.iso, hr);
                    }
                  }}
                  className={`${styles.slotCell} ${isToday ? styles.slotCellToday : ''} ${hasAppts ? styles.slotCellHasAppts : ''}`}>
                  {hasAppts && <span className={styles.slotBadge}>{count}</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendarView;
