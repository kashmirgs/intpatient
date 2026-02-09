import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUploader from '../components/FileUploader'
import apiClient from '../api/client'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export default function RadiologyUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [patientNote, setPatientNote] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (files.length === 0) {
      setErrorMessage('Lütfen en az bir dosya seçin.')
      return
    }

    setStatus('uploading')
    setErrorMessage(null)
    setUploadProgress(0)

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (patientNote.trim()) {
      formData.append('patient_note', patientNote.trim())
    }

    try {
      const response = await apiClient.post('/api/radiology/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setUploadProgress(percent)
          }
        },
      })
      setRecordId(response.data.id)
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setErrorMessage(
          axiosErr.response?.data?.detail || 'Yükleme sırasında bir hata oluştu.'
        )
      } else {
        setErrorMessage('Sunucu ile bağlantı kurulamadı.')
      }
    }
  }

  const resetForm = () => {
    setFiles([])
    setPatientNote('')
    setStatus('idle')
    setErrorMessage(null)
    setRecordId(null)
    setUploadProgress(0)
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
            <h1 style={styles.pageTitle}>Radyoloji Görseli Yükle</h1>
          </div>

          {status === 'success' ? (
            <div style={styles.successCard}>
              <div style={styles.successIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 style={styles.successTitle}>Yükleme Başarılı!</h2>
              <p style={styles.successText}>
                Radyoloji görselleri başarıyla yüklendi.
              </p>
              {recordId && (
                <Link to={`/records`} style={styles.viewLink}>
                  Kayıtlara Git
                </Link>
              )}
              <button
                onClick={resetForm}
                className="btn btn-outline"
                style={{ marginTop: '12px' }}
              >
                Yeni Yükleme
              </button>
            </div>
          ) : (
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
                    disabled={status === 'uploading'}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Dosyalar</label>
                  <FileUploader
                    acceptedTypes={['.jpg', '.jpeg', '.png', '.bmp', '.dcm']}
                    multiple={true}
                    onFilesSelected={handleFilesSelected}
                    maxSizeMB={50}
                  />
                </div>

                {status === 'uploading' && (
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

                {errorMessage && (
                  <div style={styles.error}>{errorMessage}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={styles.submitBtn}
                  disabled={status === 'uploading' || files.length === 0}
                >
                  {status === 'uploading' ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
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
    maxWidth: '640px',
  },
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
  progressWrap: {
    marginBottom: '16px',
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
  successCard: {
    maxWidth: '480px',
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #e0e0eb',
    padding: '40px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  successIcon: {
    marginBottom: '8px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#2d2d3d',
  },
  successText: {
    fontSize: '14px',
    color: '#6b6b80',
  },
  viewLink: {
    display: 'inline-block',
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#7e79b8',
  },
}
