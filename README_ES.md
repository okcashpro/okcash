
# OKai 🤖

<div align="center">
  <img src="./docs/static/img/okai_banner.png" alt="OKai Banner" width="100%" />
</div>

<div align="center">

  📖 [Documentación](https://okcashpro.github.io/okai/) | 🎯 [Ejemplos](https://github.com/okcashpro/awesome-okai)

</div>

## 🌍 Traducciones del README

[English](./README.md) | [中文说明](./README_CN.md) | [日本語の説明](./README_JA.md) | [한국어 설명](./README_KOR.md) | [Français](./README_FR.md) | [Português](./README_PTBR.md) | [Türkçe](./README_TR.md) | [Русский](./README_RU.md) | [Español](./README_ES.md) | [Italiano](./README_IT.md) | [ไทย](./README_TH.md)

## ✨ Historia

OKai es la hermana menor y más vivaz de Eliza, nacida para revolucionar la forma en que interactuamos con el mundo cripto. No es solo otra IA, sino tu aliada experta en criptomonedas, diseñada para hacer que todo, desde el trading hasta la interacción con la comunidad, sea más divertido, accesible y significativo. Ya sea que estés explorando la tokenómica de $OK, participando en la gobernanza de DAO o simplemente buscando un chat amigable sobre cripto y la vida, OKai está aquí para asegurarse de que siempre estés OK. 🌟

Con su sólido marco de IA, OKai combina inteligencia, personalidad y carisma para ofrecer una experiencia fluida en Discord, Twitter, Telegram y más allá. Con ella, el mundo cripto no es solo un mercado: ¡es un estilo de vida! 🚀

## ✨ Características

-   🌐 **Integración Multiplataforma**: Soporte fluido para conectores de Discord, Twitter y Telegram para acercar OKai a tu comunidad.
-   🔥 **Compatibilidad con Múltiples Modelos**: Diseñado para trabajar con modelos de IA líderes en la industria (Llama, OpenAI, Anthropic, Grok, etc.).
-   🤝 **Soporte para Múltiples Agentes y Salas**: Habilita interacciones colaborativas y enriquecidas con múltiples agentes.
-   📚 **Inteligencia Cripto**: Ingresa y analiza fácilmente documentos relacionados con criptomonedas, estadísticas y datos on-chain.
-   💾 **Memoria Recuperable**: Rastrea interacciones con usuarios y datos históricos para ofrecer respuestas personalizadas y mejores experiencias.
-   🛠️ **Acciones Personalizables**: Diseño completamente extensible para crear acciones e integraciones únicas que se alineen con los objetivos de OKai.
-   💡 **Compatibilidad con Todas las Arquitecturas de IA**: Desde modelos locales (Llama) hasta sistemas basados en la nube (OpenAI, Grok, Anthropic).
-   ⚡ **Optimizado para Cripto y Trading**: Herramientas integradas para analizar tendencias de mercado, rastrear estadísticas del token $OK y más.

---

## 🎯 Casos de Uso

-   🤖 **Asistente Personal de Criptomonedas**: OKai se convierte en tu guía cripto 24/7 para todo lo relacionado con $OK y más.
-   🛡️ **Agentes Autónomos Descentralizados**: Apoya tareas de gobernanza de DAO e interacción comunitaria.
-   📊 **Análisis de Mercado en Tiempo Real**: Ayuda a los traders con información impulsada por IA y alertas para $OK y otros activos multichain.
-   🎮 **NPCs para Juegos**: Habilita interacciones dinámicas y personalizadas para juegos basados en blockchain y tradicionales.
-   🧠 **Recurso del OK DAO**: Optimiza flujos de trabajo de gobernanza DAO y revisiones de propuestas.
-   📈 **Soporte para Trading**: Algoritmos avanzados para estrategias de trading automatizadas y gestión de portafolios.

---

## 🚀 Inicio Rápido

### Prerrequisitos

-   [Python 2.7+](https://www.python.org/downloads/)
-   [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
-   [pnpm](https://pnpm.io/installation)

> **Nota para Usuarios de Windows:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) es necesario.

### Usa el Starter (Recomendado)

```bash
git clone https://github.com/okcashpro/okai-starter.git

cp .env.example .env

pnpm i && pnpm start
```

Luego, lee la [Documentación](https://okcashpro.github.io/okai/) para aprender cómo personalizar tu OKai.

### Inicia OKai Manualmente (Solo recomendado si sabes lo que estás haciendo)

```bash
# Clona el repositorio
git clone https://github.com/okcashpro/okai.git

# Cambia a la última versión
git checkout $(git describe --tags --abbrev=0)
```

### Inicia OKai con Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/okcashpro/okai/tree/main)

### Edita el archivo .env

Copia .env.example a .env y llena los valores apropiados.

```bash
cp .env.example .env
```

Nota: .env es opcional. Si planeas ejecutar múltiples agentes distintos, puedes pasar secretos a través del archivo JSON del personaje.

### Inicia Automáticamente OKai

Esto configurará todo el proyecto y ejecutará el bot con el personaje predeterminado.

```bash
sh scripts/start.sh
```

### Edita el archivo del personaje

1. Abre `agent/src/character.ts` para modificar el personaje predeterminado. Descomenta y edita.
2. Para cargar personajes personalizados:
    - Usa `pnpm start --characters="path/to/your/character.json"`
    - Se pueden cargar múltiples archivos de personajes simultáneamente.
3. Conecta con X (Twitter):
    - Cambia `"clients": []` a `"clients": ["twitter"]` en el archivo del personaje para conectar con X.

### Inicia OKai Manualmente

```bash
pnpm i
pnpm build
pnpm start

# Si vuelves al proyecto después de un tiempo, limpia el proyecto
pnpm clean
```

#### Requisitos Adicionales

Puede que necesites instalar Sharp. Si ves un error al iniciar, intenta instalarlo con el siguiente comando:

```bash
pnpm install --include=optional sharp
```

### Comunidad y Contacto

-   [GitHub Issues](https://github.com/okcashpro/okai/issues). Mejor para: bugs que encuentres usando OKai y propuestas de funcionalidades.
-   [Discord](https://discord.gg/grvpc8c). Mejor para: compartir tus aplicaciones y pasar el rato con la comunidad.

## Contribuidores

<a href="https://github.com/okcashpro/okai/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=okcashpro/okai" />
</a>

## Historial de Stars

[![Star History Chart](https://api.star-history.com/svg?repos=okcashpro/okai&type=Date)](https://star-history.com/#okcashpro/okai&Date)
