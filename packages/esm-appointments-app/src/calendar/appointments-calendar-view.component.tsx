import React, { useState, useCallback } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getLocale } from '@openmrs/esm-framework';
import { useAppointmentsCalendar } from '../hooks/useAppointmentsCalendar';
import AppointmentsHeader from '../header/appointments-header.component';
import { useSelectedDate } from '../hooks/useSelectedDate';
import CalendarHeader, { type CalendarViewMode } from './header/calendar-header.component';
import MonthlyCalendarView from './monthly/monthly-calendar-view.component';
import WeeklyCalendarView from './weekly/weekly-calendar-view.component';
import DailyCalendarView from './daily/daily-calendar-view.component';
import DayAppointmentsModal from './day-appointments-modal/day-appointments-modal.component';

const REVERSE_LOCALE_MAP: Record<string, string> = {
  en: 'gregory',
  am: 'ethiopic',
  ar: 'islamic',
  fa: 'persian',
};

function deriveCalKey(): string {
  const locale = getLocale();
  const lang = locale?.split('-')[0] ?? 'en';
  return REVERSE_LOCALE_MAP[lang] ?? 'gregory';
}

const AppointmentsCalendarView: React.FC = () => {
  const { t } = useTranslation();
  const selectedDate = useSelectedDate();

  const calSysKey = deriveCalKey();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('monthly');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Dayjs>(dayjs(selectedDate));
  const [modalState, setModalState] = useState<{ isoDate: string; startHour?: number; endHour?: number } | null>(null);

  const period = viewMode === 'weekly' ? 'weekly' : viewMode === 'daily' ? 'daily' : 'monthly';
  const { calendarEvents } = useAppointmentsCalendar(calendarSelectedDate.toISOString(), period);

  const handlePrev = useCallback(() => {
    if (viewMode === 'monthly') setCalendarSelectedDate((d) => d.subtract(1, 'month'));
    else if (viewMode === 'weekly') setCalendarSelectedDate((d) => d.subtract(7, 'day'));
    else setCalendarSelectedDate((d) => d.subtract(1, 'day'));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === 'monthly') setCalendarSelectedDate((d) => d.add(1, 'month'));
    else if (viewMode === 'weekly') setCalendarSelectedDate((d) => d.add(7, 'day'));
    else setCalendarSelectedDate((d) => d.add(1, 'day'));
  }, [viewMode]);

  const handleSelectDate = useCallback(
    (isoDate: string, startHour?: number, endHour?: number) => setModalState({ isoDate, startHour, endHour }),
    [],
  );

  const handleDrillDown = useCallback((_mode: 'daily', isoDate: string) => {
    setCalendarSelectedDate(dayjs(isoDate));
    setViewMode('daily');
    setModalState(null);
  }, []);

  const handleViewModeChange = useCallback((mode: CalendarViewMode) => {
    setViewMode(mode);
    setModalState(null);
  }, []);

  return (
    <div data-testid="appointments-calendar">
      <AppointmentsHeader title={t('calendar', 'Calendar')} showNewAppointmentButton />
      <CalendarHeader
        viewMode={viewMode}
        calendarSelectedDate={calendarSelectedDate}
        onViewModeChange={handleViewModeChange}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      {viewMode === 'monthly' && (
        <MonthlyCalendarView
          events={calendarEvents}
          calendarSelectedDate={calendarSelectedDate}
          calKey={calSysKey}
          onSelectDate={handleSelectDate}
        />
      )}
      {viewMode === 'weekly' && (
        <WeeklyCalendarView
          calKey={calSysKey}
          calendarSelectedDate={calendarSelectedDate}
          onSelectDate={handleSelectDate}
        />
      )}
      {viewMode === 'daily' && <DailyCalendarView calKey={calSysKey} calendarSelectedDate={calendarSelectedDate} />}
      {modalState && (
        <DayAppointmentsModal
          isoDate={modalState.isoDate}
          startHour={modalState.startHour}
          endHour={modalState.endHour}
          calKey={calSysKey}
          onClose={() => setModalState(null)}
          onDrillDown={handleDrillDown}
        />
      )}
    </div>
  );
};

export default AppointmentsCalendarView;
