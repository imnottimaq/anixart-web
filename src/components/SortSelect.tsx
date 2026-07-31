import { useEffect, useRef, useState } from 'react';
import styles from './SortSelect.module.css';
import { useTranslation } from '../shared/useTranslation';

export type ReleaseSort = 'addedDesc' | 'addedAsc' | 'titleAsc' | 'titleDesc' | 'yearDesc' | 'yearAsc';

const OPTIONS: { value: ReleaseSort; label: 'sort.dateAddedNewFirst' | 'sort.dateAddedOldFirst' | 'sort.fromAtoZ' | 'sort.fromZtoA' | 'sort.releaseDateNewFirst' | 'sort.releaseDateOldFirst' }[] = [
    { value: 'addedDesc', label: 'sort.dateAddedNewFirst' }, { value: 'addedAsc', label: 'sort.dateAddedOldFirst' }, { value: 'titleAsc', label: 'sort.fromAtoZ' }, { value: 'titleDesc', label: 'sort.fromZtoA' }, { value: 'yearDesc', label: 'sort.releaseDateNewFirst' }, { value: 'yearAsc', label: 'sort.releaseDateOldFirst' },
];

type SortSelectProps = {
    value: ReleaseSort;
    onChange: (value: ReleaseSort) => void;
};

export default function SortSelect({ value, onChange }: SortSelectProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const selectedOption = OPTIONS.find(option => option.value === value) ?? OPTIONS[0];

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!selectRef.current?.contains(event.target as Node)) setIsOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, []);

    return (
        <div className={styles.select} ref={selectRef}>
            <button
                type="button"
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={() => setIsOpen(previous => !previous)}
            >
                <span>{t(selectedOption.label)}</span>
                <span className={`${styles.chevron} ${isOpen ? styles['chevron-open'] : ''}`} aria-hidden="true" />
            </button>

            {isOpen && (
                <div className={styles.options} role="listbox" aria-label={t('filter.sort')}>
                    {OPTIONS.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            className={`${styles.option} ${option.value === value ? styles.selected : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {t(option.label)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
