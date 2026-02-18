export const env = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  apiPrefix: 'API_PREFIX',
  apiVersion: 'API_VERSION',
  apiDocsPath: 'API_DOCS_PATH',
  jwtSecret: 'JWT_SECRET',
  jwtExpiresIn: 'JWT_EXPIRES_IN',
  paymentWebhookSecret: 'PAYMENT_WEBHOOK_SECRET',
  kafkaBrokers: 'KAFKA_BROKERS',
} as const;

export type EnvKey = (typeof env)[keyof typeof env];
