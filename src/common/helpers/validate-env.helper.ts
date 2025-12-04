import { envs } from 'src/common/config/env.conf';

export const validationHelper = (config: any) => {
  const parsed = envs.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Config validation error: ${parsed.error.message}`);
  }
  return parsed.data;
};
