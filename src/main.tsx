import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { instalarCapturaDeErros } from './services/relatorErrosService';

// Captura erros do navegador e manda para a auditoria.
instalarCapturaDeErros();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
