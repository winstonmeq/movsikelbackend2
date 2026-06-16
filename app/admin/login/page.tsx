'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken, getToken } from '../lib/adminClient';
import { Button, Card, Input, colors } from '../lib/ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (getToken()) router.replace('/admin');
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, role: 'admin' })
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || 'Login failed.');
      if (body.data?.user?.role !== 'admin') throw new Error('This account is not an admin.');
      setToken(body.data.token);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <Card style={{ width: 380, maxWidth: '100%' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>MovSikel Admin</h1>
        <p style={{ margin: '0 0 20px', color: colors.muted, fontSize: 14 }}>
          Sign in with your admin credentials.
        </p>
        <form onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Phone number</label>
          <div style={{ height: 6 }} />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09171234567"
            inputMode="tel"
          />
          <div style={{ height: 14 }} />
          <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
          <div style={{ height: 6 }} />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p style={{ color: colors.danger, fontSize: 13, marginTop: 14 }}>{error}</p>
          )}
          <div style={{ height: 20 }} />
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
