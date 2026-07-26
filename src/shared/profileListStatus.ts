export const profileListStatus = {
    0: null,
    1: { label: 'Смотрю', color: 'watching' },
    2: { label: 'В планах', color: 'plan' },
    3: { label: 'Просмотрено', color: 'completed' },
    4: { label: 'Отложено', color: 'hold' },
    5: { label: 'Брошено', color: 'dropped' },
} as const;