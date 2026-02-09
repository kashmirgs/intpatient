import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUploader from '../components/FileUploader'
import apiClient from '../api/client'

type ProcessingStep = 'idle' | 'uploading' | 'done' | 'error'

interface FileTranslation {
  original_filename: string
  translation: {
    original_text: string
    translated_text: string
  }
}

export default function ReportUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [patientNote, setPatientNote] = useState('')
  const [step, setStep] = useState<ProcessingStep>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<FileTranslation[]>([])
  const [_recordId, setRecordId] = useState<number | null>(null)

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setStep('idle')
    setErrorMessage(null)
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (files.length === 0) {
      setErrorMessage('Lütfen en az bir dosya seçin.')
      return
    }

    setErrorMessage(null)
    setResults([])
    setStep('uploading')

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (patientNote.trim()) {
      formData.append('patient_note', patientNote.trim())
    }

    try {
      const response = await apiClient.post('/api/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setRecordId(response.data.id)
      setResults(response.data.files)
      setStep('done')
    } catch (err: unknown) {
      setStep('error')
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setErrorMessage(
          axiosErr.response?.data?.detail || 'İşlem sırasında bir hata oluştu.'
        )
      } else {
        setErrorMessage('Sunucu ile bağlantı kurulamadı.')
      }
    }
  }

  const resetForm = () => {
    setFiles([])
    setPatientNote('')
    setStep('idle')
    setErrorMessage(null)
    setResults([])
    setRecordId(null)
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
            <h1 style={styles.pageTitle}>Rapor Yükle</h1>
          </div>

          <div style={styles.content}>
            <form onSubmit={handleUpload} style={styles.form}>
              <div className="card">
                <div style={styles.field}>
                  <label style={styles.label}>Hasta Notu (İsteğe bağlı)</label>
                  <textarea
                    className="textarea-field"
                    value={patientNote}
                    onChange={(e) => setPatientNote(e.target.value)}
                    placeholder="Hasta ile ilgili ek notlarınızı buraya yazabilirsiniz..."
                    rows={3}
                    disabled={step === 'uploading'}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Dosyalar</label>
                  <FileUploader
                    acceptedTypes={['.jpg', '.jpeg', '.png', '.pdf']}
                    multiple={true}
                    onFilesSelected={handleFilesSelected}
                    maxSizeMB={50}
                  />
                </div>

                {step === 'uploading' && (
                  <div style={styles.processingWrap}>
                    <div style={styles.spinner} />
                    <span style={styles.processingText}>
                      Yükleniyor, OCR ve çeviri işleniyor...
                    </span>
                  </div>
                )}

                {errorMessage && (
                  <div style={styles.error}>{errorMessage}</div>
                )}

                {step === 'idle' || step === 'error' ? (
                  <button
                    type="submit"
                    className="btn btn-accent"
                    style={styles.submitBtn}
                    disabled={files.length === 0}
                  >
                    Yükle ve Çevir
                  </button>
                ) : step === 'done' ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-outline"
                    style={styles.submitBtn}
                  >
                    Yeni Yükleme
                  </button>
                ) : null}
              </div>
            </form>

            {results.length > 0 && (
              <div style={styles.results}>
                {results.map((file, index) => (
                  <div key={index} style={{ marginBottom: '16px' }}>
                    <h3 style={styles.fileName}>{file.original_filename}</h3>
                    {file.translation.original_text && (
                      <div className="card" style={{ marginBottom: '12px' }}>
                        <h4 style={styles.resultTitle}>Orijinal Metin (OCR)</h4>
                        <pre style={styles.resultText}>{file.translation.original_text}</pre>
                      </div>
                    )}
                    {file.translation.translated_text && (
                      <div className="card">
                        <h4 style={styles.resultTitleAccent}>Türkçe Çeviri</h4>
                        <pre style={styles.resultText}>{file.translation.translated_text}</pre>
                      </div>
                    )}
                  </div>
                ))}
                <Link to="/records" style={styles.viewRecordLink}>
                  Kayıtlara Git
                </Link>
              </div>
            )}
          </div>
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
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    maxWidth: '800px',
  },
  form: {},
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d2d3d',
    marginBottom: '6px',
  },
  processingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
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
  processingText: {
    fontSize: '13px',
    color: '#6b6b80',
    fontWeight: 500,
  },
  error: {
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'rgba(244, 67, 54, 0.08)',
    color: '#f44336',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
  },
  results: {
    marginTop: '8px',
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
  viewRecordLink: {
    display: 'inline-block',
    marginTop: '16px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#7e79b8',
  },
}
