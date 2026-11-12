export const API='https://voidsignal-editorial-api.smartlabdesign-tools.workers.dev';
export const sessionKey='vs-console-session';
export async function apiFetch(path:string,init:RequestInit={}){const h=new Headers(init.headers);const token=sessionStorage.getItem(sessionKey);if(token)h.set('Authorization','Bearer '+token);const r=await fetch(API+path,{...init,headers:h,credentials:'omit'});if(r.status===401){sessionStorage.removeItem(sessionKey);window.dispatchEvent(new Event('vs-signout'));}return r;}
