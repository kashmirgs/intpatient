import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Navbar from '../components/Navbar'
import apiClient from '../api/client'

interface RecordDetail {
  id: number
  record_type: string
  patient_note: string | null
  created_at: string
  created_by: string
  files: {
    id: number
    original_filename: string
    file_type: string
    download_url: string
    translations?: {
      id: number
      original_text: string
      translated_text: string
      ocr_duration_ms?: number
      translation_duration_ms?: number
    }[]
  }[]
}

export default function RecordDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const [detail, setDetail] = useState<RecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTexts, setExpandedTexts] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const endpoint = type === 'radiology'
          ? `/api/radiology/records/${id}`
          : `/api/reports/records/${id}`
        const res = await apiClient.get(endpoint)
        setDetail(res.data)
      } catch {
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [type, id])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms?: number) => {
    if (ms == null) return null
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  const handleDownload = async (url: string, filename: string) => {
    const res = await apiClient.get(url, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  const toggleText = (key: string) => {
    setExpandedTexts((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <Navbar />
      <main style={styles.main}>
        <div className="container">
          <Link to="/records" style={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Kayıtlar
          </Link>

          {loading ? (
            <div style={styles.loadingWrap}>
              <p style={styles.loadingText}>Yükleniyor...</p>
            </div>
          ) : !detail ? (
            <div style={styles.loadingWrap}>
              <p style={styles.loadingText}>Kayıt bulunamadı.</p>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span
                  className={`badge ${type === 'radiology' ? 'badge-radiology' : 'badge-report'}`}
                >
                  {type === 'radiology' ? 'Radyoloji' : 'Rapor'}
                </span>
                <span style={styles.date}>{formatDate(detail.created_at)}</span>
              </div>

              {detail.patient_note && (
                <div style={styles.section}>
                  <h4 style={styles.sectionLabel}>Hasta Notu</h4>
                  <p style={styles.sectionText}>{detail.patient_note}</p>
                </div>
              )}

              <div style={styles.section}>
                <h4 style={styles.sectionLabel}>Dosyalar</h4>
                <div style={styles.filesList}>
                  {detail.files.map((file) => (
                    <a
                      key={file.id}
                      onClick={() => handleDownload(file.download_url, file.original_filename)}
                      style={styles.fileLink}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {file.original_filename}
                    </a>
                  ))}
                </div>
              </div>

              {detail.record_type === 'report' &&
                detail.files.map((file) => {
                  const hasTranslations = file.translations && file.translations.length > 0
                  if (!hasTranslations) {
                    return (
                      <div key={file.id} style={styles.section}>
                        <div style={styles.warning}>{file.original_filename}: Bu dosyada metin bulunamadı.</div>
                      </div>
                    )
                  }
                  return file.translations!.map((t) => (
                    <React.Fragment key={t.id}>
                      {t.original_text ? (
                        <>
                          <div style={styles.section}>
                            <h4
                              style={{ ...styles.sectionLabel, color: '#7e79b8', cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => toggleText(`${t.id}-original`)}
                            >
                              <span style={{ marginRight: '6px' }}>{expandedTexts[`${t.id}-original`] ? '▾' : '▸'}</span>
                              Orijinal Metin - {file.original_filename}
                              {formatDuration(t.ocr_duration_ms) && (
                                <span style={styles.durationText}>{formatDuration(t.ocr_duration_ms)}</span>
                              )}
                            </h4>
                            <pre style={{
                              ...styles.preText,
                              maxHeight: expandedTexts[`${t.id}-original`] ? 'none' : '3.2em',
                              overflow: expandedTexts[`${t.id}-original`] ? 'visible' : 'hidden',
                            }}>{t.original_text}</pre>
                          </div>
                          {t.translated_text && (
                            <div style={styles.section}>
                              <h4
                                style={{ ...styles.sectionLabel, color: '#e55fa2', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => toggleText(`${t.id}-translated`)}
                              >
                                <span style={{ marginRight: '6px' }}>{expandedTexts[`${t.id}-translated`] ? '▾' : '▸'}</span>
                                Çeviri - {file.original_filename}
                                {formatDuration(t.translation_duration_ms) && (
                                  <span style={styles.durationText}>{formatDuration(t.translation_duration_ms)}</span>
                                )}
                              </h4>
                              <div style={{
                                ...styles.markdownText,
                                maxHeight: expandedTexts[`${t.id}-translated`] ? 'none' : '3.2em',
                                overflow: expandedTexts[`${t.id}-translated`] ? 'visible' : 'hidden',
                              }}><ReactMarkdown>{t.translated_text}</ReactMarkdown></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={styles.section}>
                          <div style={styles.warning}>{file.original_filename}: Bu dosyada metin bulunamadı.</div>
                        </div>
                      )}
                    </React.Fragment>
                  ))
                })}
            </div>
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
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#7e79b8',
    textDecoration: 'none',
    marginBottom: '20px',
  },
  loadingWrap: {
    padding: '60px 0',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b6b80',
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #e0e0eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e0e0eb',
  },
  date: {
    fontSize: '13px',
    color: '#6b6b80',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#6b6b80',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  sectionText: {
    fontSize: '14px',
    color: '#2d2d3d',
    lineHeight: '1.5',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  fileLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#7e79b8',
    fontWeight: 500,
    padding: '6px 0',
    cursor: 'pointer',
  },
  preText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#2d2d3d',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontFamily: 'inherit',
    margin: 0,
    padding: '12px',
    background: '#fafaff',
    borderRadius: '8px',
    border: '1px solid #e0e0eb',
  },
  markdownText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#2d2d3d',
    wordBreak: 'break-word' as const,
    padding: '12px',
    background: '#fafaff',
    borderRadius: '8px',
    border: '1px solid #e0e0eb',
  },
  warning: {
    padding: '10px 14px',
    background: 'rgba(255, 152, 0, 0.08)',
    color: '#e65100',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  durationText: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#9e9eb0',
    marginLeft: '8px',
    textTransform: 'none' as const,
    letterSpacing: 'normal',
  },
}
