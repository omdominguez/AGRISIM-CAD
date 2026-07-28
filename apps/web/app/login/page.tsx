'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { guardarSesion } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      guardarSesion(data.access_token, data.usuario);
      router.push('/solicitudes');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cad-navy">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-xl">
        <h1 className="font-display text-4xl tracking-wide text-cad-navy leading-none">
          AGRISIM <span className="text-cad-naranja">CAD</span>
        </h1>
        <p className="text-sm text-cad-apagado mt-2 mb-6">Financiamiento a campo — CAD</p>

        <label className="block text-sm text-cad-tinta mb-1">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-cad-linea rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja"
        />

        <label className="block text-sm text-cad-tinta mb-1">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-cad-linea rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja"
        />

        {error && <p className="text-sm text-cad-danger mb-4">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-cad-naranja text-white font-medium rounded py-2 hover:brightness-95 transition disabled:opacity-50"
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
