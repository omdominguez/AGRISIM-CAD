/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Paleta institucional CAD (Manual de Marca v1.0) ---
        'cad-navy': '#012D37',        // Primario · anclaje
        'cad-verde': '#008747',       // Secundario
        'cad-naranja': '#F77B1C',     // Acento · CTA
        'cad-ambar': '#F8B345',       // Soporte
        'cad-verde-claro': '#82C35A', // Soporte
        'cad-amarillo-verde': '#E6E150', // Terciario
        'cad-info': '#2E6B8C',        // Información
        'cad-danger': '#B23A3A',      // Alerta

        // --- Neutrales operativos ---
        'cad-tinta': '#333333',       // N01 · texto principal
        'cad-apagado': '#666666',     // N02 · texto secundario
        'cad-linea': '#E5E7E8',       // N03 · bordes y divisores
        'cad-superficie': '#F4F4F4',  // N04 · fondo sutil
        'cad-papel': '#FFFFFF',       // N05 · fondo base
      },
      fontFamily: {
        // Poppins: familia operativa (todo el sistema)
        sans: ['var(--font-poppins)', 'sans-serif'],
        // Bebas Neue: solo titulares de gran escala, nunca cuerpo de texto
        display: ['var(--font-bebas)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
