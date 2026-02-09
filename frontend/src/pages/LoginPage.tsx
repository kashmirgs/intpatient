import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir.')
      return
    }

    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 401) {
          setError('Kullanıcı adı veya şifre hatalı.')
        } else {
          setError('Giriş yapılamadı. Lütfen tekrar deneyin.')
        }
      } else {
        setError('Sunucu ile bağlantı kurulamadı.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <svg
            viewBox="0 0 200 32.71"
            style={{ height: '36px', width: 'auto' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#7e79b8"
              d="M19.59.88v16.33c0,3.04-2.02,4.81-5.52,4.81s-5.41-1.77-5.41-4.81v-4.44c0-.15-.06-.29-.15-.39l-1.69-1.83c-.2-.21-.53-.21-.73,0l-1.69,1.83c-.1.11-.15.25-.15.39v4.13c0,5.66,3.78,9.19,9.79,9.19h.18c6.01,0,9.79-3.54,9.79-9.19V.88h-4.42Z"
            />
            <path
              fill="#7e79b8"
              d="M25.97,32.71v-15.95c0-5.69,4.07-9.09,9.23-9.09s9.05,3.64,9.05,9.09-3.68,9.16-8.84,9.16c-2.55,0-4.35-.92-5.2-2.02v8.8h-4.24ZM35.09,11.56c-2.93,0-4.88,1.94-4.88,5.23s1.94,5.23,4.88,5.23,4.91-1.94,4.91-5.23-1.94-5.23-4.91-5.23Z"
            />
            <path
              fill="#7e79b8"
              d="M45.88,32.71v-15.95c0-5.69,4.07-9.09,9.23-9.09s9.05,3.64,9.05,9.09-3.68,9.16-8.84,9.16c-2.55,0-4.35-.92-5.2-2.02v8.8h-4.24ZM55,11.56c-2.93,0-4.88,1.94-4.88,5.23s1.94,5.23,4.88,5.23,4.91-1.94,4.91-5.23-1.94-5.23-4.91-5.23Z"
            />
            <path
              fill="#7e79b8"
              d="M78.73,20.15h4.63c-1.17,3.57-4.31,5.8-8.59,5.8-5.48,0-9.16-3.68-9.16-9.16s3.68-9.09,9.16-9.09,9.12,3.64,9.12,9.09c0,.5-.04.95-.07,1.41h-13.82c.46,2.44,2.23,3.85,4.74,3.85,1.77,0,3.15-.67,4-1.91ZM79.18,14.32c-.74-1.73-2.33-2.72-4.45-2.72s-3.68.99-4.42,2.72h8.87Z"
            />
            <path
              fill="#7e79b8"
              d="M94.28,7.64v3.89c-2.83,0-4.53,1.38-4.53,4.21v9.9h-4.24v-9.9c0-5.37,3.39-8.1,8.77-8.1Z"
            />
            <path
              fill="#7e79b8"
              d="M95.73.88h5.13l7.21,18.85L115.25.88h5.13v24.75h-4.42v-15.17l-5.73,15.03.04.14h-4.42l.04-.14-5.73-15.03v15.17h-4.42V.88Z"
            />
            <path
              fill="#7e79b8"
              d="M124.62.5c1.31,0,2.33,1.06,2.33,2.33,0,1.34-1.03,2.37-2.33,2.37s-2.33-1.03-2.33-2.37c0-1.27,1.03-2.33,2.33-2.33ZM122.5,7.96h4.24v17.68h-4.24V7.96Z"
            />
            <path
              fill="#7e79b8"
              d="M144.95,15.1v10.54h-4.24v-10.43c0-2.51-1.84-3.64-3.89-3.64s-3.89,1.13-3.89,3.64v10.43h-4.24v-10.54c0-3.08,2.3-7.46,8.13-7.46s8.13,4.38,8.13,7.46Z"
            />
            <path
              fill="#7e79b8"
              d="M164.86.5v16.33c0,5.69-4.07,9.09-9.26,9.09s-9.02-3.64-9.02-9.09,3.68-9.16,8.8-9.16c2.55,0,4.38.92,5.23,2.02V.5h4.24ZM155.7,22.03c2.97,0,4.91-1.94,4.91-5.23s-1.94-5.23-4.91-5.23-4.88,1.94-4.88,5.23,1.94,5.23,4.88,5.23Z"
            />
            <path
              fill="#e55fa2"
              d="M181.76.88h4.63l8.49,24.75h-4.63l-2.05-6.54h-8.24l-2.05,6.54h-4.63L181.76.88ZM186.88,15.03l-2.83-8.98-2.83,8.98h5.66Z"
            />
            <path
              fill="#7e79b8"
              d="M195.58.88h4.42v24.75h-4.42V.88Z"
            />
            <circle fill="#7e79b8" cx="167.08" cy="24.05" r="2.22" />
            <path
              fill="#7e79b8"
              d="M10.03,6h.89c.49,0,.74-.58.41-.94L6.86.18c-.22-.24-.61-.24-.83,0L1.56,5.06c-.33.36-.07.94.41.94h.89c.22,0,.44-.09.59-.26l2.63-2.86c.2-.21.53-.21.73,0l2.63,2.86c.15.17.37.26.59.26Z"
            />
            <path
              fill="#e55fa2"
              d="M6.44,4.32c-.19,0-.39.08-.53.23L.19,10.81c-.42.46-.09,1.2.53,1.2h2.32c.2,0,.39-.08.53-.23l2.35-2.57c.14-.16.34-.23.53-.23s.39.08.53.23l2.35,2.57c.14.15.33.23.53.23h2.32c.62,0,.95-.74.53-1.2l-5.72-6.25c-.14-.16-.34-.23-.53-.23Z"
            />
          </svg>
        </div>

        <h1 style={styles.title}>IntPatient</h1>
        <p style={styles.subtitle}>Uluslararası Hasta Portalı</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f5fa 0%, #ebe9f5 100%)',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(126, 121, 184, 0.12)',
    border: '1px solid #e0e0eb',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: 700,
    color: '#2d2d3d',
    marginBottom: '4px',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b6b80',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d2d3d',
  },
  error: {
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
    marginTop: '4px',
  },
}
