import { env } from './env';

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default () => ({
  app: {
    nodeEnv: process.env[env.nodeEnv] ?? 'development',
    port: toNumber(process.env[env.port], 3000),
    apiPrefix: process.env[env.apiPrefix] ?? 'api',
    apiVersion: process.env[env.apiVersion] ?? '1',
    apiDocsPath: process.env[env.apiDocsPath] ?? 'docs',
  },
  auth: {
    jwtSecret: process.env[env.jwtSecret] ?? '',
    jwtExpiresIn: process.env[env.jwtExpiresIn] ?? '1d',
  },
  payments: {
    webhookSecret: process.env[env.paymentWebhookSecret] ?? '',
  },
  redis: {
    url: process.env[env.redisUrl] ?? '',
  },
  kafka: {
    brokers: process.env[env.kafkaBrokers] ?? '',
  },
  outbox: {
    publishBatchSize: toNumber(process.env[env.outboxPublishBatchSize], 100),
    publishLeaseSeconds: toNumber(
      process.env[env.outboxPublishLeaseSeconds],
      30,
    ),
    publishMaxAttempts: toNumber(process.env[env.outboxPublishMaxAttempts], 10),
    publishMaxLoops: toNumber(process.env[env.outboxPublishMaxLoops], 5),
  },
  alerts: {
    outboxFailureRatioThreshold: toNumber(
      process.env[env.alertOutboxFailureRatioThreshold],
      0.1,
    ),
    outboxMinSamples: toNumber(process.env[env.alertOutboxMinSamples], 20),
    webhookFailureRatioThreshold: toNumber(
      process.env[env.alertWebhookFailureRatioThreshold],
      0.2,
    ),
    webhookMinSamples: toNumber(process.env[env.alertWebhookMinSamples], 20),
    paymentSucceededDlqThreshold: toNumber(
      process.env[env.alertPaymentSucceededDlqThreshold],
      1,
    ),
    paymentSucceededRetryThreshold: toNumber(
      process.env[env.alertPaymentSucceededRetryThreshold],
      20,
    ),
  },
});
