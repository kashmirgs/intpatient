import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.left}>
          <Link to="/" style={styles.brand}>
            <svg
              viewBox="0 0 200 32.71"
              style={{ height: '28px', width: 'auto' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#fff"
                d="M19.59.88v16.33c0,3.04-2.02,4.81-5.52,4.81s-5.41-1.77-5.41-4.81v-4.44c0-.15-.06-.29-.15-.39l-1.69-1.83c-.2-.21-.53-.21-.73,0l-1.69,1.83c-.1.11-.15.25-.15.39v4.13c0,5.66,3.78,9.19,9.79,9.19h.18c6.01,0,9.79-3.54,9.79-9.19V.88h-4.42Z"
              />
              <path
                fill="#fff"
                d="M25.97,32.71v-15.95c0-5.69,4.07-9.09,9.23-9.09s9.05,3.64,9.05,9.09-3.68,9.16-8.84,9.16c-2.55,0-4.35-.92-5.2-2.02v8.8h-4.24ZM35.09,11.56c-2.93,0-4.88,1.94-4.88,5.23s1.94,5.23,4.88,5.23,4.91-1.94,4.91-5.23-1.94-5.23-4.91-5.23Z"
              />
              <path
                fill="#fff"
                d="M45.88,32.71v-15.95c0-5.69,4.07-9.09,9.23-9.09s9.05,3.64,9.05,9.09-3.68,9.16-8.84,9.16c-2.55,0-4.35-.92-5.2-2.02v8.8h-4.24ZM55,11.56c-2.93,0-4.88,1.94-4.88,5.23s1.94,5.23,4.88,5.23,4.91-1.94,4.91-5.23-1.94-5.23-4.91-5.23Z"
              />
              <path
                fill="#fff"
                d="M78.73,20.15h4.63c-1.17,3.57-4.31,5.8-8.59,5.8-5.48,0-9.16-3.68-9.16-9.16s3.68-9.09,9.16-9.09,9.12,3.64,9.12,9.09c0,.5-.04.95-.07,1.41h-13.82c.46,2.44,2.23,3.85,4.74,3.85,1.77,0,3.15-.67,4-1.91ZM79.18,14.32c-.74-1.73-2.33-2.72-4.45-2.72s-3.68.99-4.42,2.72h8.87Z"
              />
              <path
                fill="#fff"
                d="M94.28,7.64v3.89c-2.83,0-4.53,1.38-4.53,4.21v9.9h-4.24v-9.9c0-5.37,3.39-8.1,8.77-8.1Z"
              />
              <path
                fill="#fff"
                d="M95.73.88h5.13l7.21,18.85L115.25.88h5.13v24.75h-4.42v-15.17l-5.73,15.03.04.14h-4.42l.04-.14-5.73-15.03v15.17h-4.42V.88Z"
              />
              <path
                fill="#fff"
                d="M124.62.5c1.31,0,2.33,1.06,2.33,2.33,0,1.34-1.03,2.37-2.33,2.37s-2.33-1.03-2.33-2.37c0-1.27,1.03-2.33,2.33-2.33ZM122.5,7.96h4.24v17.68h-4.24V7.96Z"
              />
              <path
                fill="#fff"
                d="M144.95,15.1v10.54h-4.24v-10.43c0-2.51-1.84-3.64-3.89-3.64s-3.89,1.13-3.89,3.64v10.43h-4.24v-10.54c0-3.08,2.3-7.46,8.13-7.46s8.13,4.38,8.13,7.46Z"
              />
              <path
                fill="#fff"
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
              <circle fill="#fff" cx="167.08" cy="24.05" r="2.22" />
              <path
                fill="#7e79b8"
                d="M10.03,6h.89c.49,0,.74-.58.41-.94L6.86.18c-.22-.24-.61-.24-.83,0L1.56,5.06c-.33.36-.07.94.41.94h.89c.22,0,.44-.09.59-.26l2.63-2.86c.2-.21.53-.21.73,0l2.63,2.86c.15.17.37.26.59.26Z"
              />
              <path
                fill="#e55fa2"
                d="M6.44,4.32c-.19,0-.39.08-.53.23L.19,10.81c-.42.46-.09,1.2.53,1.2h2.32c.2,0,.39-.08.53-.23l2.35-2.57c.14-.16.34-.23.53-.23s.39.08.53.23l2.35,2.57c.14.15.33.23.53.23h2.32c.62,0,.95-.74.53-1.2l-5.72-6.25c-.14-.16-.34-.23-.53-.23Z"
              />
            </svg>
            <span style={styles.appName}>IntPatient</span>
          </Link>

          <div style={styles.links}>
            <Link
              to="/"
              style={{
                ...styles.link,
                ...(isActive('/') ? styles.linkActive : {}),
              }}
            >
              Ana Sayfa
            </Link>
            <Link
              to="/records"
              style={{
                ...styles.link,
                ...(isActive('/records') ? styles.linkActive : {}),
              }}
            >
              Kayıtlar
            </Link>
          </div>
        </div>

        <div style={styles.right}>
          <span style={styles.userName}>{user?.full_name || user?.username}</span>
          <button onClick={logout} style={styles.logoutBtn}>
            Çıkış
          </button>
        </div>
      </div>
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: '#9490c8',
    height: '60px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  inner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  appName: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  link: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  linkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.15)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    fontWeight: 500,
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '6px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}
