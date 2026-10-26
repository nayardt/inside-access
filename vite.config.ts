import { defineConfig } from 'vite';
export default defineConfig({
 build:{sourcemap:false},
 server:{host:'0.0.0.0',allowedHosts:true,fs:{deny:[
  '**/.env*','**/*.{crt,pem,key}','**/.git/**','**/.local/**',
  '**/enrichment/**','**/images/**','**/data/**','**/database/**','**/reference/**','**/server/**',
  '**/scripts/**','**/supabase/**','**/tests/**','**/docs/**','**/.github/**'
 ]}}
});
