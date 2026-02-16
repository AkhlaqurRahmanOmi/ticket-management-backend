export const env = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  apiPrefix: 'API_PREFIX',
  apiVersion: 'API_VERSION',
  apiDocsPath: 'API_DOCS_PATH',
  jwtSecret: 'JWT_SECRET',
  jwtExpiresIn: 'JWT_EXPIRES_IN',
} as const;

export type EnvKey = (typeof env)[keyof typeof env];
