#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const env = {
  ...process.env,
  APP_ENV: 'staging',
  EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: 'staging',
  EXPO_PUBLIC_SUPABASE_URL: 'https://gcdohgbmqhqwydgaxrcr.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_Fad1xU5q53KB2uq-D1shIw_6JH0vInk',
  HEALTHTIMES_WEB_BASE_URL: ''
};

const result = spawnSync('npm', ['run', 'build:phase4:web'], {
  stdio: 'inherit',
  env
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
