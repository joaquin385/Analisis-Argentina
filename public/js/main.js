// Estado de la aplicación
const estado = {
    categorias: null,
    categoriaSeleccionada: null,
    subcategoriaSeleccionada: null,
    periodoSeleccionado: null,
    analisisActual: null,
    estadoCarga: 'idle', // idle, cargando, error, sin_datos, ok
    periodosDisponibles: []
};

// Elementos del DOM
const elementos = {
    selectorCategoria: document.getElementById('selector-categoria'),
    selectorSubcategoria: document.getElementById('selector-subcategoria'),
    selectorPeriodo: document.getElementById('selector-periodo'),
    estadoCarga: document.getElementById('estado-carga'),
    mensajeError: document.getElementById('mensaje-error'),
    contenedorAnalisis: document.getElementById('contenedor-analisis'),
    analisisTexto: document.getElementById('analisis-texto'),
    tituloAnalisis: document.getElementById('titulo-analisis'),
    filtrosToggle: document.getElementById('filtros-toggle'),
    filtrosContenido: document.getElementById('filtros-contenido'),
    filtrosSection: document.querySelector('.filtros'),
    toggleDarkMode: document.getElementById('toggle-dark-mode')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await inicializar();
    await leerParametrosURL();
});

async function inicializar() {
    try {
        // Cargar categorías
        await cargarCategorias();
        
        // Poblar selectores
        poblarSelectorCategorias();
        
        // Cargar periodos disponibles
        await cargarPeriodosDisponibles();
        poblarSelectorPeriodos();
        
        // Event listeners
        elementos.selectorCategoria.addEventListener('change', onCategoriaCambio);
        elementos.selectorSubcategoria.addEventListener('change', onSubcategoriaCambio);
        elementos.selectorPeriodo.addEventListener('change', onPeriodoCambio);
        
        // Toggle filtros (mobile) - colapsar por defecto en mobile
        if (elementos.filtrosToggle && elementos.filtrosSection) {
            elementos.filtrosToggle.addEventListener('click', toggleFiltros);
            // En mobile, colapsar por defecto
            if (window.innerWidth <= 767) {
                elementos.filtrosSection.classList.add('contenido-colapsado');
            }
        }
        
        // Toggle dark mode
        if (elementos.toggleDarkMode) {
            elementos.toggleDarkMode.addEventListener('click', toggleDarkMode);
            // Cargar preferencia guardada
            cargarTemaGuardado();
        }
        
        // Leer parámetros de URL después de cargar todo
        await leerParametrosURL();
        
    } catch (error) {
        mostrarError('Error al inicializar la aplicación: ' + error.message);
    }
}

async function cargarCategorias() {
    try {
        // Agregar timestamp para evitar caché del navegador
        const urlConCache = `data/categorias.json?t=${Date.now()}`;
        const response = await fetch(urlConCache, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        estado.categorias = data.categorias;
    } catch (error) {
        throw new Error('No se pudo cargar categorias.json: ' + error.message);
    }
}

function poblarSelectorCategorias() {
    if (!estado.categorias) return;
    
    elementos.selectorCategoria.innerHTML = '<option value="">Seleccione una categoría</option>';
    
    estado.categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        elementos.selectorCategoria.appendChild(option);
    });
}

function poblarSelectorSubcategorias() {
    elementos.selectorSubcategoria.innerHTML = '<option value="">Seleccione una subcategoría</option>';
    elementos.selectorSubcategoria.disabled = true;
    
    if (!estado.categoriaSeleccionada) return;
    
    const categoria = estado.categorias.find(c => c.id === estado.categoriaSeleccionada);
    if (!categoria || !categoria.subcategorias) return;
    
    categoria.subcategorias.forEach(subcategoria => {
        const option = document.createElement('option');
        option.value = subcategoria.id;
        option.textContent = subcategoria.nombre;
        elementos.selectorSubcategoria.appendChild(option);
    });
    
    elementos.selectorSubcategoria.disabled = false;
}

async function cargarPeriodosDisponibles() {
    // Cargar períodos desde todas las categorías disponibles
    // Primero intentar desde desarrollo_economico_y_empleo como ejemplo
    await cargarPeriodosDesdeCategoria('desarrollo_economico_y_empleo');
}

