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
  },
});
