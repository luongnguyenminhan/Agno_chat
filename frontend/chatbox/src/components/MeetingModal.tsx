import React, { useState } from 'react';
import {
    makeStyles,
    tokens,
    Button,
    Input,
    Text,
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogBody,
    Textarea,
} from '@fluentui/react-components';
import { CubeMultiple24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
    modal: {
        maxWidth: '600px',
        width: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    formGroup: {
        marginBottom: tokens.spacingVerticalL,
    },
    formLabel: {
        display: 'block',
        marginBottom: tokens.spacingVerticalXXS,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase300,
    },
    inputWithButton: {
        display: 'flex',
        gap: tokens.spacingHorizontalXS,
        alignItems: 'stretch',
    },
    generateUuidBtn: {
        backgroundColor: tokens.colorNeutralBackground3,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        color: tokens.colorNeutralForeground1,
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: 'pointer',
        transition: `all ${tokens.durationNormal}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground4,
        },
    },
    fileUploadArea: {
        border: `2px dashed ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalXL,
        textAlign: 'center',
        transition: `border-color ${tokens.durationNormal}`,
        cursor: 'pointer',
    },
    fileUploadAreaHover: {
        // borderColor: '#0366d6',
    },
    fileUploadAreaDragOver: {
        // borderColor: '#0366d6',
        backgroundColor: tokens.colorBrandBackground2,
    },
    uploadIcon: {
        fontSize: tokens.fontSizeBase600,
        marginBottom: tokens.spacingVerticalXS,
        display: 'block',
    },
    fileName: {
        marginTop: tokens.spacingVerticalXS,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
    },
    indexStatus: {
        textAlign: 'center',
        minHeight: '20px',
        fontSize: tokens.fontSizeBase300,
    },
    indexStatusSuccess: {
        color: tokens.colorStatusSuccessForeground1,
    },
    indexStatusError: {
        color: tokens.colorStatusDangerForeground1,
    },
    indexStatusInfo: {
        color: tokens.colorBrandForeground1,
    },
});

interface MeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose }) => {
    const styles = useStyles();
    const [meetingId, setMeetingId] = useState('');
    const [transcript, setTranscript] = useState('');
    const [notesFile, setNotesFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [indexStatus, setIndexStatus] = useState('');

    const generateMeetingUuid = () => {
        const uuid = 'meeting-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        setMeetingId(uuid);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setNotesFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setNotesFile(files[0]);
        }
    };

    const handleSubmit = () => {
        // TODO: Implement meeting indexing logic
        setIndexStatus('Indexing meeting content...');
        setTimeout(() => {
            setIndexStatus('Meeting indexed successfully!');
            setTimeout(() => {
                onClose();
                setMeetingId('');
                setTranscript('');
                setNotesFile(null);
                setIndexStatus('');
            }, 2000);
        }, 2000);
    };

    const handleCancel = () => {
        setMeetingId('');
        setTranscript('');
        setNotesFile(null);
        setIndexStatus('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface className={styles.modal}>
                <DialogBody>
                    <DialogTitle>Index Meeting Content</DialogTitle>
                    <DialogContent>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="meeting-id">Meeting ID:</label>
                            <div className={styles.inputWithButton}>
                                <Input
                                    id="meeting-id"
                                    value={meetingId}
                                    onChange={(_, data) => setMeetingId(data.value)}
                                    placeholder="Enter meeting ID (e.g., meeting-123)"
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.generateUuidBtn}
                                    onClick={generateMeetingUuid}
                                    title="Generate Random UUID"
                                >
                                    <CubeMultiple24Regular />
                                </button>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="meeting-transcript">Meeting Transcript:</label>
                            <Textarea
                                id="meeting-transcript"
                                value={transcript}
                                onChange={(_, data) => setTranscript(data.value)}
                                placeholder="Paste the meeting transcript here..."
                                rows={6}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Meeting Notes File:</label>
                            <div
                                className={`${styles.fileUploadArea} ${isDragOver ? styles.fileUploadAreaDragOver : ''}`}
                                onDrop={handleFileDrop}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onClick={() => document.getElementById('notes-file')?.click()}
                            >
                                <span className={styles.uploadIcon}>📎</span>
                                <Text>Click to select or drag and drop a file</Text>
                                <input
                                    id="notes-file"
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept=".txt,.pdf,.doc,.docx"
                                />
                                {notesFile && (
                                    <div className={styles.fileName}>{notesFile.name}</div>
                                )}
                            </div>
                        </div>

                        <div className={styles.indexStatus}>
                            {indexStatus && (
                                <Text className={
                                    indexStatus.includes('successfully')
                                        ? styles.indexStatusSuccess
                                        : indexStatus.includes('error')
                                            ? styles.indexStatusError
                                            : styles.indexStatusInfo
                                }>
                                    {indexStatus}
                                </Text>
                            )}
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button appearance="primary" onClick={handleSubmit} disabled={!meetingId}>
                            Index Meeting
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};