import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api';

export default function Login() {
  const [email, setEmail] = useState('admin@bpa.test');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function masuk(e) {
    e.preventDefault();
    setErr('');
    try {
      const d = await api('/login', 'POST', { email, password });
      auth.simpan(d);
      nav(d.role === 'admin' ? '/admin' : '/saya');
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <div className="login">
      <form onSubmit={masuk} className="kartu">
        <h1>Market Day</h1>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Kata sandi<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn">Masuk</button>
        <p className="kecil">Akun demo: admin@bpa.test atau mhs1@kelompok.test, kata sandi: password</p>
      </form>
    </div>
  );
}