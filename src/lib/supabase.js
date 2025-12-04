import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ebpxqmakimkvqoqwfeeh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicHhxbWFraW1rdnFvcXdmZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDYzMzMsImV4cCI6MjA4MDAyMjMzM30.JLRUbRym-Z3qDiOwtiaFa9_7520aP7q4BpY5OLlICFY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
