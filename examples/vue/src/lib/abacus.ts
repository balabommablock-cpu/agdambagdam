import { Abacus } from 'agdambagdam';

export const ab = new Abacus({
  apiKey: import.meta.env.VITE_ABACUS_API_KEY ?? 'demo-public-key',
  baseUrl: import.meta.env.VITE_ABACUS_BASE_URL ?? 'https://boredfolio.com/agdambagdam/api',
});
