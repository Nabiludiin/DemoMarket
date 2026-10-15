import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './style.css';
import { auth } from './api';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Mahasiswa from './pages/Mahasiswa';

function Lindungi({ role, children }) {
  if (!auth.token) return <Navigate to="/" replace />;
  if (auth.role !== role) return <Navigate to={auth.role === 'admin' ? '/admin' : '/saya'} replace />;
  return children;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<Lindungi role="admin"><Admin /></Lindungi>} />
      <Route path="/saya" element={<Lindungi role="mahasiswa"><Mahasiswa /></Lindungi>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);