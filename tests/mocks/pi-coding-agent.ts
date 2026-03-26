export const AuthStorage = {
  create() {
    return {
      setRuntimeApiKey() {
        return undefined;
      },
    };
  },
};

export class ModelRegistry {
  constructor() {}
}

export function createCodingTools() {
  return [
    { name: "read" },
    { name: "bash" },
    { name: "edit" },
    { name: "write" },
  ];
}

export function createFindTool() {
  return { name: "find" };
}

export function createGrepTool() {
  return { name: "grep" };
}

export function createLsTool() {
  return { name: "ls" };
}
