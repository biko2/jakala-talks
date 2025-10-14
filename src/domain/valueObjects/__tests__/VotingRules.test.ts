import { VotingRules } from '../VotingRules'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'

describe('VotingRules', () => {
  let votingRules: VotingRules
  let mockConfigRepo: InMemoryVotingConfigRepository

  beforeEach(() => {
    jest.useFakeTimers()
    mockConfigRepo = new InMemoryVotingConfigRepository({
      votingStartDate: new Date('2025-11-07T00:00:00.000Z'),
      maxVotesPerUser: 3
    })
    votingRules = new VotingRules(mockConfigRepo)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('isVotingEnabled', () => {
    it('debería devolver false antes del 7 de noviembre de 2025', async () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(await votingRules.isVotingEnabled()).toBe(false)
    })

    it('debería devolver true el 7 de noviembre de 2025', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(await votingRules.isVotingEnabled()).toBe(true)
    })

    it('debería devolver true después del 7 de noviembre de 2025', async () => {
      jest.setSystemTime(new Date('2025-11-08T00:00:00.000Z'))
      expect(await votingRules.isVotingEnabled()).toBe(true)
    })
  })

  describe('canUserVote', () => {
    it('debería permitir votar si la votación está habilitada y el usuario tiene menos de 3 votos', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(await votingRules.canUserVote(0)).toBe(true)
      expect(await votingRules.canUserVote(1)).toBe(true)
      expect(await votingRules.canUserVote(2)).toBe(true)
    })

    it('no debería permitir votar si la votación no está habilitada', async () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(await votingRules.canUserVote(0)).toBe(false)
      expect(await votingRules.canUserVote(1)).toBe(false)
      expect(await votingRules.canUserVote(2)).toBe(false)
    })

    it('no debería permitir votar si el usuario ya tiene 3 votos', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(await votingRules.canUserVote(3)).toBe(false)
      expect(await votingRules.canUserVote(4)).toBe(false)
    })
  })

  describe('canCreateNewTalks', () => {
    it('debería permitir crear charlas antes del 7 de noviembre de 2025', async () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(await votingRules.canCreateNewTalks()).toBe(true)
    })

    it('no debería permitir crear charlas el 7 de noviembre de 2025 o después', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(await votingRules.canCreateNewTalks()).toBe(false)
    })
  })

  describe('hasUserVotedForTalk', () => {
    it('debería devolver true si el usuario ya votó por la charla', () => {
      const userVotes = ['talk1', 'talk2']
      expect(VotingRules.hasUserVotedForTalk(userVotes, 'talk1')).toBe(true)
      expect(VotingRules.hasUserVotedForTalk(userVotes, 'talk2')).toBe(true)
    })

    it('debería devolver false si el usuario no ha votado por la charla', () => {
      const userVotes = ['talk1', 'talk2']
      expect(VotingRules.hasUserVotedForTalk(userVotes, 'talk3')).toBe(false)
    })

    it('debería devolver false si el usuario no tiene votos', () => {
      const userVotes: string[] = []
      expect(VotingRules.hasUserVotedForTalk(userVotes, 'talk1')).toBe(false)
    })
  })

  describe('validateVoteAction', () => {
    it('debería lanzar error si la votación no está habilitada', async () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      const userVotes = ['talk1']
      await expect(votingRules.validateVoteAction(userVotes, 'talk2', true))
        .rejects.toThrow('La votación estará disponible a partir del 07/11/2025')
    })

    it('debería permitir votar si la votación está habilitada y no se ha votado antes y se tiene votos disponibles', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const userVotes = ['talk1']
      await expect(votingRules.validateVoteAction(userVotes, 'talk2', true)).resolves.not.toThrow()
    })

    it('debería permitir quitar voto sin validaciones si la votación está habilitada', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2']
      await expect(votingRules.validateVoteAction(userVotes, 'talk1', false)).resolves.not.toThrow()
    })

    it('debería lanzar error si el usuario ya tiene 3 votos y trata de votar por una nueva charla', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2', 'talk3']
      await expect(votingRules.validateVoteAction(userVotes, 'talk4', true))
        .rejects.toThrow('Solo puedes votar un máximo de 3 charlas')
    })

    it('debería permitir votar por una charla ya votada si hay límite disponible', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2']
      await expect(votingRules.validateVoteAction(userVotes, 'talk1', true)).resolves.not.toThrow()
    })
  })

  describe('getVotingStatusMessage', () => {
    it('debería devolver mensaje de votación no disponible antes del 7 de noviembre', async () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(await votingRules.getVotingStatusMessage()).toBe('La votación estará disponible a partir del 07/11/2025')
    })

    it('debería devolver mensaje de votación activa el 7 de noviembre o después', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(await votingRules.getVotingStatusMessage()).toBe('Votación activa')
    })
  })

  describe('determineVoteAction', () => {
    it('debería devolver true si el usuario no ha votado por la charla', () => {
      const userVotes = ['talk1', 'talk2']
      expect(VotingRules.determineVoteAction(userVotes, 'talk3')).toBe(true)
    })

    it('debería devolver false si el usuario ya votó por la charla', () => {
      const userVotes = ['talk1', 'talk2']
      expect(VotingRules.determineVoteAction(userVotes, 'talk1')).toBe(false)
    })

    it('debería devolver true para lista de votos vacía', () => {
      const userVotes: string[] = []
      expect(VotingRules.determineVoteAction(userVotes, 'talk1')).toBe(true)
    })
  })
})

