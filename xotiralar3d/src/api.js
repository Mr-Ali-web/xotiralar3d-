// Compatibility helpers use the same-origin backend and the current Identity session.
import { api } from './store.js';
export async function health() {
 const res=await fetch('/api/health');
 if(!res.ok)throw new Error(`HTTP ${res.status}`);
 return res.json();
}
export async function getSongs() {
 const res=await fetch('/api/songs');
 if(!res.ok)throw new Error(`HTTP ${res.status}`);
 return res.json();
}
export async function createWish(body) { return api.addWish(body); }
export async function withLoading(fn,setLoading) {
 setLoading?.(true);
 try{return await fn()}finally{setLoading?.(false)}
}
