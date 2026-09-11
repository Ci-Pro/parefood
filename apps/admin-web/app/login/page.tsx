'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { setSession, isAdminRole } from '@/lib/session';
import { Spinner } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@parefood.id');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(email.trim(), password);
      if (!isAdminRole(res.user.role)) {
        setError('Akun ini bukan akun admin.');
        setLoading(false);
        return;
      }
      setSession({ token: res.token, name: res.user.name, email: res.user.email, role: res.user.role });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>PareFood Admin</h1>
        <p className="sub">Panel operasional platform — login staf internal</p>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
        />
        <label>Kata Sandi</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <Spinner /> : 'Masuk'}
        </button>
      </form>
    </div>
  );
}