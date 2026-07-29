/**
 * Parser mínimo de RSS de Google News — sin dependencias externas.
 * Google News expone búsquedas como RSS público, sin API key:
 *   https://news.google.com/rss/search?q=QUERY&hl=es-419&gl=VE&ceid=VE:es-419
 *
 * Se usa una extracción por regex en vez de un parser XML completo porque
 * la estructura de este feed es estable y simple (<item>...</item>) — traer
 * una librería de XML solo para esto sería sobre-ingeniería.
 */

export interface ItemNoticiaRss {
  titulo: string;
  fuente: string;
  url: string;
  fechaPublicacion: Date;
}

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim();
}

function extraerTag(bloque: string, tag: string): string | null {
  const match = bloque.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodificarEntidadesHtml(match[1]) : null;
}

export async function buscarNoticiasGoogleNews(
  query: string,
  idioma: 'es-419' | 'en-US' = 'es-419',
  region: 'VE' | 'US' = 'VE',
  maxResultados = 5,
): Promise<ItemNoticiaRss[]> {
  const ceid = `${region}:${idioma}`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${idioma}&gl=${region}&ceid=${ceid}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CADAgricolaBot/1.0)' } });
  if (!res.ok) throw new Error(`Google News RSS respondió ${res.status}`);

  const xml = await res.text();
  const bloques = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return bloques.slice(0, maxResultados).map((bloque) => {
    const tituloCompleto = extraerTag(bloque, 'title') ?? 'Sin título';
    const link = extraerTag(bloque, 'link') ?? '';
    const pubDate = extraerTag(bloque, 'pubDate');
    const sourceMatch = bloque.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const fuente = sourceMatch ? decodificarEntidadesHtml(sourceMatch[1]) : 'Google News';

    // Google News suele poner "Título - Fuente" en el <title>; se separa
    // porque la fuente ya viene aparte en el tag <source>.
    const titulo = tituloCompleto.replace(new RegExp(`\\s*-\\s*${fuente}$`), '').trim();

    return {
      titulo,
      fuente,
      url: link,
      fechaPublicacion: pubDate ? new Date(pubDate) : new Date(),
    };
  }).filter((item) => item.url); // descarta bloques mal formados sin link
}
