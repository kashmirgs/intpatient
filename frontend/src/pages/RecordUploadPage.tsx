import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUploader from '../components/FileUploader'
import apiClient from '../api/client'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface FileTranslation {
  original_filename: string
  translation: {
    original_text: string
    translated_text: string
  }
}

interface SectionResult {
  success: boolean
  error?: string
}

interface RadiologyResult extends SectionResult {
  recordId?: number
}

interface ReportResult extends SectionResult {
  files?: FileTranslation[]
}

export default function RecordUploadPage() {
  const [radiologyFiles, setRadiologyFiles] = useState<File[]>([])
  const [reportFiles, setReportFiles] = useState<File[]>([])
  const [patientNote, setPatientNote] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [radiologyResult, setRadiologyResult] = useState<RadiologyResult | null>(null)
  const [reportResult, setReportResult] = useState<ReportResult | null>(null)

  const handleRadiologyFiles = useCallback((files: File[]) => {
    setRadiologyFiles(files)
    setStatus('idle')
  }, [])

  const handleReportFiles = useCallback((files: File[]) => {
    setReportFiles(files)
    setStatus('idle')
  }, [])

  const extractError = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      return axiosErr.response?.data?.detail || 'İşlem sırasında bir hata oluştu.'
    }
    return 'Sunucu ile bağlantı kurulamadı.'
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (radiologyFiles.length === 0 && reportFiles.length === 0) return

    setStatus('uploading')
    setRadiologyResult(null)
    setReportResult(null)
    setUploadProgress(0)

    const promises: Promise<void>[] = []

    if (radiologyFiles.length > 0) {
      const formData = new FormData()
      radiologyFiles.forEach((file) => formData.append('files', file))
      if (patientNote.trim()) formData.append('patient_note', patientNote.trim())

      promises.push(
        apiClient
          .post('/api/radiology/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(
                  Math.round((progressEvent.loaded * 100) / progressEvent.total)
                )
              }
            },
          })
          .then((res) => {
            setRadiologyResult({ success: true, recordId: res.data.id })
          })
          .catch((err) => {
            setRadiologyResult({ success: false, error: extractError(err) })
          })
      )
    }

    if (reportFiles.length > 0) {
      const formData = new FormData()
      reportFiles.forEach((file) => formData.append('files', file))
      if (patientNote.trim()) formData.append('patient_note', patientNote.trim())

      promises.push(
        apiClient
          .post('/api/reports/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then((res) => {
            setReportResult({ success: true, files: res.data.files })
          })
          .catch((err) => {
            setReportResult({ success: false, error: extractError(err) })
          })
      )
    }

    await Promise.all(promises)
    setStatus('success')
  }

  const hasAnyError =
    (radiologyResult && !radiologyResult.success) ||
    (reportResult && !reportResult.success)

  const resetForm = () => {
    setRadiologyFiles([])
    setReportFiles([])
    setPatientNote('')
    setStatus('idle')
    setUploadProgress(0)
    setRadiologyResult(null)
    setReportResult(null)
  }

  return (
    <div>
      <Navbar />
      <main style={styles.main}>
        <div className="container">
          <div style={styles.pageHeader}>
            <Link to="/" style={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Ana Sayfa
            </Link>
            <h1 style={styles.pageTitle}>Kayıt Ekle</h1>
          </div>

          {status === 'success' ? (
            <div style={styles.resultsContainer}>
              {radiologyResult && (
                <div className="card" style={styles.resultCard}>
                  <h3 style={styles.sectionTitle}>Radyoloji Görselleri</h3>
                  {radiologyResult.success ? (
                    <div style={styles.successRow}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span style={styles.successText}>
                        Radyoloji görselleri başarıyla yüklendi.
                      </span>
                    </div>
                  ) : (
                    <div style={styles.error}>{radiologyResult.error}</div>
                  )}
                </div>
              )}

              {reportResult && (
                <div style={styles.resultCard}>
                  <h3 style={styles.sectionTitle}>Raporlar</h3>
                  {reportResult.success && reportResult.files ? (
                    <div>
                      {reportResult.files.every((f) =>
                        !f.translation.original_text.startsWith('[OCR error:') &&
                        !f.translation.translated_text.startsWith('[Translation error:')
                      ) ? (
                        <div style={styles.successRow}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <span style={styles.successText}>
                            Raporlar başarıyla işlendi.
                          </span>
                        </div>
                      ) : (
                        <div style={styles.warning}>
                          Bazı dosyalarda işlem hatası oluştu.
                        </div>
                      )}
                      {reportResult.files.map((file, index) => {
                        const ocrFailed = file.translation.original_text.startsWith('[OCR error:')
                        const translationFailed = file.translation.translated_text.startsWith('[Translation error:')
                        return (
                          <div key={index} style={{ marginTop: '16px' }}>
                            <h4 style={styles.fileName}>{file.original_filename}</h4>
                            {ocrFailed ? (
                              <div style={styles.error}>
                                OCR hatası: Metin çıkarılamadı. Lütfen dosyayı kontrol edip tekrar deneyin.
                              </div>
                            ) : (
                              <>
                                {file.translation.original_text && (
                                  <div className="card" style={{ marginBottom: '12px' }}>
                                    <h4 style={styles.resultTitle}>Orijinal Metin (OCR)</h4>
                                    <pre style={styles.resultText}>{file.translation.original_text}</pre>
                                  </div>
                                )}
                                {translationFailed ? (
                                  <div style={styles.error}>
                                    Çeviri hatası: Çeviri yapılamadı.
                                  </div>
                                ) : file.translation.translated_text && (
                                  <div className="card">
                                    <h4 style={styles.resultTitleAccent}>Türkçe Çeviri</h4>
                                    <pre style={styles.resultText}>{file.translation.translated_text}</pre>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : reportResult.error ? (
                    <div style={styles.error}>{reportResult.error}</div>
                  ) : null}
                </div>
              )}

              <div style={styles.resultActions}>
                <Link to="/records" className="btn btn-primary" style={styles.actionBtn}>
                  Kayıtlara Git
                </Link>
                <button onClick={resetForm} className="btn btn-outline" style={styles.actionBtn}>
                  Yeni Yükleme
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} style={styles.form}>
              <div className="card" style={styles.noteCard}>
                <div style={styles.field}>
                  <label style={styles.label}>Hasta Notu (İsteğe bağlı)</label>
                  <textarea
                    className="textarea-field"
                    value={patientNote}
                    onChange={(e) => setPatientNote(e.target.value)}
                    placeholder="Hasta ile ilgili ek notlarınızı buraya yazabilirsiniz..."
                    rows={3}
                    disabled={status === 'uploading'}
                  />
                </div>
              </div>

              <div className="card" style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Radyoloji Görselleri
                </h2>
                <FileUploader
                  acceptedTypes={['.jpg', '.jpeg', '.png', '.bmp', '.dcm']}
                  multiple={true}
                  onFilesSelected={handleRadiologyFiles}
                  maxSizeMB={50}
                />
                {status === 'uploading' && radiologyFiles.length > 0 && (
                  <div style={styles.progressWrap}>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${uploadProgress}%`,
                        }}
                      />
                    </div>
                    <span style={styles.progressText}>
                      Yükleniyor... %{uploadProgress}
                    </span>
                  </div>
                )}
              </div>

              <div className="card" style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e55fa2" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Raporlar
                </h2>
                <FileUploader
                  acceptedTypes={['.jpg', '.jpeg', '.png', '.pdf']}
                  multiple={true}
                  onFilesSelected={handleReportFiles}
                  maxSizeMB={50}
                />
                {status === 'uploading' && reportFiles.length > 0 && (
                  <div style={styles.processingWrap}>
                    <div style={styles.spinner} />
                    <span style={styles.processingLabel}>
                      OCR ve çeviri işleniyor...
                    </span>
                  </div>
                )}
              </div>

              {hasAnyError && (
                <div style={styles.error}>Yükleme sırasında bir hata oluştu.</div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={styles.submitBtn}
                disabled={
                  status === 'uploading' ||
                  (radiologyFiles.length === 0 && reportFiles.length === 0)
                }
              >
                {status === 'uploading' ? 'Yükleniyor...' : 'Yükle'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    padding: '32px 0',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6b6b80',
    marginBottom: '8px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2d2d3d',
  },
  form: {
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  noteCard: {
    marginBottom: 0,
  },
  sectionCard: {
    marginBottom: 0,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#2d2d3d',
    marginBottom: '16px',
  },
  field: {
    marginBottom: 0,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d2d3d',
    marginBottom: '6px',
  },
  progressWrap: {
    marginTop: '16px',
  },
  progressBar: {
    height: '6px',
    background: '#e0e0eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    background: '#7e79b8',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '12px',
    color: '#6b6b80',
  },
  processingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
    padding: '16px',
    background: '#fafaff',
    borderRadius: '8px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #e0e0eb',
    borderTop: '3px solid #7e79b8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  processingLabel: {
    fontSize: '13px',
    color: '#6b6b80',
    fontWeight: 500,
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(244, 67, 54, 0.08)',
    color: '#f44336',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  warning: {
    padding: '10px 14px',
    background: 'rgba(255, 152, 0, 0.08)',
    color: '#e65100',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
  },
  resultsContainer: {
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  resultCard: {
    marginBottom: 0,
  },
  successRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  successText: {
    fontSize: '14px',
    color: '#2d2d3d',
    fontWeight: 500,
  },
  fileName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#2d2d3d',
    marginBottom: '8px',
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#7e79b8',
    marginBottom: '12px',
  },
  resultTitleAccent: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#e55fa2',
    marginBottom: '12px',
  },
  resultText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#2d2d3d',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    margin: 0,
  },
  resultActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  actionBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    textDecoration: 'none',
    textAlign: 'center',
  },
}
