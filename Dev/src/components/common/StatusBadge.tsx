import { useTranslation } from '../../i18n/translations';
import { StatusBadgeView } from './StatusBadgeView';

export function StatusBadge(props: { status: string; className?: string }) {
  const {lang} = useTranslation();
  return <StatusBadgeView {...props} lang={lang} />;
}
