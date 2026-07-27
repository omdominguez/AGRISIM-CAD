import Cookies from 'js-cookie';

export type RolUsuario = 'MASTER_ADMIN' | 'GERENTE' | 'TECNICO_CAMPO' | 'JUNTA_DIRECTIVA';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export function guardarSesion(token: string, usuario: UsuarioSesion) {
  Cookies.set('agrisim_token', token, { expires: 1 / 3 }); // ~8h
  Cookies.set('agrisim_usuario', JSON.stringify(usuario), { expires: 1 / 3 });
}

export function obtenerUsuario(): UsuarioSesion | null {
  const raw = Cookies.get('agrisim_usuario');
  return raw ? JSON.parse(raw) : null;
}

export function cerrarSesion() {
  Cookies.remove('agrisim_token');
  Cookies.remove('agrisim_usuario');
}

// Utilidad para mostrar/ocultar secciones de UI según el rol.
export function puedeEditar(rol?: RolUsuario) {
  return rol === 'MASTER_ADMIN' || rol === 'GERENTE' || rol === 'TECNICO_CAMPO';
}

export function esSoloLectura(rol?: RolUsuario) {
  return rol === 'JUNTA_DIRECTIVA';
}
