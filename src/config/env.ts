export const env = {
  nodeEnv: 'NODE_ENV',
  port: 'PORT',
  apiPrefix: 'API_PREFIX',
  apiVersion: 'API_VERSION',
  apiDocsPath: 'API_DOCS_PATH',
  jwtSecret: 'JWT_SECRET',
  jwtExpiresIn: 'JWT_EXPIRES_IN',
  redisUrl: 'REDIS_URL',
  paymentWebhookSecret: 'PAYMENT_WEBHOOK_SECRET',
  kafkaBrokers: 'KAFKA_BROKERS',
  outboxPublishBatchSize: 'OUTBOX_PUBLISH_BATCH_SIZE',
  outboxPublishLeaseSeconds: 'OUTBOX_PUBLISH_LEASE_SECONDS',
  outboxPublishMaxAttempts: 'OUTBOX_PUBLISH_MAX_ATTEMPTS',
  outboxPublishMaxLoops: 'OUTBOX_PUBLISH_MAX_LOOPS',
  alertOutboxFailureRatioThreshold: 'ALERT_OUTBOX_FAILURE_RATIO_THRESHOLD',
  alertOutboxMinSamples: 'ALERT_OUTBOX_MIN_SAMPLES',
  alertWebhookFailureRatioThreshold:
    'ALERT_PAYMENT_WEBHOOK_FAILURE_RATIO_THRESHOLD',
  alertWebhookMinSamples: 'ALERT_PAYMENT_WEBHOOK_MIN_SAMPLES',
  alertPaymentSucceededDlqThreshold: 'ALERT_PAYMENT_SUCCEEDED_DLQ_THRESHOLD',
  alertPaymentSucceededRetryThreshold: 'ALERT_PAYMENT_SUCCEEDED_RETRY_THRESHOLD',
} as const;

export type EnvKey = (typeof env)[keyof typeof env];
