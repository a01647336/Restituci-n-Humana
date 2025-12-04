(function(){
  const mapEl = document.getElementById('map');
  const filtroInput = document.getElementById('filtro');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const resultList = document.getElementById('resultList');
  
  // Integración de JSON personalizado (opcionales)
  const CUSTOM_JSON_URL = 'assets/data/lugares.json';
  let customItems = [];

  if(!mapEl) return;

  const defaultLatLng = [20.6736, -103.344]; // Centro en Jalisco (aprox. Guadalajara)
  const map = L.map(mapEl).setView(defaultLatLng, 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const markers = L.layerGroup().addTo(map);
  let itemMarkers = [];

  function clearResults(){
    markers.clearLayers();
    itemMarkers = [];
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
    itemMarkers.push({ marker, item });
  }
  
  function addItems(items){
    items.forEach(it => { addMarker(it); addResultItem(it); });
    fitToMarkers();
  }

  // Se elimina geocodificación externa: sólo datos locales

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

  // Se elimina Overpass: no se realizan peticiones externas

  function toItem(el){
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    const tags = el.tags || {};
    const name = tags.name || null;
    const addrParts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean);
    const address = addrParts.join(' ');
    return { lat, lon, name, typeLabel: typeLabelFromTags(tags), address };
  }
  
  function toItemFromCustom(obj){
    const lat = parseFloat(obj.lat);
    const lon = parseFloat(obj.lon ?? obj.lng);
    const name = obj.name || obj.nombre || null;
    const typeLabel = obj.type || obj.typeLabel || null;
    const address = obj.address || [obj.direccion, obj.municipio].filter(Boolean).join(', ');
    return { lat, lon, name, typeLabel, address };
  }

  function fitToMarkers(){
    const grp = L.featureGroup(markers.getLayers());
    try { map.fitBounds(grp.getBounds().pad(0.2)); } catch(_) { /* noop */ }
  }

  // Nueva función: mostrar todo desde JSON local y permitir filtro
  function renderList(items){
    resultList.innerHTML = '';
    items.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'border rounded p-3 d-flex justify-content-between align-items-start gap-3';
      const text = document.createElement('div');
      const title = document.createElement('h3');
      title.className = 'h6 mb-1';
      title.textContent = it.name || 'Lugar';
      const small = document.createElement('div');
      small.className = 'small text-body-secondary mb-2';
      small.textContent = [it.typeLabel, it.address].filter(Boolean).join(' · ');
      text.appendChild(title);
      text.appendChild(small);
      const actions = document.createElement('div');
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-primary';
      btn.textContent = 'Ver en mapa';
      btn.addEventListener('click', () => focusItem(it));
      actions.appendChild(btn);
      div.appendChild(text);
      div.appendChild(actions);
      resultList.appendChild(div);
    });
  }

  function focusItem(it){
    map.setView([it.lat, it.lon], 16);
    const found = itemMarkers.find(m => m.item === it);
    if(found){ found.marker.openPopup(); }
  }

  // Filtro local
  filtroInput && filtroInput.addEventListener('input', function(){
    const q = (filtroInput.value || '').toLowerCase();
    const filtered = customItems.filter(it => {
      const name = (it.name || '').toLowerCase();
      const addr = (it.address || '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
    markers.clearLayers();
    itemMarkers = [];
    filtered.forEach(addMarker);
    renderList(filtered);
    fitToMarkers();
  });

  // Se elimina geolocalización

  btnLimpiar.addEventListener('click', function(){
    filtroInput && (filtroInput.value = '');
    markers.clearLayers();
    itemMarkers = [];
    customItems.forEach(addMarker);
    renderList(customItems);
    map.setView(defaultLatLng, 7);
  });

  async function loadCustomJson(){
    try{
      const res = await fetch(CUSTOM_JSON_URL, { headers: { 'Accept': 'application/json' } });
      if(!res.ok) return; // opcional
      const data = await res.json();
      if(Array.isArray(data)){
        customItems = data.map(toItemFromCustom).filter(it => it.lat && it.lon);
        // Render inicial: todos los lugares del JSON
        customItems.forEach(addMarker);
        renderList(customItems);
        fitToMarkers();
      }
    }catch(err){
      console.warn('No se pudo cargar el JSON personalizado:', err);
    }
  }

  // Cargar al iniciar (si existe)
  loadCustomJson();
})();
