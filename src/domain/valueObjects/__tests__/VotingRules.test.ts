import { VotingRules } from '../VotingRules'

describe('VotingRules', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('isVotingEnabled', () => {
    it('debería devolver false antes del 14 de noviembre de 2025', () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(VotingRules.isVotingEnabled()).toBe(false)
    })

    it('debería devolver true el 14 de noviembre de 2025', () => {
      jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))
      expect(VotingRules.isVotingEnabled()).toBe(true)
    })

    it('debería devolver true después del 14 de noviembre de 2025', () => {
      jest.setSystemTime(new Date('2025-11-15T00:00:00.000Z'))
      expect(VotingRules.isVotingEnabled()).toBe(true)
    })
  })

  describe('canUserVote', () => {
    it('debería permitir votar si la votación está habilitada y el usuario tiene menos de 3 votos', () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      expect(VotingRules.canUserVote(0)).toBe(true)
      expect(VotingRules.canUserVote(1)).toBe(true)
      expect(VotingRules.canUserVote(2)).toBe(true)
    })

    it('no debería permitir votar si la votación no está habilitada', () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(VotingRules.canUserVote(0)).toBe(false)
      expect(VotingRules.canUserVote(1)).toBe(false)
      expect(VotingRules.canUserVote(2)).toBe(false)
    })

    it('no debería permitir votar si el usuario ya tiene 3 votos', () => {
      jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))
      expect(VotingRules.canUserVote(3)).toBe(false)
      expect(VotingRules.canUserVote(4)).toBe(false)
    })
  })

  describe('canCreateNewTalks', () => {
    it('debería permitir crear charlas antes del 14 de noviembre de 2025', () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      expect(VotingRules.canCreateNewTalks()).toBe(true)
    })

    it('no debería permitir crear charlas el 14 de noviembre de 2025 o después', () => {
      jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))
      expect(VotingRules.canCreateNewTalks()).toBe(false)
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
    it('debería lanzar error si la votación no está habilitada', () => {
      jest.setSystemTime(new Date('2025-11-06T23:59:59.999Z'))
      const userVotes = ['talk1']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk2', true))
        .toThrow('La votación estará disponible a partir del 7 de noviembre de 2025')
    })

    it('debería permitir votar si la votación está habilitada y no se ha votado antes y se tiene votos disponibles', () => {
      jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))
      const userVotes = ['talk1']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk2', true)).not.toThrow()
    })

    it('debería permitir quitar voto sin validaciones si la votación está habilitada', () => {
      jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk1', false)).not.toThrow()
    })

    it('debería lanzar error si el usuario ya tiene 3 votos y trata de votar por una nueva charla', () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2', 'talk3']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk4', true))
        .toThrow('Solo puedes votar un máximo de 3 charlas')
    })

    it('debería permitir votar por una charla ya votada si hay límite disponible', () => {
      jest.setSystemTime(new Date('2025-11-10T00:00:00.000Z'))
      const userVotes = ['talk1', 'talk2']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk1', true)).not.toThrow()
    })
  })

  describe('getVotingStatusMessage', () => {
    it.only('debería devolver mensaje de votación no disponible antes del 14 de noviembre', () => {
      jest.setSystemTime(new Date('2025-11-6T23:59:59.999Z'))
      expect(VotingRules.getVotingStatusMessage()).toBe('La votación estará disponible a partir del 7 de noviembre de 2025')
    })

    it('debería devolver mensaje de votación activa el 14 de noviembre o después', () => {
      jest.setSystemTime(new Date('2025-11-10T00:00:00.000Z'))
      expect(VotingRules.getVotingStatusMessage()).toBe('Votación activa')
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

