import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import Navbar from '../components/Navbar'
import apiClient from '../api/client'

type RecordFilter = 'all' | 'radiology' | 'report'

interface RecordItem {
  id: number
  record_type: string
  patient_note: string | null
  created_at: string
  created_by: string
  file_count: number
  translation_preview?: string
}

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

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail] = useState<RecordDetail | null>(null)

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true)
      try {
        const results: RecordItem[] = []

        if (filter === 'all' || filter === 'radiology') {
          const res = await apiClient.get('/api/radiology/records')
          results.push(
            ...res.data.map((r: RecordItem) => ({ ...r, record_type: 'radiology' }))
          )
        }
        if (filter === 'all' || filter === 'report') {
          const res = await apiClient.get('/api/reports/records')
          results.push(
            ...res.data.map((r: RecordItem) => ({ ...r, record_type: 'report' }))
          )
        }

        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRecords(results)
      } catch {
        // Silently handle error
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [filter])

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

  const toggleExpand = async (record: RecordItem) => {
    const key = `${record.record_type}-${record.id}`
    if (expandedId === key) {
      setExpandedId(null)
      setExpandedDetail(null)
      return
    }

    setExpandedId(key)
    try {
      const endpoint = record.record_type === 'radiology'
        ? `/api/radiology/records/${record.id}`
        : `/api/reports/records/${record.id}`
      const res = await apiClient.get(endpoint)
      setExpandedDetail(res.data)
    } catch {
      setExpandedDetail(null)
    }
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

  const filters: { key: RecordFilter; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'radiology', label: 'Radyoloji' },
    { key: 'report', label: 'Raporlar' },
  ]

  return (
    <div>
      <Navbar />
      <main style={styles.main}>
        <div className="container">
          <h1 style={styles.pageTitle}>Kayıtlar</h1>

          <div style={styles.filters}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f.key ? styles.filterBtnActive : {}),
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={styles.loadingWrap}>
              <p style={styles.loadingText}>Yükleniyor...</p>
            </div>
          ) : records.length === 0 ? (
            <div style={styles.emptyWrap}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d0e0" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={styles.emptyText}>
                {filter === 'all'
                  ? 'Henüz kayıt bulunmuyor.'
                  : filter === 'radiology'
                    ? 'Henüz radyoloji kaydı bulunmuyor.'
                    : 'Henüz rapor kaydı bulunmuyor.'}
              </p>
            </div>
          ) : (
            <div style={styles.recordsList}>
              {records.map((record) => {
                const key = `${record.record_type}-${record.id}`
                const isExpanded = expandedId === key
                return (
                  <div key={key} style={styles.recordCard}>
                    <div
                      style={styles.recordHeader}
                      onClick={() => toggleExpand(record)}
                    >
                      <div style={styles.recordLeft}>
                        <span
                          className={`badge ${record.record_type === 'radiology' ? 'badge-radiology' : 'badge-report'}`}
                        >
                          {record.record_type === 'radiology' ? 'Radyoloji' : 'Rapor'}
                        </span>
                        <span style={styles.recordNote}>
                          {record.patient_note || 'Not yok'}
                        </span>
                      </div>
                      <div style={styles.recordRight}>
                        <span style={styles.recordMeta}>
                          {record.file_count} dosya
                        </span>
                        <span style={styles.recordMeta}>
                          {formatDate(record.created_at)}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6b6b80"
                          strokeWidth="2"
                          style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && expandedDetail && (
                      <div style={styles.recordBody}>
                        {expandedDetail.patient_note && (
                          <div style={styles.detailSection}>
                            <h4 style={styles.detailLabel}>Hasta Notu</h4>
                            <p style={styles.detailText}>{expandedDetail.patient_note}</p>
                          </div>
                        )}

                        <div style={styles.detailSection}>
                          <h4 style={styles.detailLabel}>Dosyalar</h4>
                          <div style={styles.filesList}>
                            {expandedDetail.files.map((file) => (
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

                        {expandedDetail.record_type === 'report' &&
                          expandedDetail.files.map((file) =>
                            file.translations?.map((t) => (
                              <React.Fragment key={t.id}>
                                {t.original_text && (
                                  <div style={styles.detailSection}>
                                    <h4 style={{ ...styles.detailLabel, color: '#7e79b8' }}>
                                      Orijinal Metin - {file.original_filename}
                                      {formatDuration(t.ocr_duration_ms) && (
                                        <span style={styles.durationText}>{formatDuration(t.ocr_duration_ms)}</span>
                                      )}
                                    </h4>
                                    <pre style={styles.preText}>{t.original_text}</pre>
                                  </div>
                                )}
                                {t.translated_text && (
                                  <div style={styles.detailSection}>
                                    <h4 style={{ ...styles.detailLabel, color: '#e55fa2' }}>
                                      Türkçe Çeviri - {file.original_filename}
                                      {formatDuration(t.translation_duration_ms) && (
                                        <span style={styles.durationText}>{formatDuration(t.translation_duration_ms)}</span>
                                      )}
                                    </h4>
                                    <div style={styles.markdownText}><ReactMarkdown>{t.translated_text}</ReactMarkdown></div>
                                  </div>
                                )}
                              </React.Fragment>
                            ))
                          )}
                      </div>
                    )}
                  </div>
                )
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
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2d2d3d',
    marginBottom: '20px',
  },
  filters: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: '#fff',
    borderRadius: '10px',
    padding: '4px',
    border: '1px solid #e0e0eb',
    width: 'fit-content',
  },
  filterBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    background: 'transparent',
    color: '#6b6b80',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    background: '#7e79b8',
    color: '#fff',
  },
  loadingWrap: {
    padding: '60px 0',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b6b80',
  },
  emptyWrap: {
    padding: '60px 0',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b6b80',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  recordCard: {
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e0e0eb',
    overflow: 'hidden',
  },
  recordHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  recordLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  recordNote: {
    fontSize: '14px',
    color: '#2d2d3d',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  recordRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  recordMeta: {
    fontSize: '13px',
    color: '#6b6b80',
  },
  recordBody: {
    borderTop: '1px solid #e0e0eb',
    padding: '20px',
    background: '#fafaff',
  },
  detailSection: {
    marginBottom: '16px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#6b6b80',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  detailText: {
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
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0eb',
  },
  markdownText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#2d2d3d',
    wordBreak: 'break-word' as const,
    padding: '12px',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0eb',
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
