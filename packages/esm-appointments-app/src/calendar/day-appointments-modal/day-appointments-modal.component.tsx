import React, { useMemo, useState, useEffect } from 'react';
import {
  Tag,
  InlineLoading,
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ContentSwitcher,
  Switch,
} from '@carbon/react';
import { Launch } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { formatAMPM } from '../../helpers/functions';
import { type Appointment } from '../../types';
import { useAppointmentsByDate } from '../../hooks/useAppointmentsByDate';
import { STATUS_TAG_TYPES, DEFAULT_STATUS_TAG_TYPE, getServiceColor, formatHourLabel } from '../utils/calendar-colors';
import styles from './day-appointments-modal.scss';

const LOCALE_MAP: Record<string, string> = {
  gregory: 'en-US',
  ethiopic: 'am-ET',
  islamic: 'ar-SA',
  persian: 'fa-IR',
};

interface DayAppointmentsModalProps {
  isoDate: string;
  calKey: string;
  /** When both are provided, the modal filters to appointments within [startHour, endHour). */
  startHour?: number;
  endHour?: number;
  onClose: () => void;
  onDrillDown: (mode: 'daily', isoDate: string) => void;
}

const DayAppointmentsModal: React.FC<DayAppointmentsModalProps> = ({
  isoDate,
  calKey,
  startHour,
  endHour,
  onClose,
  onDrillDown,
}) => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('All');
  const { appointments: allAppointments, isLoading } = useAppointmentsByDate(isoDate);
  const locale = LOCALE_MAP[calKey] ?? 'en-US';

  // ── Hour-range filter (applied first, before status grouping) ──────────
  const appointments = useMemo(
    () =>
      startHour != null && endHour != null
        ? allAppointments.filter((a) => {
            if (a.startDateTime == null) return false;
            const h = new Date(a.startDateTime).getHours();
            return h >= startHour && h < endHour;
          })
        : allAppointments,
    [allAppointments, startHour, endHour],
  );

  // ── Display date (with optional hour range) ─────────────────────────────
  const displayDate = useMemo(() => {
    const d = new Date(isoDate + 'T00:00:00');
    const dateStr = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: calKey,
    }).format(d);
    return startHour != null && endHour != null
      ? `${dateStr} · ${formatHourLabel(startHour)} – ${formatHourLabel(endHour)}`
      : dateStr;
  }, [isoDate, locale, calKey, startHour, endHour]);

  const statuses = useMemo(() => ['All', ...Array.from(new Set(appointments.map((a) => a.status)))], [appointments]);

  useEffect(() => {
    if (statusFilter !== 'All' && !statuses.includes(statusFilter)) {
      setStatusFilter('All');
    }
  }, [statuses, statusFilter]);

  const filtered = useMemo(
    () => (statusFilter === 'All' ? appointments : appointments.filter((a) => a.status === statusFilter)),
    [appointments, statusFilter],
  );

  const byService = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filtered.forEach((a) => {
      const k = a.service?.name ?? t('unknownService', 'Unknown Service');
      map.set(k, [...(map.get(k) ?? []), a]);
    });
    return Array.from(map.entries());
  }, [filtered, t]);

  // ── ContentSwitcher selected index ──────────────────────────────────────
  const selectedIndex = statuses.indexOf(statusFilter);

  return (
    <ComposedModal open onClose={onClose} size="md">
      <ModalHeader title={displayDate} label={t('appointments', 'Appointments')} />
      <ModalBody>
        <div className={styles.subtitleRow}>
          <p className={styles.subtitle}>
            {appointments.length} {t('appointmentsTotal', 'appointments')}
          </p>
          <Button kind="ghost" size="sm" renderIcon={Launch} onClick={() => onDrillDown('daily', isoDate)}>
            {t('openDayView', 'Open Day View')}
          </Button>
        </div>

        {!isLoading && appointments.length > 0 && (
          <div className={styles.filters}>
            <ContentSwitcher
              selectedIndex={selectedIndex}
              size="sm"
              onChange={({ name }) => setStatusFilter(name as string)}>
              {statuses.map((s) => {
                const count = s === 'All' ? appointments.length : appointments.filter((a) => a.status === s).length;
                return <Switch key={s} name={s} text={`${s} (${count})`} />;
              })}
            </ContentSwitcher>
          </div>
        )}

        {isLoading ? (
          <InlineLoading description={t('loadingAppointments', 'Loading appointments…')} />
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>{t('noAppointmentsFound', 'No appointments found')}</p>
        ) : (
          byService.map(([svcName, appts]) => (
            <div key={svcName} className={styles.serviceGroup}>
              <div className={styles.serviceHeader} style={{ borderBottomColor: `${getServiceColor(svcName)}40` }}>
                <span className={styles.serviceDot} style={{ background: getServiceColor(svcName) }} />
                <span className={styles.serviceName}>{svcName}</span>
                <span
                  className={styles.serviceCount}
                  style={{
                    background: `${getServiceColor(svcName)}18`,
                    color: getServiceColor(svcName),
                  }}>
                  {appts.length}
                </span>
              </div>
              {appts.map((a) => {
                const time = a.startDateTime != null ? formatAMPM(new Date(a.startDateTime)) : '—';
                return (
                  <div key={a.uuid} className={styles.apptRow}>
                    <span className={styles.apptTime}>{time}</span>
                    <span className={styles.apptName}>{a.patient?.name ?? '—'}</span>
                    <Tag type={STATUS_TAG_TYPES[a.status] ?? DEFAULT_STATUS_TAG_TYPE} size="sm">
                      {a.status}
                    </Tag>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </ModalBody>
    </ComposedModal>
  );
};

export default DayAppointmentsModal;
