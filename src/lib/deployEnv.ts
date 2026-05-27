export type DeployEnv = 'development' | 'staging' | 'production';

const RAW = import.meta.env.VITE_DEPLOY_ENV as string | undefined;

function resolve(): DeployEnv {
  if (RAW === 'development' || RAW === 'staging' || RAW === 'production') {
    return RAW;
  }
  return import.meta.env.DEV ? 'development' : 'production';
}

export const DEPLOY_ENV: DeployEnv = resolve();
export const IS_STAGING = DEPLOY_ENV === 'staging';
export const IS_PRODUCTION = DEPLOY_ENV === 'production';
export const IS_DEVELOPMENT = DEPLOY_ENV === 'development';

export const COMMIT_SHA: string | null =
  (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined) ?? null;

export const COMMIT_SHORT: string | null = COMMIT_SHA ? COMMIT_SHA.slice(0, 7) : null;
