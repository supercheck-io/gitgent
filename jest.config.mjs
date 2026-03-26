/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // PI packages are ESM-only; unit tests mock the small surface Gitgent uses.
    "^@mariozechner/pi-ai$": "<rootDir>/tests/mocks/pi-ai.ts",
    "^@mariozechner/pi-coding-agent$": "<rootDir>/tests/mocks/pi-coding-agent.ts",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
};

export default config;
