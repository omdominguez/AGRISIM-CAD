import { redirect } from 'next/navigation';

// Esta pantalla se movió dentro de Ajustes — se deja el redirect para que
// cualquier enlace o marcador viejo a esta ruta siga funcionando.
export default function Page() {
  redirect('/ajustes?tab=proveedores');
}
