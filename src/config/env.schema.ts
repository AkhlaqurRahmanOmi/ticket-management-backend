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

  return config;
};
