import { useTranslation } from '../../../i18n/translations';
import { DateFilterDropdownView, type DateFilterDropdownProps } from './DateFilterDropdownView';

export function DateFilterDropdown(props: DateFilterDropdownProps) {
  const {lang, t} = useTranslation();
  return <DateFilterDropdownView {...props} lang={lang} t={key => t(key as Parameters<typeof t>[0])} />;
}
