import { Talk } from '@/src/domain/entities/Talk'

export const MOCK_TALKS: Talk[] = [
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
  )
]

export const MOCK_USER_VOTES: string[] = ['mock-talk-1']
