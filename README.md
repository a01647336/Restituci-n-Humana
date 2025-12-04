# Portal de Apoyo y Directorio — Institución

Sitio web estático en español con recursos de apoyo emocional y motivación, además de un directorio con mapa para ubicar oficinas cercanas donde realizar trámites (por ejemplo, actas de nacimiento).

## Características

- Diseño responsivo con Bootstrap 5
- Página de apoyo emocional con listas de reproducción basadas en búsqueda de YouTube (sin API key)
- Directorio con mapa interactivo (Leaflet + OpenStreetMap) y búsqueda por dirección o geolocalización
- Consulta a Overpass API para encontrar lugares cercanos (Registro Civil, Kioscos de Gobierno, oficinas públicas)
- Página de contacto (formato mailto) y datos de la institución (editables)

## Estructura

- `index.html`: Portada
- `apoyo.html`: Videos y recursos de bienestar y motivación
- `directorio.html`: Mapa, búsqueda y resultados cercanos
- `contacto.html`: Formulario de contacto y datos
- `assets/css/style.css`: Estilos personalizados
- `assets/js/main.js`: Utilidades comunes (año del footer)
- `assets/js/directorio.js`: Lógica del mapa, geocodificación y búsqueda
- `assets/img/logo.svg`: Ícono/logotipo

## Cómo usar

1. Personaliza textos, logotipo, y datos de `contacto.html`.
2. (Opcional) En `directorio.js`, ajusta `defaultLatLng` para centrar el mapa por defecto en tu ciudad.
3. (Opcional) En `apoyo.html`, cambia los términos de búsqueda de YouTube por los que prefieras.

## Despliegue en GitHub Pages

1. Crea un repositorio en GitHub (público o privado con Pages activado).
2. Sube el contenido de esta carpeta a la rama `main` (o `master`).
3. En Settings → Pages, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main` y carpeta `/ (root)`
4. Guarda. La URL se mostrará en Settings → Pages (puede tardar algunos minutos).

## Privacidad y uso de datos

- Geocodificación: Nominatim (OpenStreetMap) — realiza una solicitud al escribir una dirección.
- Lugares cercanos: Overpass API (OpenStreetMap) — consulta pública según el radio indicado.
- Videos: YouTube embed basado en búsqueda; no requiere API key.

Ten en cuenta posibles límites de uso de los servicios públicos. Para producción de alto tráfico, se recomienda usar instancias propias o servicios con SLA.

## Nota importante

Los contenidos de apoyo emocional tienen fines informativos y no sustituyen atención profesional. En caso de crisis o emergencia, contacta inmediatamente a los servicios de emergencia de tu localidad.
