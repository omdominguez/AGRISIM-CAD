'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { guardarSesion } from '../../lib/auth';
import Logo from '../../components/brand/Logo';

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
      router.push('/ciclos');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cad-navy">
      {/* Panel de marca */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white">
        <Logo variante="isotipo" alto={56} />
        <div>
          <p className="font-display text-6xl leading-[0.9] tracking-wide">
            TREINTA AÑOS
            <br />
            <span className="text-cad-naranja">SOSTENIENDO.</span>
          </p>
          <p className="text-white/60 mt-6 max-w-md text-sm leading-relaxed">
            Financiamiento a campo, seguimiento técnico y liquidación de cosecha
            en un solo sistema. Trazabilidad de cada hectárea financiada.
          </p>
        </div>
        <p className="text-xs text-white/40">
          Comercializadora Agrícola Domínguez, C.A. · Uso interno
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-8 bg-cad-superficie">
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-cad-linea">
          <div className="lg:hidden mb-6">
            <Logo variante="completo" alto={44} />
          </div>

          <h1 className="text-xl font-bold text-cad-navy">CAD Agrícola</h1>
          <p className="text-sm text-cad-apagado mt-1 mb-6">Financiamiento a campo</p>

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
            className="w-full bg-cad-naranja text-white font-medium rounded py-2.5 hover:brightness-95 transition disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
