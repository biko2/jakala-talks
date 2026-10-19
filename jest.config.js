const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

// Dependencias de msw publicadas solo como ESM: Jest debe transformarlas.
const ESM_ONLY_PACKAGES = [
  "rettime",
  "until-async",
  "@open-draft/deferred-promise",
];

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.agents/",
    "<rootDir>/tools/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  return {
    ...config,
    transformIgnorePatterns: config.transformIgnorePatterns.map((pattern) =>
      pattern.startsWith("/node_modules/(?!.pnpm)(?!(")
        ? pattern.replace("(?!(", `(?!(${ESM_ONLY_PACKAGES.join("|")}|`)
        : pattern
    ),
  };
};
