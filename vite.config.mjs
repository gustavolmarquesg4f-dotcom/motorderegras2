import {defineConfig} from 'vite';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({root:'web',envDir:'.',server:{host:'0.0.0.0',port:5173,fs:{allow:['..']}},build:{outDir:'../dist',emptyOutDir:true},resolve:{alias:{'@shared':fileURLToPath(new URL('./shared',import.meta.url))}}});