async function cargarPeriodosDesdeCategoria(categoriaId, reemplazar = false) {
    try {
        const categoria = estado.categorias.find(c => c.id === categoriaId);
        if (!categoria) {
            console.warn(`Categoria ${categoriaId} no encontrada`);
            return;
        }
        
        const rutaJSON = `data/${categoriaId}/${categoria.nombre}.json`;
        // Agregar timestamp para evitar caché del navegador
        const urlConCache = `${rutaJSON}?t=${Date.now()}`;
        const response = await fetch(urlConCache, { cache: 'no-store' });
        
        if (response.ok) {
            const data = await response.json();
            if (data.analisis && typeof data.analisis === 'object') {
                const periodos = Object.keys(data.analisis).sort().reverse();
                if (reemplazar) {
                    // Reemplazar períodos existentes con los de esta categoría
                    estado.periodosDisponibles = periodos;
                } else {
                    // Combinar con períodos existentes y eliminar duplicados
                    const periodosUnicos = [...new Set([...estado.periodosDisponibles, ...periodos])].sort().reverse();
                    estado.periodosDisponibles = periodosUnicos;
                }
                return;
            }
        }
    } catch (error) {
        console.warn(`No se pudo cargar periodos desde ${categoriaId}:`, error);
    }
}

function poblarSelectorPeriodos() {
    elementos.selectorPeriodo.innerHTML = '<option value="">Seleccione un período</option>';
    
    if (estado.periodosDisponibles.length === 0) {
        elementos.selectorPeriodo.disabled = true;
        return;
    }
    
    estado.periodosDisponibles.forEach(periodo => {
        const option = document.createElement('option');
        option.value = periodo;
        // Formatear periodo para mostrar (ej: 2026-01 -> Enero 2026)
        const [anio, mes] = periodo.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        option.textContent = `${meses[parseInt(mes) - 1]} ${anio}`;
        elementos.selectorPeriodo.appendChild(option);
    });
    
    elementos.selectorPeriodo.disabled = false;
    
    // Seleccionar automáticamente el último periodo (el primero en la lista ordenada)
    if (estado.periodosDisponibles.length > 0) {
        const ultimoPeriodo = estado.periodosDisponibles[0];
        elementos.selectorPeriodo.value = ultimoPeriodo;
        estado.periodoSeleccionado = ultimoPeriodo;
    }
}

async function onCategoriaCambio(event) {
    estado.categoriaSeleccionada = event.target.value || null;
    estado.subcategoriaSeleccionada = null;
    estado.analisisActual = null;
    
    poblarSelectorSubcategorias();
    elementos.selectorSubcategoria.value = '';
    
    // Cargar períodos disponibles desde la categoría seleccionada (reemplazar los anteriores)
    if (estado.categoriaSeleccionada) {
        await cargarPeriodosDesdeCategoria(estado.categoriaSeleccionada, true);
        poblarSelectorPeriodos();
    }
    
    // Mantener el periodo seleccionado si está disponible, sino seleccionar el último
    if (estado.periodoSeleccionado && estado.periodosDisponibles.includes(estado.periodoSeleccionado)) {
        elementos.selectorPeriodo.value = estado.periodoSeleccionado;
    } else if (estado.periodosDisponibles.length > 0) {
        const ultimoPeriodo = estado.periodosDisponibles[0];
        elementos.selectorPeriodo.value = ultimoPeriodo;
        estado.periodoSeleccionado = ultimoPeriodo;
    }
    
    // Si hay periodo y categoría, cargar análisis de categoría
    if (estado.periodoSeleccionado && estado.categoriaSeleccionada) {
        cargarAnalisis();
    } else {
        ocultarAnalisis();
    }
    
    actualizarURL();
}

function onSubcategoriaCambio(event) {
    estado.subcategoriaSeleccionada = event.target.value || null;
    estado.analisisActual = null;
    
    actualizarURL();
    
    // Si hay periodo y categoría, cargar análisis
    if (estado.periodoSeleccionado && estado.categoriaSeleccionada) {
        cargarAnalisis();
    } else {
        ocultarAnalisis();
    }
}

