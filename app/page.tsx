'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Header from '@/components/layout/Header'
import TalksList from '@/components/talks/TalksList'
import { Talk } from '@/src/domain/entities/Talk'
import { GetAllTalks } from '@/src/application/services/GetAllTalks'
import { VoteTalk } from '@/src/application/services/VoteTalk'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'

const talkRepository = new TalkRepository()
const getAllTalks = new GetAllTalks(talkRepository)
const voteTalk = new VoteTalk(talkRepository)

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [talks, setTalks] = useState<Talk[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    const getTalks = async () => {
      const talksData = await getAllTalks.execute()
      setTalks(talksData)
      setLoading(false)
    }

    getUser()
    getTalks()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleVote = async (talkId: string, isVoted: boolean) => {
    if (!user) return

    await voteTalk.execute(talkId, isVoted)
    const updatedTalks = await getAllTalks.execute()
    setTalks(updatedTalks)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <Header user={user} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px 40px'
      }}>
        <TalksList
          talks={talks}
          onVote={handleVote}
          isLoggedIn={!!user}
        />
      </div>
    </div>
  )
}
