import { env } from './env';

type EnvRecord = Record<string, string | undefined>;

export const validateEnv = (config: EnvRecord): EnvRecord => {
  const allowedNodeEnvs = new Set(['development', 'test', 'production']);
  const nodeEnvValue = config[env.nodeEnv] ?? 'development';
  if (!allowedNodeEnvs.has(nodeEnvValue)) {
    throw new Error(
      `Invalid ${env.nodeEnv}: "${nodeEnvValue}". Allowed values: development, test, production.`,
    );
  }

  const portValue = config[env.port];
  if (portValue !== undefined && Number.isNaN(Number(portValue))) {
    throw new Error(`Invalid ${env.port}: "${portValue}" must be a number.`);
  }

  const apiPrefixValue = config[env.apiPrefix];
  if (apiPrefixValue !== undefined && apiPrefixValue.trim().length === 0) {
    throw new Error(`${env.apiPrefix} cannot be empty.`);
  }

  const apiVersionValue = config[env.apiVersion];
  if (apiVersionValue !== undefined && apiVersionValue.trim().length === 0) {
    throw new Error(`${env.apiVersion} cannot be empty.`);
  }
  const apiDocsPathValue = config[env.apiDocsPath];
  if (apiDocsPathValue !== undefined && apiDocsPathValue.trim().length === 0) {
    throw new Error(`${env.apiDocsPath} cannot be empty.`);
  }

  const jwtSecretValue = config[env.jwtSecret];
  if (!jwtSecretValue || jwtSecretValue.trim().length < 8) {
    throw new Error(
      `${env.jwtSecret} is required and must be at least 8 characters.`,
    );
  }

  const jwtExpiresInValue = config[env.jwtExpiresIn];
  if (!jwtExpiresInValue || jwtExpiresInValue.trim().length === 0) {
    throw new Error(`${env.jwtExpiresIn} is required.`);
  }

  const redisUrlValue = config[env.redisUrl];
  if (!redisUrlValue || redisUrlValue.trim().length === 0) {
    throw new Error(`${env.redisUrl} is required.`);
  }

  const paymentWebhookSecretValue = config[env.paymentWebhookSecret];
  if (
    paymentWebhookSecretValue !== undefined &&
    paymentWebhookSecretValue.trim().length > 0 &&
    paymentWebhookSecretValue.trim().length < 8
  ) {
    throw new Error(
      `${env.paymentWebhookSecret} must be at least 8 characters when provided.`,
    );
  }

  const kafkaBrokersValue = config[env.kafkaBrokers];
  if (
    kafkaBrokersValue !== undefined &&
    kafkaBrokersValue.trim().length === 0
  ) {
    throw new Error(`${env.kafkaBrokers} cannot be empty when provided.`);
  }

  const optionalNumericKeys = [
    env.outboxPublishBatchSize,
    env.outboxPublishLeaseSeconds,
    env.outboxPublishMaxAttempts,
    env.outboxPublishMaxLoops,
    env.alertOutboxFailureRatioThreshold,
    env.alertOutboxMinSamples,
    env.alertWebhookFailureRatioThreshold,
    env.alertWebhookMinSamples,
    env.alertPaymentSucceededDlqThreshold,
    env.alertPaymentSucceededRetryThreshold,
  ];

  for (const key of optionalNumericKeys) {
    const value = config[key];
    if (value === undefined) continue;
    if (value.trim().length === 0) {
      throw new Error(`${key} cannot be empty when provided.`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${key} must be a positive number when provided.`);
    }
  }

  return config;
};
