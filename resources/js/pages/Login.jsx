import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api';
import { Bidang, Input, PesanGalat, Tombol, useAksi } from '../ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { sibuk, galat, jalan } = useAksi();
  const navigate = useNavigate();

  function masuk(e) {
    e.preventDefault();
    jalan(async () => {
      const d = await api('/login', 'POST', { email, password });
      auth.simpan(d);
      navigate(d.role === 'admin' ? '/admin' : '/kelompok-saya', { replace: true });
    });
  }

  return (
    <main className="min-h-dvh grid sm:place-items-center px-5 py-10 sm:p-6">
      <div className="w-full sm:w-[360px]">
        <p className="flex items-center gap-2 text-sm font-semibold mb-10 sm:mb-8">
          <span aria-hidden className="size-2.5 bg-brand" />
          Market Day
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p className="text-muted text-sm mt-1 mb-6">Gunakan akun yang diberikan oleh BPA.</p>
        <form onSubmit={masuk} className="space-y-4">
          <Bidang label="Email">
            <Input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Bidang>
          <Bidang label="Kata sandi">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Bidang>
          <PesanGalat>{galat}</PesanGalat>
          <Tombol type="submit" varian="primer" className="w-full" disabled={sibuk}>{sibuk ? 'Memeriksa…' : 'Masuk'}</Tombol>
        </form>
        {import.meta.env.DEV && (
          <p className="text-[13px] text-muted mt-6">Akun demo: admin@bpa.test atau mhs1@kelompok.test, kata sandi: password</p>
        )}
      </div>
    </main>
  );
}
