// Supabase Konfiguration
const SUPABASE_URL = 'https://jkrbkykrproejxyzuabg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcmJreWtycHJvZWp4eXp1YWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NDU3MTEsImV4cCI6MjA3OTIyMTcxMX0.o73tEZC9gUyiOfY4SrCNHoGgBW4p6Dz2ofIjM7Ikfxk';

// Supabase Client initialisieren
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);