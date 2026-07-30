import { useState } from 'react';
import type { Filter } from '../shared/types/api';
import { Modal } from './ModalTemplate';
import styles from './FilterModal.module.css';

type FilterModalProps = {
    isOpen: boolean;
    onClose: () => void;
    filter?: Filter;
    setFilter: (filter: Filter) => void;
};

const PROFILE_LISTS = [[0, 'Избранное'], [1, 'Смотрю'], [2, 'В планах'], [3, 'Просмотрено'], [4, 'Отложено'], [5, 'Брошено']] as const;

export default function FilterModal({ isOpen, onClose, filter = {}, setFilter }: FilterModalProps) {
    const [draft, setDraft] = useState<Filter>(filter);
    const update = <K extends keyof Filter>(key: K, value: Filter[K]) => setDraft(previous => ({ ...previous, [key]: value }));
    const updateNumber = (key: 'start_year' | 'end_year' | 'episodes_from' | 'episodes_to' | 'episode_duration_from' | 'episode_duration_to', value: string) => update(key, value === '' ? undefined : Number(value));
    const toggleProfileList = (id: number) => {
        const current = draft.profile_list_exclusions ?? [];
        update('profile_list_exclusions', current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    };
    const apply = () => {
        const prepared = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0))) as Filter;
        setFilter(prepared);
        onClose();
    };

    return <Modal isOpen={isOpen} onClose={onClose} title="Фильтры" size="large" contentClassName={styles.modal}>
        <div className={styles.fields}>
            <Field label="Страна"><select value={draft.country ?? ''} onChange={event => update('country', (event.target.value || undefined) as Filter['country'])}><option value="">Неважно</option><option value="Япония">Япония</option><option value="Китай">Китай</option><option value="Южная Корея">Южная Корея</option></select></Field>
            <Field label="Категория"><select value={draft.category_id ?? ''} onChange={event => update('category_id', event.target.value === '' ? undefined : Number(event.target.value) as Filter['category_id'])}><option value="">Неважно</option><option value="1">Сериал</option><option value="2">Фильм</option><option value="3">OVA</option><option value="4">Дорама</option></select></Field>
            <Field label="Жанры" hint="Перечисли через запятую. Обычно достаточно 2–3 жанров."><input value={(draft.genres ?? []).join(', ')} onChange={event => update('genres', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} placeholder="Например: экшен, фэнтези" /></Field>
            <label className={styles.checkbox}><input type="checkbox" checked={draft.is_genres_exclude_mode_enabled ?? false} onChange={event => update('is_genres_exclude_mode_enabled', event.target.checked || undefined)} />Исключать указанные жанры</label>
            <Field label="Варианты озвучек" hint="Перечисли через запятую."><input value={(draft.types ?? []).join(', ')} onChange={event => update('types', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} placeholder="Например: Озвучка, Субтитры" /></Field>
            <div className={styles['two-columns']}><Field label="Студия"><input value={draft.studio ?? ''} onChange={event => update('studio', event.target.value || undefined)} placeholder="Неважно" /></Field><Field label="Первоисточник"><input value={draft.source ?? ''} onChange={event => update('source', event.target.value || undefined)} placeholder="Неважно" /></Field></div>
            <fieldset className={styles.fieldset}><legend>Исключить закладки</legend><div className={styles['checkbox-grid']}>
                {PROFILE_LISTS.map(([id, label]) => <label className={styles.checkbox} key={id}><input type="checkbox" checked={(draft.profile_list_exclusions ?? []).includes(id)} onChange={() => toggleProfileList(id)} />{label}</label>)}
            </div></fieldset>
            <div className={styles['two-columns']}><Field label="Годы: от"><input type="number" min="1900" max="2100" value={draft.start_year ?? ''} onChange={event => updateNumber('start_year', event.target.value)} placeholder="Неважно" /></Field><Field label="Годы: до"><input type="number" min="1900" max="2100" value={draft.end_year ?? ''} onChange={event => updateNumber('end_year', event.target.value)} placeholder="Неважно" /></Field></div>
            <div className={styles['two-columns']}><Field label="Эпизодов: от"><input type="number" min="1" value={draft.episodes_from ?? ''} onChange={event => updateNumber('episodes_from', event.target.value)} placeholder="Неважно" /></Field><Field label="Эпизодов: до"><input type="number" min="1" value={draft.episodes_to ?? ''} onChange={event => updateNumber('episodes_to', event.target.value)} placeholder="Неважно" /></Field></div>
            <div className={styles['two-columns']}><Field label="Длительность: от, мин."><input type="number" min="1" value={draft.episode_duration_from ?? ''} onChange={event => updateNumber('episode_duration_from', event.target.value)} placeholder="Неважно" /></Field><Field label="Длительность: до, мин."><input type="number" min="1" value={draft.episode_duration_to ?? ''} onChange={event => updateNumber('episode_duration_to', event.target.value)} placeholder="Неважно" /></Field></div>
            <div className={styles['two-columns']}><Field label="Сезон"><select value={draft.season ?? ''} onChange={event => update('season', event.target.value === '' ? undefined : Number(event.target.value) as Filter['season'])}><option value="">Неважно</option><option value="1">Зима</option><option value="2">Весна</option><option value="3">Лето</option><option value="4">Осень</option></select></Field><Field label="Статус"><select value={draft.status_id ?? ''} onChange={event => update('status_id', event.target.value === '' ? undefined : Number(event.target.value) as Filter['status_id'])}><option value="">Неважно</option><option value="1">Вышел</option><option value="2">Выходит</option><option value="3">Анонс</option></select></Field></div>
            <Field label="Возрастное ограничение"><select value={draft.age_ratings?.[0] ?? ''} onChange={event => update('age_ratings', event.target.value === '' ? [] : [Number(event.target.value)] as Filter['age_ratings'])}><option value="">Неважно</option><option value="1">0+</option><option value="2">6+</option><option value="3">12+</option><option value="4">16+</option><option value="5">18+</option></select></Field>
            <Field label="Сортировка"><select value={draft.sort ?? 0} onChange={event => update('sort', Number(event.target.value) as Filter['sort'])}><option value="0">По дате добавления</option><option value="1">По рейтингу</option><option value="2">По годам</option><option value="3">По популярности</option></select></Field>
        </div>
        <div className={styles.actions}><button type="button" className={styles.reset} onClick={() => setDraft({})}>Сбросить</button><button type="button" className={styles.apply} onClick={apply}>Применить</button></div>
    </Modal>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
