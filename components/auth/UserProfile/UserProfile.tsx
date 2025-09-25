'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface UserProfileProps {
  user: User
}

export default function UserProfile({ user }: UserProfileProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error durante logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center space-x-4">
        {user.user_metadata?.avatar_url && (
          <img
            className="h-12 w-12 rounded-full"
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name || user.email}
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            {user.user_metadata?.full_name || user.email}
          </h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {loading ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )
}
