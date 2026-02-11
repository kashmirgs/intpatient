import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RecordFilter>('all')

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
              {records.map((record) => (
                <Link
                  key={`${record.record_type}-${record.id}`}
                  to={`/records/${record.record_type}/${record.id}`}
                  style={styles.recordCard}
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
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ))}
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e0e0eb',
    textDecoration: 'none',
    color: 'inherit',
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
}
