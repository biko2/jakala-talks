'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Header from '@/components/layout/Header'
import TalksList from '@/components/talks/TalksList'
import CreateTalkModal from '@/components/talks/CreateTalkModal'
import { Talk } from '@/src/domain/entities/Talk'
import { GetAllTalks } from '@/src/application/services/GetAllTalks'
import { VoteTalk } from '@/src/application/services/VoteTalk'
import { CreateTalk } from '@/src/application/services/CreateTalk'
import { GetUserVotes } from '@/src/application/services/GetUserVotes'
import { MOCK_USER, isMockMode } from '@/lib/mock/user'
import { TalkRepositoryFactory } from '@/lib/repositories/TalkRepositoryFactory'
import { VotingConfigRepositoryFactory } from '@/lib/repositories/VotingConfigRepositoryFactory'
import { VotingRules } from '@/src/domain/valueObjects/VotingRules'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [talks, setTalks] = useState<Talk[]>([])
  const [userVotes, setUserVotes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [canCreateNewTalks, setCanCreateNewTalks] = useState(true)
  const [isVotingEnabled, setIsVotingEnabled] = useState(false)
  const [maxVotesPerUser, setMaxVotesPerUser] = useState(3)
  const supabase = createBrowserClient()

  const talkRepository = TalkRepositoryFactory.create()
  const votingConfigRepository = VotingConfigRepositoryFactory.create()
  const getAllTalks = new GetAllTalks(talkRepository)
  const voteTalk = new VoteTalk(talkRepository, votingConfigRepository)
  const createTalk = new CreateTalk(talkRepository, votingConfigRepository)
  const getUserVotes = new GetUserVotes(talkRepository)
  const votingRules = new VotingRules(votingConfigRepository)

  useEffect(() => {
    document.body.style.backgroundColor = '#f9fafb'

    return () => {
      document.body.style.backgroundColor = ''
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      if (isMockMode()) {
        setUser(MOCK_USER)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    const getTalks = async () => {
      const talksData = await getAllTalks.execute()
      setTalks(talksData)
      setLoading(false)
    }

    const getUserVotesData = async () => {
      if (isMockMode()) {
        const votes = await getUserVotes.execute(MOCK_USER.id)
        setUserVotes(votes)
        return
      }

      if (user) {
        const votes = await getUserVotes.execute(user.id)
        setUserVotes(votes)
      }
    }

    const checkCanCreateTalks = async () => {
      const canCreate = await votingRules.canCreateNewTalks()
      setCanCreateNewTalks(canCreate)
    }

    const checkVotingStatus = async () => {
      const isEnabled = await votingRules.isVotingEnabled()
      const message = await votingRules.getVotingStatusMessage()
      const config = await votingConfigRepository.getVotingConfig()

      setIsVotingEnabled(isEnabled)
      setMaxVotesPerUser(config.maxVotesPerUser)
    }

    getUser()
    getTalks()
    getUserVotesData()
    checkCanCreateTalks()
    checkVotingStatus()

    if (!isMockMode()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null)
        }
      )

      return () => subscription.unsubscribe()
    }
  }, [supabase.auth, user])

  const handleVote = async (talkId: string) => {
    if (!user) return

    try {
      await voteTalk.execute(user.id, talkId)
      const [updatedTalks, updatedUserVotes] = await Promise.all([
        getAllTalks.execute(),
        getUserVotes.execute(user.id)
      ])
      setTalks(updatedTalks)
      setUserVotes(updatedUserVotes)
    } catch (error) {
      console.error('Error al votar:', error)
      alert(error instanceof Error ? error.message : 'Error desconocido al votar')
    }
  }

  const handleCreateTalk = async (title: string, description: string, duration: number) => {
    if (!user) return

    await createTalk.execute(title, description, user.user_metadata?.full_name || user.email || 'Usuario', duration)
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
    <>
      <div style={{
        minHeight: '100vh',
        minWidth: '100%',
        backgroundColor: '#f9fafb'
      }}>
        <Header user={user} onNewTalkClick={() => setIsModalOpen(true)} canCreateNewTalks={canCreateNewTalks} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px 40px'
        }}>

          <TalksList
            talks={talks}
            onVote={handleVote}
            isLoggedIn={!!user}
            userVotes={userVotes}
            maxVotesPerUser={maxVotesPerUser}
            isVotingEnabled={isVotingEnabled}
          />
        </div>
      </div>

      <CreateTalkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTalk}
      />
    </>
  )
}