import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://endrvfoowrqnvxyflbjr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZHJ2Zm9vd3JxbnZ4eWZsYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzA3ODAsImV4cCI6MjA4OTAwNjc4MH0.T0AOzi01D3S6UyF_sGZDU7A8bNBxmi9gCUJp_PbOSTM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
