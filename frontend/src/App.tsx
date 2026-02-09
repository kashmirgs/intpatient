import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RadiologyUploadPage from './pages/RadiologyUploadPage'
import ReportUploadPage from './pages/ReportUploadPage'
import RecordsPage from './pages/RecordsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/radiology/upload"
          element={
            <ProtectedRoute>
              <RadiologyUploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/upload"
          element={
            <ProtectedRoute>
              <ReportUploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <RecordsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
