import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { PageHeader, PageHeaderContent, AppointmentsPictogram } from '@openmrs/esm-framework';
import { launchCreateAppointmentForm } from '../helpers/functions';
import styles from './appointments-header.scss';

interface AppointmentHeaderProps {
  title: string;
  showServiceTypeFilter?: boolean;
}

const AppointmentsHeader: React.FC<AppointmentHeaderProps> = ({ title }) => {
  const { t } = useTranslation();

  return (
    <PageHeader className={styles.header} data-testid="appointments-header">
      <PageHeaderContent illustration={<AppointmentsPictogram />} title={title} />
      <div className={styles.rightJustifiedItems}>
        <Button kind="primary" renderIcon={Add} size="sm" onClick={() => launchCreateAppointmentForm(t)}>
          {t('newAppointment', 'New appointment')}
        </Button>
      </div>
    </PageHeader>
  );
};

export default AppointmentsHeader;