function onPeriodoCambio(event) {
    estado.periodoSeleccionado = event.target.value || null;
    estado.analisisActual = null;
    
    actualizarURL();
    
    // Si hay categoría seleccionada, cargar análisis (de categoría o subcategoría según corresponda)
    if (estado.categoriaSeleccionada) {
        cargarAnalisis();
    } else {
        ocultarAnalisis();
    }
}

async function cargarAnalisis() {
    if (!estado.categoriaSeleccionada || !estado.periodoSeleccionado) {
        return;
    }
    
    estado.estadoCarga = 'cargando';
    mostrarCargando();
    ocultarError();
    ocultarAnalisis();
    
    try {
        const categoria = estado.categorias.find(c => c.id === estado.categoriaSeleccionada);
        
        let rutaJSON;
        
        // Si hay subcategoría seleccionada, cargar análisis de subcategoría
        // Si no, cargar análisis de categoría
        if (estado.subcategoriaSeleccionada) {
            const subcategoria = categoria.subcategorias.find(s => s.id === estado.subcategoriaSeleccionada);
            rutaJSON = `data/${estado.categoriaSeleccionada}/${estado.subcategoriaSeleccionada}/${subcategoria.nombre}.json`;
        } else {
            // Cargar análisis de categoría
            rutaJSON = `data/${estado.categoriaSeleccionada}/${categoria.nombre}.json`;
        }
        
        // Agregar timestamp para evitar caché del navegador
        const urlConCache = `${rutaJSON}?t=${Date.now()}`;
        const response = await fetch(urlConCache, { cache: 'no-store' });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('No se encontró el archivo de análisis');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extraer análisis del periodo
        if (!data.analisis || !data.analisis[estado.periodoSeleccionado]) {
            throw new Error('No hay datos para este período');
        }
        
        estado.analisisActual = data.analisis[estado.periodoSeleccionado];
        estado.estadoCarga = 'ok';
        
        renderizarAnalisis();
        
    } catch (error) {
        estado.estadoCarga = 'error';
        mostrarError('No hay datos para esta combinación. ' + error.message);
        ocultarAnalisis();
    }
}

