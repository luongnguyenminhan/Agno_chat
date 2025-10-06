'use client'

import type { MentionSearchItem } from '../../types/mention.type'
import { CalendarLtr24Regular, Document24Regular, Folder24Regular } from '@fluentui/react-icons'
import { makeStyles, tokens } from '@fluentui/react-components'

type Props = {
    open: boolean
    position: { left: number; top: number } | null
    items: MentionSearchItem[]
    focusedIndex: number
    onSelect: (item: MentionSearchItem) => void
    onMove: (dir: 'up' | 'down') => void
    onClose: () => void
    labels: {
        loading?: string
        noResults?: string
        searchPlaceholder?: string
    }
}

const useStyles = makeStyles({
    surface: {
        position: 'fixed',
        zIndex: 1000,
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusSmall,
        boxShadow: tokens.shadow16,
        width: '300px',
        maxWidth: '90vw',
    },
    list: { maxHeight: '260px', overflow: 'auto' },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        cursor: 'pointer',
        fontSize: '12.5px',
    },
    focused: { backgroundColor: tokens.colorNeutralBackground3Hover },
    iconMeeting: { color: '#0078D4' },
    iconFile: { color: '#107C10' },
    iconProject: { color: '#C239B3' },
    name: { color: tokens.colorNeutralForeground1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    empty: { padding: '8px 12px', color: tokens.colorNeutralForeground3, fontSize: '12px' },
})

export default function MentionSuggestions({ open, position, items, focusedIndex, onSelect, labels }: Props) {
    const styles = useStyles()
    if (!open || !position) return null
    return (
        <div
            className={styles.surface}
            style={{ left: Math.max(8, position.left), bottom: Math.max(8, window.innerHeight - position.top) }}
            role="listbox"
        >
            <div className={styles.list}>
                {items.length === 0 ? (
                    <div className={styles.empty}>{labels.noResults || 'No results'}</div>
                ) : (
                    items.map((it, idx) => {
                        const iconClass = it.type === 'meeting' ? styles.iconMeeting : it.type === 'file' ? styles.iconFile : styles.iconProject
                        const icon = it.type === 'meeting' ? <CalendarLtr24Regular className={iconClass} /> : it.type === 'file' ? <Document24Regular className={iconClass} /> : <Folder24Regular className={iconClass} />
                        const focused = idx === focusedIndex
                        return (
                            <div
                                key={`${it.type}-${it.id}`}
                                className={`${styles.item} ${focused ? styles.focused : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    onSelect(it)
                                }}
                                role="option"
                                aria-selected={focused}
                                tabIndex={-1}
                            >
                                <span>{icon}</span>
                                <div className={styles.name}>{it.name}</div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}


