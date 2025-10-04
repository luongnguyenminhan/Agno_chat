/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { apiService } from '../services/api';
import { useUser } from '../hooks/useUser';
import type { UserContextType } from '../contexts/userContext.types';

const useStyles = makeStyles({
    modal: {
        maxWidth: '700px',
        width: '95vw',
        minWidth: '400px',
        maxHeight: '85vh',
        overflowY: 'auto',
    },
    modalMobile: {
        width: '100vw',
        height: '100vh',
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: '0',
    },
    formGroup: {
        marginBottom: tokens.spacingVerticalXL,
    },
    formLabel: {
        display: 'block',
        marginBottom: tokens.spacingVerticalS,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase300,
    },
    inputWithButton: {
        display: 'flex',
        gap: tokens.spacingHorizontalS,
        alignItems: 'stretch',
        width: '100%',
    },
    inputFlex: {
        flex: 1,
    },
    generateUuidBtn: {
        backgroundColor: tokens.colorNeutralBackground3,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        color: tokens.colorNeutralForeground1,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusMedium,
        cursor: 'pointer',
        transition: `all ${tokens.durationNormal}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
        flexShrink: 0,
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground4,
        },
    },
    fileUploadArea: {
        border: `2px dashed ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalXXL,
        textAlign: 'center',
        transition: `border-color ${tokens.durationNormal}`,
        cursor: 'pointer',
        position: 'relative',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacingVerticalS,
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
        marginBottom: tokens.spacingVerticalXXS,
        display: 'block',
    },
    fileName: {
        marginTop: tokens.spacingVerticalS,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeBase200,
    },
    indexStatus: {
        textAlign: 'center',
        minHeight: '24px',
        fontSize: tokens.fontSizeBase300,
        marginTop: tokens.spacingVerticalM,
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorNeutralBackground2,
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
    dialogActions: {
        paddingTop: tokens.spacingVerticalL,
        gap: tokens.spacingHorizontalM,
        justifyContent: 'flex-end',
    },
});

interface MeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose }) => {
    const styles = useStyles();
    const { userId }: UserContextType = useUser();
    const [meetingId, setMeetingId] = useState('');
    const [transcript, setTranscript] = useState('');
    const [notesFile, setNotesFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [indexStatus, setIndexStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const generateMeetingUuid = () => {
        const uuid = apiService.generateUUID();
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

    const handleSubmit = async () => {
        if (!meetingId.trim()) {
            setIndexStatus('Please enter a meeting ID');
            return;
        }

        if (!transcript.trim() && !notesFile) {
            setIndexStatus('Please provide either transcript or meeting notes file');
            return;
        }

        setIsSubmitting(true);
        setIndexStatus('Indexing meeting content...');

        try {
            const response = await apiService.indexMeeting({
                meeting_id: meetingId.trim(),
                transcript: transcript.trim() || undefined,
                meeting_note_file: notesFile || undefined,
                current_user_id: userId,
            });

            if (response.success) {
                setIndexStatus(`Successfully indexed meeting: ${response.data?.processed_items?.join(', ')}`);
                setTimeout(() => {
                    onClose();
                    // Reset form
                    setMeetingId('');
                    setTranscript('');
                    setNotesFile(null);
                    setIndexStatus('');
                }, 2000);
            } else {
                throw new Error(response.message || 'Failed to index meeting');
            }
        } catch (error: any) {
            console.error('Error indexing meeting:', error);
            setIndexStatus(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setMeetingId('');
        setTranscript('');
        setNotesFile(null);
        setIndexStatus('');
        onClose();
    };

    const modalClasses = [
        styles.modal,
        isMobile && styles.modalMobile,
    ].filter(Boolean).join(' ');

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface className={modalClasses}>
                <DialogBody>
                    <DialogTitle>Index Meeting Content</DialogTitle>
                    <DialogContent>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="meeting-id">Meeting ID:</label>
                            <div className={styles.inputWithButton}>
                                <Input
                                    className={styles.inputFlex}
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
                                rows={8}
                                resize="vertical"
                                style={{ width: '100%' }}
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
                                <Text style={{ fontSize: tokens.fontSizeBase200, opacity: 0.7 }}>
                                    Supports: .txt, .pdf, .doc, .docx
                                </Text>
                                <input
                                    id="notes-file"
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept=".txt,.pdf,.doc,.docx"
                                />
                                {notesFile && (
                                    <div className={styles.fileName}>
                                        Selected: {notesFile.name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {indexStatus && (
                            <div className={styles.indexStatus}>
                                <Text className={
                                    indexStatus.includes('successfully')
                                        ? styles.indexStatusSuccess
                                        : indexStatus.includes('error') || indexStatus.includes('Error')
                                            ? styles.indexStatusError
                                            : styles.indexStatusInfo
                                }>
                                    {indexStatus}
                                </Text>
                            </div>
                        )}
                    </DialogContent>
                    <DialogActions className={styles.dialogActions}>
                        <Button appearance="secondary" onClick={handleCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button appearance="primary" onClick={handleSubmit} disabled={!meetingId || isSubmitting}>
                            {isSubmitting ? 'Indexing...' : 'Index Meeting'}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};