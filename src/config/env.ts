  export const env = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  apiPrefix: 'API_PREFIX',
  apiVersion: 'API_VERSION',
  apiDocsPath: 'API_DOCS_PATH',
} as const;

export type EnvKey = (typeof env)[keyof typeof env];
