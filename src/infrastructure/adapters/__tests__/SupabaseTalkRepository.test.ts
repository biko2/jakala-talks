/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { http } from 'msw'
import { TalkRepository } from '../TalkRepository'
import { Talk } from '../../../domain/entities/Talk'
import { UserVote } from '../../../domain/entities/UserVote'
import { server } from '@/lib/mock/msw/node'
import { resetDb } from '@/lib/mock/msw/db'
import { restUrl, postgrestError } from '@/lib/mock/msw/handlers'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'
import { MOCK_USER } from '@/lib/mock/user'

const createRepository = () =>
  new TalkRepository(
    createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  )

const failVoteCounts = () =>
  server.use(
    http.post(restUrl('rpc/get_talk_vote_counts'), () =>
      postgrestError(403, '42501', 'permission denied for function get_talk_vote_counts')
    )
  )

describe('TalkRepository (contrato HTTP con MSW)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    resetDb()
  })
  afterAll(() => server.close())

  describe('findAll', () => {
    it('debería devolver las charlas de la más reciente a la más antigua con su recuento de votos', async () => {
      const talks = await createRepository().findAll()

      expect(talks).toEqual([
        new Talk(
          'mock-talk-1',
          'Introducción a la Arquitectura Hexagonal',
          'Una charla sobre cómo implementar arquitectura hexagonal en proyectos reales',
          'Usuario Mock',
          30,
          12
        ),
        new Talk(
          'mock-talk-2',
          'Testing en React: Mejores Prácticas',
          'Exploramos las mejores prácticas para escribir tests efectivos en React',
          'Usuario Mock',
          45,
          5
        ),
        new Talk(
          'mock-talk-3',
          'TypeScript Avanzado',
          'Técnicas avanzadas de TypeScript para proyectos enterprise',
          'Usuario Mock',
          60,
          25
        ),
      ])
    })

    it('debería usar 0 votos para una charla que no aparece en el recuento', async () => {
      const repository = createRepository()
      await repository.create(new Talk('talk-sin-votos', 'Charla nueva', 'Descripción nueva', 'Ana', 20))

      const talks = await repository.findAll()

      expect(talks.find(talk => talk.id === 'talk-sin-votos')?.votes).toBe(0)
    })

    it('debería lanzar error de negocio si falla la consulta de charlas', async () => {
      server.use(
        http.get(restUrl('talks'), () => postgrestError(500, 'XX000', 'fallo interno de la base de datos'))
      )

      await expect(createRepository().findAll()).rejects.toThrow(
        'Error al obtener las talks: fallo interno de la base de datos'
      )
    })

    it('debería lanzar error de negocio si falla el RPC de recuento de votos', async () => {
      failVoteCounts()

      await expect(createRepository().findAll()).rejects.toThrow(
        'Error al obtener votos: permission denied for function get_talk_vote_counts'
      )
    })
  })

  describe('findById', () => {
    it('debería devolver la charla con su recuento de votos', async () => {
      expect(await createRepository().findById('mock-talk-2')).toEqual(
        new Talk(
          'mock-talk-2',
          'Testing en React: Mejores Prácticas',
          'Exploramos las mejores prácticas para escribir tests efectivos en React',
          'Usuario Mock',
          45,
          5
        )
      )
    })

    it('debería devolver null si la charla no existe (PGRST116)', async () => {
      expect(await createRepository().findById('no-existe')).toBeNull()
    })

    it('debería lanzar error de negocio si PostgREST responde con otro error', async () => {
      server.use(
        http.get(restUrl('talks'), () => postgrestError(400, '22P02', 'invalid input syntax for type uuid: "abc"'))
      )

      await expect(createRepository().findById('abc')).rejects.toThrow(
        'Error al obtener la talk: invalid input syntax for type uuid: "abc"'
      )
    })

    it('debería lanzar error de negocio si falla el RPC de recuento de votos', async () => {
      failVoteCounts()

      await expect(createRepository().findById('mock-talk-2')).rejects.toThrow(
        'Error al obtener votos: permission denied for function get_talk_vote_counts'
      )
    })
  })

  describe('create', () => {
    it('debería persistir la charla con sus datos y sin votos', async () => {
      const repository = createRepository()

      await repository.create(new Talk('talk-nueva', 'Charla nueva', 'Descripción nueva', 'Ana', 20))

      expect(await repository.findById('talk-nueva')).toEqual(
        new Talk('talk-nueva', 'Charla nueva', 'Descripción nueva', 'Ana', 20, 0)
      )
    })

    it('debería lanzar error de negocio si PostgREST rechaza la inserción', async () => {
      server.use(
        http.post(restUrl('talks'), () =>
          postgrestError(403, '42501', 'new row violates row-level security policy for table "talks"')
        )
      )

      await expect(
        createRepository().create(new Talk('talk-nueva', 'Charla nueva', 'Descripción nueva', 'Ana', 20))
      ).rejects.toThrow('Error al crear la talk: new row violates row-level security policy for table "talks"')
    })
  })

  describe('addUserVote', () => {
    it('debería registrar el voto del usuario y sumarlo al recuento', async () => {
      const repository = createRepository()

      await repository.addUserVote(new UserVote('usuario-nuevo', 'mock-talk-2'))

      expect(await repository.getUserVotes('usuario-nuevo')).toEqual(['mock-talk-2'])
      expect((await repository.findById('mock-talk-2'))?.votes).toBe(6)
    })

    it('debería lanzar error de negocio si el voto ya existe (23505)', async () => {
      await expect(
        createRepository().addUserVote(new UserVote(MOCK_USER.id, 'mock-talk-1'))
      ).rejects.toThrow(
        'Error al agregar voto de usuario: duplicate key value violates unique constraint "user_votes_user_id_talk_id_key"'
      )
    })
  })

  describe('removeUserVote', () => {
    it('debería eliminar solo el voto de ese usuario en esa charla', async () => {
      const repository = createRepository()

      await repository.removeUserVote('seed-user-1', 'mock-talk-2')

      expect(await repository.getUserVotes('seed-user-1')).toEqual(['mock-talk-1', 'mock-talk-3'])
      expect((await repository.findById('mock-talk-2'))?.votes).toBe(4)
    })

    it('debería lanzar error de negocio si PostgREST responde con error', async () => {
      server.use(
        http.delete(restUrl('user_votes'), () => postgrestError(500, 'XX000', 'fallo interno de la base de datos'))
      )

      await expect(createRepository().removeUserVote(MOCK_USER.id, 'mock-talk-1')).rejects.toThrow(
        'Error al eliminar voto de usuario: fallo interno de la base de datos'
      )
    })
  })

  describe('getUserVotes', () => {
    it('debería devolver los ids de las charlas votadas por el usuario', async () => {
      expect(await createRepository().getUserVotes(MOCK_USER.id)).toEqual(['mock-talk-1'])
    })

    it('debería devolver lista vacía si el usuario no ha votado', async () => {
      expect(await createRepository().getUserVotes('usuario-sin-votos')).toEqual([])
    })

    it('debería lanzar error de negocio si PostgREST responde con error', async () => {
      server.use(
        http.get(restUrl('user_votes'), () => postgrestError(500, 'XX000', 'fallo interno de la base de datos'))
      )

      await expect(createRepository().getUserVotes(MOCK_USER.id)).rejects.toThrow(
        'Error al obtener votos del usuario: fallo interno de la base de datos'
      )
    })
  })

  describe('hasUserVotedForTalk', () => {
    it('debería devolver true si el usuario votó la charla', async () => {
      expect(await createRepository().hasUserVotedForTalk(MOCK_USER.id, 'mock-talk-1')).toBe(true)
    })

    it('debería devolver false si el usuario no votó la charla (PGRST116)', async () => {
      expect(await createRepository().hasUserVotedForTalk(MOCK_USER.id, 'mock-talk-2')).toBe(false)
    })

    it('debería lanzar error de negocio si PostgREST responde con otro error', async () => {
      server.use(
        http.get(restUrl('user_votes'), () => postgrestError(500, 'XX000', 'fallo interno de la base de datos'))
      )

      await expect(createRepository().hasUserVotedForTalk(MOCK_USER.id, 'mock-talk-1')).rejects.toThrow(
        'Error al verificar voto del usuario: fallo interno de la base de datos'
      )
    })
  })
})
