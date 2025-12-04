(function(){
  const mapEl = document.getElementById('map');
  const form = document.getElementById('searchForm');
  const dirInput = document.getElementById('direccion');
  const radiusInput = document.getElementById('radio');
  const btnUbicacion = document.getElementById('btnUbicacion');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const resultList = document.getElementById('resultList');

  if(!mapEl) return;

  const defaultLatLng = [23.6345, -102.5528]; // Centro aproximado de México
  const map = L.map(mapEl).setView(defaultLatLng, 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);
  let originMarker = null;

  function clearResults(){
    markers.clearLayers();
    if(originMarker){ map.removeLayer(originMarker); originMarker = null; }
    resultList.innerHTML = '';
  }

  function addResultItem(item){
    const div = document.createElement('div');
    div.className = 'border rounded p-3';

    const title = document.createElement('h3');
    title.className = 'h6 mb-1';
    title.textContent = item.name || item.typeLabel || 'Lugar';

    const small = document.createElement('div');
    small.className = 'small text-body-secondary mb-2';
    small.textContent = [item.typeLabel, item.address].filter(Boolean).join(' · ');

    const row = document.createElement('div');
    row.className = 'd-flex gap-2 flex-wrap';

    const a1 = document.createElement('a');
    a1.className = 'btn btn-sm btn-outline-primary';
    a1.href = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`;
    a1.target = '_blank'; a1.rel = 'noopener';
    a1.textContent = 'Ver en Google Maps';

    const a2 = document.createElement('a');
    a2.className = 'btn btn-sm btn-outline-secondary';
    a2.href = `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=18/${item.lat}/${item.lon}`;
    a2.target = '_blank'; a2.rel = 'noopener';
    a2.textContent = 'Ver en OpenStreetMap';

    row.appendChild(a1); row.appendChild(a2);

    div.appendChild(title);
    div.appendChild(small);
    div.appendChild(row);

    resultList.appendChild(div);
  }

  function typeLabelFromTags(tags){
    if(!tags) return null;
    if(tags.name && /registro civil/i.test(tags.name)) return 'Registro Civil';
    if(tags.name && /kiosco/i.test(tags.name)) return 'Kiosco de Gobierno';
    if(tags.amenity === 'townhall') return 'Ayuntamiento / Gobierno';
    if(tags.office === 'government') return 'Oficina de Gobierno';
    if(tags.government === 'register_office') return 'Registro Civil';
    return tags.amenity || tags.office || tags.government || null;
  }

  function addMarker(item){
    const marker = L.marker([item.lat, item.lon]);
    const popup = document.createElement('div');
    const h = document.createElement('strong');
    h.textContent = item.name || 'Lugar';
    const p = document.createElement('div');
    p.className = 'small text-body-secondary';
    p.textContent = [item.typeLabel, item.address].filter(Boolean).join(' · ');
    popup.appendChild(h); popup.appendChild(document.createElement('br')); popup.appendChild(p);
    marker.bindPopup(popup);
    marker.addTo(markers);
  }

  async function geocode(q){
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if(!res.ok) throw new Error('Error al geocodificar');
    const data = await res.json();
    return data && data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name } : null;
  }

  function overpassQuery(lat, lon, radius){
    return `[
      out:json][timeout:25];
      (
        node(around:${radius},${lat},${lon})[name~"Registro Civil|Kiosco|Actas|Gobierno", i];
        way(around:${radius},${lat},${lon})[name~"Registro Civil|Kiosco|Actas|Gobierno", i];
        relation(around:${radius},${lat},${lon})[name~"Registro Civil|Kiosco|Actas|Gobierno", i];
        node(around:${radius},${lat},${lon})[office=government];
        way(around:${radius},${lat},${lon})[office=government];
        node(around:${radius},${lat},${lon})[amenity=townhall];
        way(around:${radius},${lat},${lon})[amenity=townhall];
      );
      out center tags 40;
    `;
  }

  async function fetchOverpass(lat, lon, radius){
    const query = overpassQuery(lat, lon, radius);
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: new URLSearchParams({ data: query })
    });
    if(!res.ok) throw new Error('Error al consultar Overpass');
    const data = await res.json();
    return Array.isArray(data.elements) ? data.elements : [];
  }

  function toItem(el){
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    const tags = el.tags || {};
    const name = tags.name || null;
    const addrParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean);
    const address = addrParts.join(' ');
    return { lat, lon, name, typeLabel: typeLabelFromTags(tags), address };
  }

  function fitToMarkers(){
    const grp = L.featureGroup(markers.getLayers());
    try { map.fitBounds(grp.getBounds().pad(0.2)); } catch(_) { /* noop */ }
  }

  async function searchAround(lat, lon, radius){
    clearResults();
    originMarker = L.marker([lat, lon], { title: 'Origen de búsqueda' }).addTo(map);
    originMarker.bindPopup('<strong>Centro de búsqueda</strong>').openPopup();

    let elements = [];
    try {
      elements = await fetchOverpass(lat, lon, radius);
    } catch(err){
      console.error(err);
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger';
      alert.textContent = 'No fue posible obtener resultados en este momento. Intenta de nuevo más tarde.';
      resultList.appendChild(alert);
      return;
    }

    const items = elements
      .map(toItem)
      .filter(it => it.lat && it.lon)
      .slice(0, 50);

    if(items.length === 0){
      const alert = document.createElement('div');
      alert.className = 'alert alert-warning';
      alert.textContent = 'No se encontraron lugares en el radio indicado. Prueba con un radio mayor o ajusta la búsqueda.';
      resultList.appendChild(alert);
    } else {
      items.forEach(it => { addMarker(it); addResultItem(it); });
      fitToMarkers();
    }
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const q = (dirInput.value || '').trim();
    const radius = Math.max(200, Math.min(10000, parseInt(radiusInput.value || '2000', 10)));
    if(!q){ dirInput.focus(); return; }
    try{
      const loc = await geocode(q);
      if(!loc){ alert('No se encontró la dirección. Intenta ser más específico.'); return; }
      map.setView([loc.lat, loc.lon], 15);
      await searchAround(loc.lat, loc.lon, radius);
    }catch(err){
      console.error(err);
      alert('Ocurrió un error al buscar la dirección.');
    }
  });

  btnUbicacion.addEventListener('click', function(){
    if(!navigator.geolocation){ alert('La geolocalización no es compatible con este navegador.'); return; }
    const radius = Math.max(200, Math.min(10000, parseInt(radiusInput.value || '2000', 10)));
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
      await searchAround(latitude, longitude, radius);
    }, (err) => {
      console.error(err);
      alert('No se pudo obtener tu ubicación. Revisa permisos del navegador.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });

  btnLimpiar.addEventListener('click', function(){
    clearResults();
    map.setView(defaultLatLng, 5);
    dirInput.value = '';
  });
})();
