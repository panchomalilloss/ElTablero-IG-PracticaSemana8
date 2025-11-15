# Proyecto Mapa 3D de El Tablero (Maspalomas)

## 🗺️ Descripción del Proyecto
Este proyecto consiste en una visualización 3D interactiva del pueblo **El Tablero (Maspalomas)** utilizando **Three.js**.  
Incluye edificios extruidos desde datos OSM, marcadores interactivos, tooltip dinámico, controles WASD, filtros por categoría y una leyenda visual.

El objetivo es permitir explorar el mapa desde cualquier ángulo mientras se destacan puntos de interés importantes.

**Puede visualizar el proyecto [aquí](https://codesandbox.io/p/github/panchomalilloss/ElTablero-IG-PracticaSemana8/main?import=true)**

---

## ✨ Funcionalidades Principales

### 🏙️ 1. Edificios 3D desde OSM
- Extrusión automática basada en los contornos de los edificios.
- Material gris claro con borde negro para mejor contraste.
- Dibujo completo del polígono del edificio con su geometría extruida.

### 📍 2. Marcadores Elevados desde CSV
- Cada punto del archivo **puntos_tablero.csv** genera un marcador 3D.
- Cada categoría tiene un **color único** definido en el diccionario `categoryColors`.
- Los marcadores aparecen **elevados sobre los edificios** para evitar solapamientos.

### 💬 3. Tooltip Interactivo
- Muestra nombre, categoría y coordenadas exactas.
- Se posiciona automáticamente junto al marcador.
- Desaparece al hacer clic fuera del punto.
- Escala del marcador aumenta al pasar el ratón por encima (hover highlight).

### 🎮 4. Controles de Navegación
- Movimiento estilo videojuego:
  - **W / ↑** → Avanzar
  - **S / ↓** → Retroceder
  - **A / ←** → Izquierda
  - **D / →** → Derecha
- Control de cámara con mouse utilizando **OrbitControls**.
- Navegación suave y fluida.

### 🔍 5. Filtrado por Categorías
- Botones automáticos generados desde `categoryColors`.
- Botón **All** para restaurar la vista completa.
- Filtrado instantáneo sin recargar la escena.

### 🧭 6. Leyenda Superior Derecha
- Caja transparente con:
  - Color de cada categoría
  - Nombre de la categoría
- Se genera dinámicamente a partir de `categoryColors`.

---

## 📁 Archivos del Proyecto

### `script_elTablero.js`
Contiene:
- Carga y renderizado del mapa OSM
- Extrusión de edificios
- Lectura de CSV y creación de marcadores
- Interactividad (tooltip, hover, click)
- Movimiento WASD
- Filtros y leyenda
- Helpers para conversión de coordenadas

### `mapaTablero.osm`
Archivo OSM con **todos los edificios de El Tablero**, usado para generar los modelos 3D extruidos.

### `puntos_tablero.csv`
Archivo CSV con **todos los puntos de interés**, incluyendo:
- Restaurantes
- Supermercados
- Parques
- Farmacias
- Colegios e institutos
- Cultura
- Deporte
- Gasolineras
- Iglesias
- Etc.

## 🧩 Tecnologías Utilizadas
- **JavaScript**
- **Three.js**
- **OrbitControls**
- OSM Parsing (XML)
- HTML/CSS para los elementos UI
