'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// Panel del MASTER_ADMIN para crear usuarios y asignar roles
// (TECNICO_CAMPO, GERENTE, JUNTA_DIRECTIVA, MASTER_ADMIN).
export default function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('TECNICO_CAMPO');
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    apiFetch('/usuarios').then(setUsuarios).catch((e) => setError(e.message));
  }

  useEffect(cargar, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password, rol }),
      });
      setNombre(''); setEmail(''); setPassword('');
      cargar();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-cad-navy mb-1">Usuarios y Roles</h1>
      <p className="text-sm text-cad-apagado mb-6">Solo visible para el Administrador Master.</p>

      <form onSubmit={crear} className="bg-white border border-cad-linea rounded-xl p-6 grid grid-cols-2 gap-4 mb-8">
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="border border-cad-linea rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja" required />
        <input placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-cad-linea rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja" required />
        <input placeholder="Contraseña temporal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border border-cad-linea rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja" required />
        <select value={rol} onChange={(e) => setRol(e.target.value)} className="border border-cad-linea rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cad-naranja/40 focus:border-cad-naranja">
          <option value="TECNICO_CAMPO">Técnico de Campo</option>
          <option value="GERENTE">Gerente de Departamento</option>
          <option value="JUNTA_DIRECTIVA">Junta Directiva (solo lectura)</option>
          <option value="MASTER_ADMIN">Administrador Master</option>
        </select>
        {error && <p className="col-span-2 text-sm text-cad-danger">{error}</p>}
        <button type="submit" className="col-span-2 bg-cad-naranja text-white font-medium rounded py-2 text-sm hover:brightness-95 transition">
          Crear usuario
        </button>
      </form>

      <table className="w-full text-sm bg-white border border-cad-linea rounded-xl overflow-hidden">
        <thead className="bg-cad-superficie text-left">
          <tr><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Rol</th><th className="p-3">Activo</th></tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3">{u.nombre}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.rol}</td>
              <td className="p-3">{u.activo ? 'Sí' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
