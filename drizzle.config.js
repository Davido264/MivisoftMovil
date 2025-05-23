import {defineConfig} from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './lib/db/schema/',
  out: './drizzle',
});
