import styles from '../pages/SettingsScreen.module.css'

interface ToggleSettingsItem {
    title: string,
    desc?: string,
    checked: boolean,
    disabled?: boolean,
    onChange: (value: boolean) => void
}

export default function ToggleSettingsItem({title, desc, checked, disabled = false, onChange}: ToggleSettingsItem){
    return (
        <div className={styles['settings-item']}>
            <div className={styles['setting-copy']}>
                <h2>{title}</h2>
                <p>{desc}</p>
            </div>
            <label className={styles.switch}>
                <input type="checkbox" disabled={disabled} checked={checked} onChange={e => onChange(e.target.checked)}/>
                <span className={styles.slider}></span>
            </label>
        </div>
    )
}
