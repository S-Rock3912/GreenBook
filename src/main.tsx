import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker はオフライン起動用。開発時は Vite のモジュール配信と
// 干渉しうるため、本番ビルドでのみ登録する。
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 登録失敗してもアプリは通常どおり動作する
    });
  });
}
