<div align="center">

# 🃏 TekaPoker

### Gestión y liquidación de partidas de póker entre amigos

*Controla quién gana, calcula automáticamente quién paga a quién y analiza las estadísticas del grupo — con un analista de datos por IA incluido.*

[![Stack](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 📑 Índice

1. [¿Qué es TekaPoker?](#-qué-es-tekapoker)
2. [Funcionalidades](#-funcionalidades)
3. [El cálculo de la liquidación](#-el-cálculo-de-la-liquidación)
4. [Stack tecnológico](#-stack-tecnológico)
5. [Arquitectura](#-arquitectura)
6. [Estructura del proyecto](#-estructura-del-proyecto)
7. [Modelo de datos](#-modelo-de-datos)
8. [El analista IA](#-el-analista-ia)
9. [La caja de fichas](#-la-caja-de-fichas)
10. [Autenticación](#-autenticación)
11. [Puesta en marcha (local)](#-puesta-en-marcha-local)
12. [Variables de entorno](#-variables-de-entorno)
13. [Despliegue](#-despliegue)
14. [Costes](#-costes)

---

## 🎯 ¿Qué es TekaPoker?

TekaPoker es una **aplicación web móvil-first** para grupos de amigos que juegan al póker en casa. Resuelve el problema clásico de después de la partida: *"¿cuánto he ganado y quién le debe dinero a quién?"*.

El usuario introduce el dinero que ha puesto cada jugador (*buy-in*) y las fichas con las que termina cada uno. La app convierte fichas en euros, calcula las ganancias/pérdidas de cada jugador y genera **el conjunto mínimo de pagos** necesarios para saldar todas las deudas. Además guarda el histórico de partidas, mantiene un ranking global y ofrece estadísticas avanzadas y un chat de análisis impulsado por IA.

Está pensada para usarse **después** de la partida (registro y liquidación), no durante el juego.

---

## ✨ Funcionalidades

### 🎮 Gestión de partidas
- **Selección de jugadores** desde una lista persistente (se pueden crear al vuelo).
- **Buy-in individual por jugador**: cada jugador puede haber puesto una cantidad distinta (p. ej. alguien que recompra 5 € extra durante la partida). Se parte de un *buy-in por defecto* y se ajusta por persona.
- **Recompras entre jugadores**: cuando alguien se queda sin fichas y se las compra a otro jugador (porque ya no quedan en la caja) y se lo paga al liquidar. La app lo tiene en cuenta automáticamente para que las cuentas cuadren (ver [el cálculo](#-el-cálculo-de-la-liquidación)).
- **Cálculo de liquidación**: convierte fichas en dinero y calcula quién paga a quién con el **mínimo número de transferencias**.

### 📊 Histórico y estadísticas
- **Historial** de todas las partidas guardadas, con detalle de jugadores y pagos.
- **Ranking global** con podio para el top 3 y clasificación completa (partidas, win-rate, neto total, media por partida).
- **Estadísticas por jugador**: neto total, win-rate, mejor/peor partida, rachas, gráfica de evolución e historial.

### 📈 Analíticas avanzadas
- **Evolución del dinero acumulado** de todos los jugadores en una sola gráfica, con la línea del jugador elegido resaltada.
- **Comparador de jugadores**: gráfica de barras que compara a todos los jugadores en la métrica que elijas (neto total, media por partida, win-rate, volatilidad o partidas jugadas).
- **Ranking de consistencia** (volatilidad / desviación típica del resultado).
- **Tendencia / racha** reciente de cada jugador (en alza, en baja, estable).
- **Distribución de partidas** por número de jugadores en mesa.

### 🤖 Analista IA
- Chat en lenguaje natural que responde preguntas sobre los datos del grupo.
- Selector **"¿Quién eres?"** para personalizar el análisis desde la perspectiva de un jugador concreto.
- Las respuestas se basan **exclusivamente en los datos reales** de la base de datos (sin inventar cifras).

### 🎰 Caja de fichas
- Configura tu set físico de fichas: color, **valor en puntos** (editable por partida) y cantidad.
- Reparte las fichas **a partes iguales** entre los jugadores y calcula el **valor de cada punto** en euros a partir del buy-in, además de la reserva que queda para recompras.

### 🔐 Acceso protegido
- La app está protegida por una contraseña sencilla para evitar accesos no deseados.

---

## 🧮 El cálculo de la liquidación

El corazón de la app es el archivo [`frontend/src/services/calculator.js`](frontend/src/services/calculator.js). El algoritmo funciona así:

#### 1. Valor de cada ficha
```
valorPorFicha = (suma de todos los buy-ins) / (suma de todas las fichas finales)
```

#### 2. Resultado de cada jugador
```
dineroFinal = fichasFinales × valorPorFicha
neto        = dineroFinal − buyInEfectivo
```
> Un `neto` positivo significa que el jugador gana dinero; negativo, que lo pierde. La suma de todos los netos es siempre **0** (lo que pierden unos lo ganan otros).

#### 3. Liquidación con el mínimo de pagos
Se separan los jugadores en **acreedores** (ganan) y **deudores** (pierden) y se aplica un **algoritmo voraz (greedy)**: el mayor deudor paga al mayor acreedor; quien queda saldado avanza al siguiente. Esto minimiza el número de transferencias necesarias.

#### 4. Recompras entre jugadores (el caso especial)
Cuando **A compra fichas a B** (porque se acabaron las de la caja) y se lo paga al liquidar:

- El **bote no cambia** — esas fichas ya estaban en juego.
- El buy-in efectivo de **A sube** (debe ese dinero) y el de **B baja** (ya "cobró" vendiendo sus fichas).

```
buyInEfectivo = buyIn + (fichas compradas a otros) − (fichas vendidas a otros)
```

De este modo la deuda por las fichas se **netea automáticamente** con el resultado del juego y aparece reflejada en los pagos finales, sin pagos manuales aparte. La propiedad de que *la suma de netos = 0* se mantiene siempre.

> **Ejemplo:** 4 jugadores ponen 10 € cada uno (bote = 40 €). A se queda sin fichas y compra 10 € a B. Al final A va perdiendo y B ganando: la app calcula que **A le paga 5 € a B**, importe que ya combina la compra de fichas con el resultado de la partida.

---

## 🛠 Stack tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| **Frontend** | React 18 + Vite 5 | SPA móvil-first |
| **Routing** | React Router 6 | Navegación entre páginas |
| **Estilos** | CSS puro (design tokens) | Tema oscuro tipo mesa de póker |
| **Iconos** | lucide-react | Iconografía |
| **Gráficas** | Recharts | Evolución de ganancias y analíticas |
| **Base de datos** | Supabase (PostgreSQL) | Jugadores, partidas y pagos |
| **Función serverless** | Vercel Serverless Functions (Node) | Endpoint del analista IA |
| **IA** | Groq API (Llama 3.3) | Generación de respuestas del chat |
| **Hosting** | Vercel | Despliegue continuo desde GitHub |

---

## 🏗 Arquitectura

```
                          ┌─────────────────────────────┐
                          │      Navegador (móvil)       │
                          │   React SPA (Vite build)     │
                          └──────────┬───────────┬───────┘
                                     │           │
           Consultas de datos (CRUD) │           │ Pregunta del chat
                                     ▼           ▼
                       ┌──────────────────┐  ┌────────────────────────┐
                       │     Supabase     │  │  /api/chat (Vercel fn)  │
                       │   PostgreSQL     │  │  guarda la clave de IA  │
                       │ players / games  │  └───────────┬─────────────┘
                       │ game_players /   │              │
                       │ transactions     │              ▼
                       └──────────────────┘     ┌──────────────────┐
                                                │    Groq API      │
                                                │   (Llama 3.3)    │
                                                └──────────────────┘
```

**Puntos clave del diseño:**
- El frontend habla **directamente** con Supabase para todas las operaciones de datos (no hay backend propio para el CRUD).
- La clave de la IA **nunca llega al navegador**: el navegador llama a una función serverless propia (`/api/chat`), que es la única que conoce la clave y habla con Groq.
- El cálculo de la liquidación se hace **en el cliente** (no necesita servidor).

---

## 📁 Estructura del proyecto

```
tekapoker/
├── README.md                  ← este archivo
├── supabase/
│   └── schema.sql             ← esquema SQL para crear las tablas
└── frontend/
    ├── api/
    │   └── chat.js            ← función serverless: analista IA (Groq)
    ├── vercel.json            ← rewrites del SPA (excluye /api)
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx           ← punto de entrada de React
        ├── App.jsx            ← rutas + ruta protegida por login
        ├── components/
        │   ├── Navbar.jsx          ← navegación inferior + logout
        │   ├── Toast.jsx           ← notificaciones
        │   ├── ConfirmDialog.jsx   ← confirmaciones de borrado
        │   └── LoadingSpinner.jsx
        ├── pages/
        │   ├── Login.jsx           ← pantalla de acceso (contraseña)
        │   ├── Home.jsx            ← dashboard + accesos rápidos
        │   ├── NewGame.jsx         ← nueva partida + recompras
        │   ├── Results.jsx         ← resultados y liquidación
        │   ├── History.jsx         ← historial de partidas
        │   ├── Ranking.jsx         ← ranking global
        │   ├── Analytics.jsx       ← analíticas avanzadas + chat IA
        │   ├── ChipCase.jsx        ← caja de fichas
        │   ├── Players.jsx         ← gestión de jugadores
        │   └── PlayerStats.jsx     ← estadísticas de un jugador
        └── services/
            ├── supabase.js         ← cliente de Supabase
            ├── database.js         ← todas las consultas a la BD
            ├── calculator.js       ← algoritmo de liquidación
            ├── analytics.js        ← motor de estadísticas (cálculo puro)
            ├── chipCase.js         ← lógica de reparto de fichas (localStorage)
            └── ai.js               ← cliente del endpoint /api/chat
```

---

## 🗄 Modelo de datos

La base de datos vive en Supabase (PostgreSQL). El esquema completo está en [`supabase/schema.sql`](supabase/schema.sql).

| Tabla | Descripción | Campos principales |
|-------|-------------|--------------------|
| **`players`** | Jugadores registrados de forma permanente | `id`, `name` (único), `avatar_color`, `created_at` |
| **`games`** | Cada sesión de póker jugada | `id`, `played_at`, `buy_in`, `total_players`, `notes` |
| **`game_players`** | Resultado de cada jugador en una partida | `id`, `game_id`, `player_id`, `points`, `final_money`, `net` |
| **`transactions`** | Pagos para liquidar una partida | `id`, `game_id`, `from_player_id`, `to_player_id`, `amount` |

**Relaciones:** un `game` tiene varios `game_players` y varias `transactions`. Al borrar una partida, sus filas hijas se eliminan en cascada (`ON DELETE CASCADE`).

> Las estadísticas y los resultados (incluidas las recompras entre jugadores) quedan reflejados en el campo `net`, por lo que **no se necesita ampliar el esquema** para esas funcionalidades.

---

## 🤖 El analista IA

El chat de análisis está pensado para ser **útil y fiable**, evitando que el modelo "alucine" datos.

#### ¿Cómo evita inventarse cosas?
Funciona como un **RAG ligero**: en lugar de una base de datos vectorial, el frontend **calcula un resumen estructurado** de todas las estadísticas (a partir de los datos reales de Supabase) y se lo envía al modelo como contexto. El *system prompt* incluye reglas estrictas:

- Solo puede usar los datos del JSON que recibe.
- Si un dato no está, debe responder *"No tengo ese dato registrado"*.
- No puede inventar cifras, nombres ni partidas.
- Se ejecuta con **temperatura baja** para respuestas deterministas.

#### Perspectiva de jugador
El selector *"¿Quién eres?"* indica al modelo desde qué jugador se está hablando, para que se dirija a esa persona en segunda persona y compare sus datos con el grupo. El usuario puede elegir cualquier jugador, lo que da más juego (puedes analizar el perfil de cualquiera).

#### Flujo técnico
```
Analytics.jsx → services/ai.js → POST /api/chat → Groq API → respuesta
```
La clave de la IA solo existe en la función serverless `frontend/api/chat.js` (variable de entorno del servidor). El navegador nunca la ve.

> **Nota:** en desarrollo local con `vite`, el chat IA no funciona porque la función serverless solo se ejecuta en Vercel (o con `vercel dev`). El resto de la app sí funciona en local.

---

## 🎰 La caja de fichas

Página local (no usa base de datos; guarda la configuración en el `localStorage` del navegador).

> **Importante:** las fichas valen **puntos**, no dinero. Cada color tiene un valor en puntos (por defecto blanca = 1, roja = 2, verde = 5, azul = 10, negra = 20), **editable** porque en algunas partidas se cambia el valor de algún color.

1. Configuras tus fichas: **color**, **valor en puntos** y **cantidad** de cada tipo.
2. Indicas el **buy-in** (€) por jugador y el **número de jugadores**.
3. La app reparte las fichas **a partes iguales** entre los jugadores: cada uno recibe `floor(cantidad / jugadores)` de cada color, y el resto queda como **reserva** en la caja (útil para recompras).
4. Como todos arrancan con el mismo *stack* en puntos, el valor monetario de cada punto sale del buy-in:

```
valorPorPunto (€) = buyIn / puntosPorJugador
```

De modo que el valor de un stack completo siempre equivale al buy-in. La página muestra **puntos por jugador**, **valor por punto** y la **reserva restante** por color.

Implementación: [`frontend/src/services/chipCase.js`](frontend/src/services/chipCase.js) y [`frontend/src/pages/ChipCase.jsx`](frontend/src/pages/ChipCase.jsx).

---

## 🔐 Autenticación

La app está protegida por una **contraseña sencilla** (protección básica, no pensada como seguridad fuerte). El objetivo es evitar que cualquiera pueda entrar y modificar los datos.

- La pantalla [`Login.jsx`](frontend/src/pages/Login.jsx) valida la contraseña y guarda una marca de sesión en `localStorage`.
- En [`App.jsx`](frontend/src/App.jsx), un componente `ProtectedLayout` redirige a `/login` si no hay sesión activa.
- El botón **"Salir"** de la barra inferior borra la sesión.

> La contraseña no se documenta aquí por motivos obvios.

---

## 🚀 Puesta en marcha (local)

#### Requisitos previos
- Node.js 18+
- Una cuenta de [Supabase](https://supabase.com) (gratuita)
- (Opcional, para el chat) una cuenta de [Groq](https://console.groq.com) (gratuita)

#### 1. Clonar e instalar
```bash
git clone https://github.com/imartinnez/TekaPoker.git
cd TekaPoker/frontend
npm install
```

#### 2. Crear la base de datos
En el panel de Supabase → **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).

#### 3. Configurar las variables de entorno
Crea un archivo `frontend/.env` a partir de `frontend/.env.example` (ver [variables de entorno](#-variables-de-entorno)).

#### 4. Arrancar en modo desarrollo
```bash
npm run dev          # http://localhost:5173
```

#### 5. Compilar para producción
```bash
npm run build        # genera frontend/dist/
npm run preview      # previsualiza el build
```

---

## 🔧 Variables de entorno

| Variable | Dónde se usa | Descripción |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | Cliente (build) | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Cliente (build) | Clave pública (anon) de Supabase |
| `GROQ_API_KEY` | Servidor (Vercel) | Clave de la API de Groq para el chat IA |
| `GROQ_MODEL` | Servidor (Vercel) | *(Opcional)* modelo a usar; por defecto `llama-3.3-70b-versatile` |

> ⚠️ Las variables `VITE_*` se incluyen en el bundle del cliente (úsalas solo para claves públicas).
> `GROQ_API_KEY` es **secreta** y se configura **solo** como variable de entorno en Vercel (Settings → Environment Variables), nunca en el código.

---

## ☁️ Despliegue

La app se despliega automáticamente en **Vercel** con cada push a la rama `main`.

#### Configuración en Vercel
- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GROQ_API_KEY` (y opcionalmente `GROQ_MODEL`).

#### Cómo funciona
- El contenido de `frontend/` se compila con Vite y se sirve como sitio estático.
- La carpeta `frontend/api/` se despliega automáticamente como **funciones serverless** (el endpoint del chat IA).
- `vercel.json` reescribe todas las rutas al `index.html` del SPA **excepto** las que empiezan por `/api/`, para que la función del chat funcione correctamente.

```bash
git add -A
git commit -m "..."
git push origin main      # Vercel despliega solo
```

---

## 💸 Costes

TekaPoker está diseñada para funcionar **100 % gratis**:

| Servicio | Plan | Límite relevante |
|----------|------|------------------|
| **Vercel** | Hobby (gratis) | 100 000 invocaciones de función/mes |
| **Supabase** | Free | Suficiente para un grupo de amigos |
| **Groq** | Free | ~14 400 peticiones/día (no requiere tarjeta) |

> Para un grupo de amigos con unas pocas partidas y consultas al día, el uso queda muy por debajo de los límites gratuitos.

---

<div align="center">

**♠ ♥ ♦ ♣ — Que gane el mejor.**

</div>
