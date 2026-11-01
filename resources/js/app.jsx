import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './api';
import { PenyediaToast } from './ui';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Mahasiswa from './pages/Mahasiswa';

const beranda = () => (auth.role === 'admin' ? '/admin' : '/kelompok-saya');

function Khusus({ role, children }) {
  if (!auth.token) return <Navigate to="/login" replace />;
  if (auth.role !== role) return <Navigate to={beranda()} replace />;
  return children;
}

const el = document.getElementById('app');
if (el) {
    const root = createRoot(el);
    root.render(
        <BrowserRouter>
            <PenyediaToast>
                <Routes>
                    <Route path="/login" element={auth.token ? <Navigate to={beranda()} replace /> : <Login />} />
                    <Route path="/admin/*" element={<Khusus role="admin"><Admin /></Khusus>} />
                    <Route path="/kelompok-saya" element={<Khusus role="mahasiswa"><Mahasiswa /></Khusus>} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </PenyediaToast>
        </BrowserRouter>
    );
}
