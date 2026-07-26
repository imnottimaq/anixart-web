import { useEffect, useRef, useState } from 'react';
import styles from './SortSelect.module.css';

export type ReleaseSort = 'addedDesc' | 'addedAsc' | 'titleAsc' | 'titleDesc' | 'yearDesc' | 'yearAsc';

const OPTIONS: { value: ReleaseSort; label: string }[] = [
    { value: 'addedDesc', label: 'По дате добавления: сначала новые' },
    { value: 'addedAsc', label: 'По дате добавления: сначала старые' },
    { value: 'titleAsc', label: 'По алфавиту: А → Z' },
    { value: 'titleDesc', label: 'По алфавиту: Z → А' },
    { value: 'yearDesc', label: 'По году выхода релиза: сначала новые' },
    { value: 'yearAsc', label: 'По году выхода релиза: сначала старые' },
];

type SortSelectProps = {
    value: ReleaseSort;
    onChange: (value: ReleaseSort) => void;
};

export default function SortSelect({ value, onChange }: SortSelectProps) {
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
                <span>{selectedOption.label}</span>
                <span className={`${styles.chevron} ${isOpen ? styles['chevron-open'] : ''}`} aria-hidden="true" />
            </button>

            {isOpen && (
                <div className={styles.options} role="listbox" aria-label="Сортировка">
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
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
