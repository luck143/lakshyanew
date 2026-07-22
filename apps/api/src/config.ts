// apps/api/src/config.ts
export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://lakshya:lakshya_pass@localhost:5432/lakshya?schema=public',
  jwtSecret: process.env.JWT_SECRET ?? 'lakshya-dev-secret-change-me',
  jwtAlgorithm: 'HS256' as const,
};
