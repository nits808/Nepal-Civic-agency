import { createClient } from '@libsql/client';

export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://ncig-news-nits808.aws-ap-southeast-1.turso.io';
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUxMDg3NTMsImlkIjoiMDFhMWY0Y2YtZWQxMC03Y2ZmLThmNTYtOTllY2M4N2Q2ZGM3Iiwia2lkIjoiTW13dXhYNmwwTlpXUUNhMHNBbXppSjhnNmJEZGN3NWY4TVRLSjh2c1dyNCIsInJpZCI6ImJkMmU4Y2ViLWEyNzktNGNmOS05YTMyLTQwZDJjMzM1OGE0NyJ9.wbZpv-yg6aAxWuMYUih9rMXHiC0btwg9ZviC2y9aJETZCEpBPTX3U_BHBm6Z4RRwydS4YiwAOkxGY8gvImmOAQ';

export function getTursoClient() {
  return createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  });
}
