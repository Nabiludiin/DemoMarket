import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api';

export default function Login() {
  const [email, setEmail] = useState('admin@bpa.test');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  async function masuk(e) {
    e.preventDefault();
    setErr('');
    try {
      const d = await api('/login', 'POST', { email, password });
      auth.simpan(d);
      navigate(d.role === 'admin' ? '/admin' : '/kelompok-saya');
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={masuk} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-5">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Market Day</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kata sandi</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required />
        </div>
        {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{err}</p>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-colors">Masuk</button>
        <p className="text-xs text-gray-500 text-center mt-4">Akun demo: admin@bpa.test atau mhs1@kelompok.test<br/>Kata sandi: password</p>
      </form>
    </div>
  );
}