function renderizarAnalisis() {
    if (!estado.analisisActual) return;
    
    // Actualizar título de la categoría/subcategoría
    const categoria = estado.categorias.find(c => c.id === estado.categoriaSeleccionada);
    if (categoria) {
        if (estado.subcategoriaSeleccionada) {
            const subcategoria = categoria.subcategorias.find(s => s.id === estado.subcategoriaSeleccionada);
            if (subcategoria) {
                elementos.tituloAnalisis.textContent = subcategoria.nombre;
            }
        } else {
            elementos.tituloAnalisis.textContent = categoria.nombre;
        }
    }
    
    // El análisis viene como texto plano, puede tener markdown básico
    let texto = estado.analisisActual;
    
    // Dividir el texto en secciones principales
    const secciones = dividirEnSecciones(texto);
    
    // Renderizar cada sección como un acordeón
    let htmlAcordeones = '';
    secciones.forEach((seccion, index) => {
        const idSeccion = `seccion-${index}`;
        const contenidoHTML = procesarMarkdown(seccion.contenido);
        htmlAcordeones += `
            <div class="acordeon-seccion">
                <button class="acordeon-titulo" aria-expanded="false" aria-controls="${idSeccion}">
                    <span class="acordeon-titulo-texto">${seccion.titulo}</span>
                    <span class="acordeon-icono">▼</span>
                </button>
                <div class="acordeon-contenido oculto" id="${idSeccion}">
                    ${contenidoHTML}
                </div>
            </div>
        `;
    });
    
    elementos.analisisTexto.innerHTML = htmlAcordeones;
    
    // Agregar event listeners a los botones de acordeón
    const botonesAcordeon = elementos.analisisTexto.querySelectorAll('.acordeon-titulo');
    botonesAcordeon.forEach(boton => {
        boton.addEventListener('click', function() {
            const contenido = this.nextElementSibling;
            const icono = this.querySelector('.acordeon-icono');
            const estaAbierto = !contenido.classList.contains('oculto');
            
            if (estaAbierto) {
                contenido.classList.add('oculto');
                icono.textContent = '▼';
                this.setAttribute('aria-expanded', 'false');
            } else {
                contenido.classList.remove('oculto');
                icono.textContent = '▲';
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });
    
    mostrarAnalisis();
}

function dividirEnSecciones(texto) {
    const secciones = [];
    const lineas = texto.split('\n');
    
    let seccionActual = null;
    let contenidoActual = [];
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        
        // Detectar inicio de sección: "### 1. Situación anterior", "### 2. Situación actual", "### 3. Indicadores"
        const matchSeccion = linea.match(/^###\s+(\d+)\.\s+(.+)$/);
        if (matchSeccion) {
            // Guardar sección anterior si existe
            if (seccionActual) {
                secciones.push({
                    titulo: seccionActual.titulo,
                    contenido: contenidoActual.join('\n')
                });
            }
            
            // Iniciar nueva sección
            const numero = matchSeccion[1];
            const titulo = matchSeccion[2];
            
            // Usar el título exacto del análisis
            seccionActual = { titulo: titulo };
            contenidoActual = [];
            continue;
        }
        
        // Si estamos en una sección, agregar la línea al contenido
        if (seccionActual) {
            contenidoActual.push(lineas[i]); // Mantener formato original
        }
    }
    
    // Agregar última sección
    if (seccionActual) {
        secciones.push({
            titulo: seccionActual.titulo,
            contenido: contenidoActual.join('\n')
        });
    }
    
    return secciones;
}

function procesarMarkdown(texto) {
    if (!texto) return '';
    
    // Primero, procesar línea por línea para detectar títulos
    const lineas = texto.split('\n');
    const lineasProcesadas = [];
    
    for (let i = 0; i < lineas.length; i++) {
        let linea = lineas[i].trim();
        
        // Títulos con ### (h3) - pero ya los procesamos, así que los ignoramos aquí
        if (linea.match(/^###\s+/)) {
            continue; // Ya procesado en dividirEnSecciones
        }
        
        // Títulos con ## (h2)
        if (linea.match(/^##\s+/)) {
            const titulo = linea.replace(/^##\s+/, '');
            lineasProcesadas.push(`<h2 class="titulo-seccion">${titulo}</h2>`);
            continue;
        }
        
        // Títulos con # (h1)
        if (linea.match(/^#\s+/)) {
            const titulo = linea.replace(/^#\s+/, '');
            lineasProcesadas.push(`<h2 class="titulo-seccion">${titulo}</h2>`);
            continue;
        }
        
        // Subtítulos con **Texto:** (h3)
        if (linea.match(/^\*\*[^*]+:\*\*$/)) {
            const titulo = linea.replace(/\*\*/g, '');
            lineasProcesadas.push(`<h3 class="subtitulo">${titulo}</h3>`);
            continue;
        }
        
        // Separadores ***
        if (linea.match(/^\*\*\*+$/)) {
            lineasProcesadas.push('<hr class="separador">');
            continue;
        }
        
        // Si no es un título, agregar la línea tal cual
        if (linea) {
            lineasProcesadas.push(linea);
        } else {
            lineasProcesadas.push(''); // Mantener saltos de línea vacíos
        }
    }
    
    // Unir las líneas y procesar el resto del markdown
    let textoProcesado = lineasProcesadas.join('\n');
    
    // Convertir **texto** a <strong>texto</strong>
    textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convertir saltos de línea dobles a párrafos
    textoProcesado = textoProcesado.split('\n\n').map(parrafo => {
        parrafo = parrafo.trim();
        if (!parrafo) return '';
        
        // Si ya es un título o separador, dejarlo tal cual
        if (parrafo.match(/^<h[1-6]|^<hr/)) {
            return parrafo;
        }
        
        // Si tiene números seguidos de punto al inicio, es una lista numerada
        if (parrafo.match(/^\d+\.\s/)) {
            const items = parrafo.split(/\n(?=\d+\.\s)/);
            return '<ol class="lista-numerada">' + items.map(item => {
                const textoItem = item.replace(/^\d+\.\s*/, '').trim();
                const textoProcesado = textoItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return `<li>${textoProcesado}</li>`;
            }).join('') + '</ol>';
        }
        
        // Si tiene - o * al inicio, es una lista
        if (parrafo.match(/^[-*]\s/)) {
            const items = parrafo.split(/\n(?=[-*]\s)/);
            return '<ul class="lista-viñetas">' + items.map(item => {
                const textoItem = item.replace(/^[-*]\s*/, '').trim();
                const textoProcesado = textoItem.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return `<li>${textoProcesado}</li>`;
            }).join('') + '</ul>';
        }
        
        // Convertir saltos de línea simples a <br>
        parrafo = parrafo.replace(/\n/g, '<br>');
        
        return `<p>${parrafo}</p>`;
    }).join('');
    
    return textoProcesado;
}

function mostrarCargando() {
    elementos.estadoCarga.classList.remove('oculto');
}

function ocultarCargando() {
    elementos.estadoCarga.classList.add('oculto');
}

function mostrarError(mensaje) {
    elementos.mensajeError.querySelector('p').textContent = mensaje;
    elementos.mensajeError.classList.remove('oculto');
}

function ocultarError() {
    elementos.mensajeError.classList.add('oculto');
}

function mostrarAnalisis() {
    ocultarCargando();
    elementos.contenedorAnalisis.classList.remove('oculto');
}

function ocultarAnalisis() {
    elementos.contenedorAnalisis.classList.add('oculto');
    elementos.analisisTexto.innerHTML = '';
    elementos.tituloAnalisis.textContent = '';
}

function actualizarURL() {
    const params = new URLSearchParams();
    if (estado.categoriaSeleccionada) {
        params.set('categoria', estado.categoriaSeleccionada);
    }
    if (estado.subcategoriaSeleccionada) {
        params.set('subcategoria', estado.subcategoriaSeleccionada);
    }
    if (estado.periodoSeleccionado) {
        params.set('periodo', estado.periodoSeleccionado);
    }
    
    const nuevaURL = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    
    window.history.pushState({}, '', nuevaURL);
}

async function leerParametrosURL() {
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get('categoria');
    const subcategoria = params.get('subcategoria');
    const periodo = params.get('periodo');
    
    if (categoria && estado.categorias) {
        elementos.selectorCategoria.value = categoria;
        estado.categoriaSeleccionada = categoria;
        poblarSelectorSubcategorias();
        
        // Cargar períodos desde la categoría seleccionada (reemplazar los anteriores)
        await cargarPeriodosDesdeCategoria(categoria, true);
        poblarSelectorPeriodos();
        
        if (subcategoria) {
            elementos.selectorSubcategoria.value = subcategoria;
            estado.subcategoriaSeleccionada = subcategoria;
        }
        
        if (periodo) {
            // Verificar que el período esté disponible
            if (estado.periodosDisponibles.includes(periodo)) {
                elementos.selectorPeriodo.value = periodo;
                estado.periodoSeleccionado = periodo;
            } else {
                // Si el período no está disponible, usar el último disponible
                if (estado.periodosDisponibles.length > 0) {
                    const ultimoPeriodo = estado.periodosDisponibles[0];
                    elementos.selectorPeriodo.value = ultimoPeriodo;
                    estado.periodoSeleccionado = ultimoPeriodo;
                }
            }
        } else {
            // Si no hay periodo en URL, usar el último disponible
            if (estado.periodosDisponibles.length > 0) {
                const ultimoPeriodo = estado.periodosDisponibles[0];
                elementos.selectorPeriodo.value = ultimoPeriodo;
                estado.periodoSeleccionado = ultimoPeriodo;
            }
        }
        
        // Cargar análisis si hay categoría y periodo
        if (estado.categoriaSeleccionada && estado.periodoSeleccionado) {
            cargarAnalisis();
        }
    }
}

// Funciones para filtros colapsables
function toggleFiltros() {
    if (elementos.filtrosSection) {
        elementos.filtrosSection.classList.toggle('contenido-colapsado');
        elementos.filtrosSection.classList.toggle('contenido-expandido');
    }
}

// Funciones para dark mode
function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function cargarTemaGuardado() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

