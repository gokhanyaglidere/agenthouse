import {configureRoster} from './bibilen/roster.js';
import {scopedUrl} from './bibilen/workspace.js';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { isBrowserRuntime } from './runtime';

async function main() {
  // browserMock is for Vite dev mode only (UI prototyping without a server).
  // In standalone server mode, assets are loaded server-side and sent over WebSocket.
  if (isBrowserRuntime && import.meta.env.DEV) {
    const { initBrowserMock } = await import('./browserMock.js');
    await initBrowserMock();
  }
  if(isBrowserRuntime&&!import.meta.env.DEV){
    try{const response=await fetch(scopedUrl('/bibilen/api/roles'));if(!response.ok)throw new Error('Çalışma ortamı açılamadı.');const body=await response.json();configureRoster(body.roles,body.legacy);}catch{
      const root=document.getElementById('root')!;root.textContent='Bu çalışma ortamı açılamadı. Ana projeye dönmek için adresin workspaceId parametresini kaldır.';return;
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

main().catch(console.error);
