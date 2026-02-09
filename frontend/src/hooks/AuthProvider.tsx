import React, { useState, useEffect, useCallback, type ReactNode } from 'react'
import apiClient from '../api/client'
import { AuthContext, type User } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem('token')
  )
  const [loading, setLoading] = useState(true)

  const validateToken = useCallback(async () => {
    const storedToken = sessionStorage.getItem('token')
    if (!storedToken) {
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.get('/api/auth/me')
      setUser(response.data)
      setToken(storedToken)
    } catch {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  const login = async (username: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', {
      username,
      password,
    })
    const { access_token, user: userData } = response.data
    sessionStorage.setItem('token', access_token)
    sessionStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
  }

  const logout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}
