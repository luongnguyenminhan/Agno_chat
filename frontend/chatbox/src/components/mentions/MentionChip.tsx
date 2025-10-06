'use client'

import type { Mention } from '../../types/mention.type'
import { CalendarLtr24Regular, Document24Regular, Folder24Regular } from '@fluentui/react-icons'
import { makeStyles, tokens } from '@fluentui/react-components'

type Props = {
    mention: Mention
}

const useStyles = makeStyles({
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 6px',
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        fontSize: '12px',
        lineHeight: 1.2,
    },
    iconMeeting: { color: '#0078D4' },
    iconFile: { color: '#107C10' },
    iconProject: { color: '#C239B3' },
    name: {
        maxWidth: '18ch',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
})

export default function MentionChip({ mention }: Props) {
    const styles = useStyles()
    const iconClass = mention.type === 'meeting' ? styles.iconMeeting : mention.type === 'file' ? styles.iconFile : styles.iconProject
    const icon = mention.type === 'meeting' ? <CalendarLtr24Regular className={iconClass} /> : mention.type === 'file' ? <Document24Regular className={iconClass} /> : <Folder24Regular className={iconClass} />
    return (
        <span
            className={styles.chip}
            contentEditable={false}
            data-mention-id={mention.id}
            data-mention-type={mention.type}
            data-mention-name={mention.name}
        >
            <span>{icon}</span>
            <span className={styles.name}>{mention.name}</span>
        </span>
    )
}


