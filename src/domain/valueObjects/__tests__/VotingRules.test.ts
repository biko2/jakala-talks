import { VotingRules } from '../VotingRules'

describe('VotingRules', () => {
  describe('canUserVote', () => {
    it('debería permitir votar si el usuario tiene menos de 3 votos', () => {
      expect(VotingRules.canUserVote(0)).toBe(true)
      expect(VotingRules.canUserVote(1)).toBe(true)
      expect(VotingRules.canUserVote(2)).toBe(true)
    })

    it('no debería permitir votar si el usuario ya tiene 3 votos', () => {
      expect(VotingRules.canUserVote(3)).toBe(false)
      expect(VotingRules.canUserVote(4)).toBe(false)
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
    it('debería permitir votar si no se ha votado antes y se tiene votos disponibles', () => {
      const userVotes = ['talk1']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk2', true)).not.toThrow()
    })

    it('debería permitir quitar voto sin validaciones', () => {
      const userVotes = ['talk1', 'talk2']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk1', false)).not.toThrow()
    })

    it('debería lanzar error si el usuario ya tiene 3 votos y trata de votar por una nueva charla', () => {
      const userVotes = ['talk1', 'talk2', 'talk3']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk4', true))
        .toThrow('Solo puedes votar un máximo de 3 charlas')
    })

    it('debería permitir votar por una charla ya votada si hay límite disponible', () => {
      const userVotes = ['talk1', 'talk2']
      expect(() => VotingRules.validateVoteAction(userVotes, 'talk1', true)).not.toThrow()
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

