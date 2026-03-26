export function getEnvApiKey(provider: string): string | undefined {
  switch (provider) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    default:
      return undefined;
  }
}

export function getProviders(): string[] {
  return ["openrouter", "openai", "openai-codex"];
}
