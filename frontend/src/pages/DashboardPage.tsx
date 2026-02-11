import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../api/client'

interface RecentRecord {
  id: number
  record_type: string
  patient_note: string | null
  created_at: string
  file_count: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const [radRes, repRes] = await Promise.all([
          apiClient.get('/api/radiology/records'),
          apiClient.get('/api/reports/records'),
        ])
        const all = [
          ...radRes.data.map((r: RecentRecord) => ({ ...r, record_type: 'radiology' })),
          ...repRes.data.map((r: RecentRecord) => ({ ...r, record_type: 'report' })),
        ]
        all.sort((a: RecentRecord, b: RecentRecord) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setRecentRecords(all.slice(0, 5))
      } catch {
        // Records will just be empty
      }
    }
    fetchRecords()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      <Navbar />
      <main style={styles.main}>
        <div className="container">
          <h1 style={styles.welcome}>
            Hoş geldiniz, {user?.full_name || user?.username}
          </h1>

          <div style={styles.actionCards}>
            <Link to="/upload" style={styles.actionCard}>
              <div style={styles.actionIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h2 style={styles.actionTitle}>Kayıt Ekle</h2>
              <p style={styles.actionDesc}>
                Radyoloji görselleri ve hasta raporlarını yükleyin
              </p>
              <span style={styles.actionArrow}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7e79b8" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>

          <div style={styles.recentSection}>
            <div style={styles.recentHeader}>
              <h2 style={styles.recentTitle}>Son Kayıtlar</h2>
              <Link to="/records" style={styles.viewAll}>
                Tümünü Gör
              </Link>
            </div>

            {recentRecords.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>
                  Henüz kayıt bulunmuyor. Kayıt ekleyerek başlayabilirsiniz.
                </p>
              </div>
            ) : (
              <div style={styles.recordsList}>
                {recentRecords.map((record) => (
                  <div key={`${record.record_type}-${record.id}`} style={styles.recordItem}>
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
                      <span style={styles.recordFiles}>
                        {record.file_count} dosya
                      </span>
                      <span style={styles.recordDate}>
                        {formatDate(record.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
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
  welcome: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2d2d3d',
    marginBottom: '28px',
  },
  actionCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  actionCard: {
    background: '#fff',
    borderRadius: '14px',
    padding: '28px 24px',
    border: '1px solid #e0e0eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative' as const,
    textDecoration: 'none',
    color: 'inherit',
  },
  actionIcon: {
    marginBottom: '4px',
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d2d3d',
  },
  actionDesc: {
    fontSize: '14px',
    color: '#6b6b80',
    lineHeight: '1.5',
  },
  actionArrow: {
    position: 'absolute' as const,
    top: '28px',
    right: '24px',
  },
  recentSection: {
    background: '#fff',
    borderRadius: '14px',
    border: '1px solid #e0e0eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0eb',
  },
  recentTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#2d2d3d',
  },
  viewAll: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#7e79b8',
    textDecoration: 'none',
  },
  emptyState: {
    padding: '40px 24px',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b6b80',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid #f0f0f5',
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
  recordFiles: {
    fontSize: '13px',
    color: '#6b6b80',
  },
  recordDate: {
    fontSize: '13px',
    color: '#6b6b80',
  },
}
