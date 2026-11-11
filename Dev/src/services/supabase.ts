import { createClient } from '@supabase/supabase-js';
import { validateBackendTarget } from '../lib/backendTarget';
import {createBackendFetch} from '../lib/backendRequest';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

declare const __DASHBOARD_BACKEND_MODE__: 'local' | 'main';
export const backendMode = __DASHBOARD_BACKEND_MODE__;
validateBackendTarget(typeof window !== 'undefined' ? window.location.hostname : 'localhost', supabaseUrl, backendMode);

export const supabase = createClient(supabaseUrl, supabaseAnonKey,{global:{fetch:createBackendFetch()}});
