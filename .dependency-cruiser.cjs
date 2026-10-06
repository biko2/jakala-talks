/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No se permiten dependencias circulares.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-no-outward',
      severity: 'error',
      comment:
        'src/domain no importa application, infrastructure, app, components ni lib.',
      from: {
        path: '^src/domain',
        pathNot: '(__tests__|\\.test\\.(ts|tsx)$|\\.integration\\.test\\.(ts|tsx)$)',
      },
      to: {
        path: '^(src/(application|infrastructure)|app|components|lib)/',
      },
    },
    {
      name: 'application-only-domain',
      severity: 'error',
      comment: 'src/application solo importa src/domain (y a sí mismo).',
      from: {
        path: '^src/application',
        pathNot: '(__tests__|\\.test\\.(ts|tsx)$|\\.integration\\.test\\.(ts|tsx)$)',
      },
      to: {
        path: '^(src/infrastructure|app|components|lib)/',
      },
    },
    {
      name: 'infrastructure-no-ui',
      severity: 'error',
      comment: 'src/infrastructure no importa app ni components.',
      from: {
        path: '^src/infrastructure',
        pathNot: '(__tests__|\\.test\\.(ts|tsx)$|\\.integration\\.test\\.(ts|tsx)$)',
      },
      to: {
        path: '^(app|components)/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
}
