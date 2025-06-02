// Variables globals
let data = [];
let currentPage = 0;
const ITEMS_PER_PAGE = 33;
const DEBOUNCE_DELAY = 300;
let filterTimeout;
let filteredData = [];
let previousState = null; // Estado anterior para el botón "Volver atrás"

// Elementos del DOM
const elements = {
    tren: document.getElementById('tren'),
    linia: document.getElementById('linia'),
    ad: document.getElementById('ad'),
    estacio: document.getElementById('estacio'),
    torn: document.getElementById('torn'), // Nuevo filtro para Torn
    horaInici: document.getElementById('horaInici'),
    horaFi: document.getElementById('horaFi'),
    resultContainer: document.getElementById('resultContainer'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('errorMessage'),
    clearFilters: document.getElementById('clearFilters'),
    resultats: document.getElementById('resultats'),
    currentYear: document.getElementById('current-year')
};

// Utilidad para mostrar errores
const showError = (message) => {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    setTimeout(() => (elements.errorMessage.style.display = 'none'), 5000);
};

// Función para guardar el estado actual
function saveCurrentState() {
    previousState = {
        filters: {
            tren: elements.tren.value.trim(),
            linia: elements.linia.value.trim(),
            ad: elements.ad.value.trim(),
            estacio: elements.estacio.value.trim(),
            torn: elements.torn.value.trim(),
            horaInici: elements.horaInici.value.trim(),
            horaFi: elements.horaFi.value.trim()
        },
        filteredData: [...filteredData],
        currentPage: currentPage
    };
}

// Función para restaurar el estado anterior
function restorePreviousState() {
    if (!previousState) return;
    
    // Restaurar filtros
    elements.tren.value = previousState.filters.tren;
    elements.linia.value = previousState.filters.linia;
    elements.ad.value = previousState.filters.ad;
    elements.estacio.value = previousState.filters.estacio;
    elements.torn.value = previousState.filters.torn;
    elements.horaInici.value = previousState.filters.horaInici;
    elements.horaFi.value = previousState.filters.horaFi;
    
    // Restaurar datos y página
    filteredData = [...previousState.filteredData];
    currentPage = previousState.currentPage;
    
    // Actualizar tabla y limpiar estado anterior
    updateTable();
    previousState = null;
    updateBackButton();
}

// Función para crear/actualizar el botón "Volver atrás"
function updateBackButton() {
    let backButton = document.getElementById('backButton');
    
    if (previousState && !backButton) {
        // Crear botón si no existe y hay estado anterior
        backButton = document.createElement('button');
        backButton.id = 'backButton';
        backButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"/>
            </svg>
            <span>Tornar</span>
        `;
        
        // Estilos iOS-like
        backButton.style.cssText = `
                position: absolute;
                top: 15px;
                left: 15px;
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(0, 122, 255, 0.1);
                border: 1px solid #2c3e50;
                border-radius: 20px;
                padding: 4px 8px;
                color: #2c3e50;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: ;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow:;
                z-index: 10;        
        `;
        
       /* // Efectos hover y active
        backButton.addEventListener('mouseenter', () => {
            backButton.style.background = 'rgba(0, 122, 255, 0.15)';
            backButton.style.transform = 'translateY(-1px)';
            backButton.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.2)';
        });
        
        backButton.addEventListener('mouseleave', () => {
            backButton.style.background = 'rgba(0, 122, 255, 0.1)';
            backButton.style.transform = 'translateY(0)';
            backButton.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.15)';
        });
        
        backButton.addEventListener('mousedown', () => {
            backButton.style.transform = 'translateY(0) scale(0.95)';
        });
        
        backButton.addEventListener('mouseup', () => {
            backButton.style.transform = 'translateY(-1px) scale(1)';
        });*/
        
        backButton.addEventListener('click', restorePreviousState);
        
        // Insertar en el contenedor de resultados con posición relativa
        elements.resultContainer.style.position = 'relative';
        elements.resultContainer.appendChild(backButton);
    } else if (!previousState && backButton) {
        // Eliminar botón si no hay estado anterior
        backButton.remove();
    }
}

// Función genérica de fetch con manejo de error
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    return response.json();
}

// Función para cargar las estacions
async function cargarEstaciones() {
    try {
        const estacionesData = await fetchJSON('estacions.json');
        const datalist = document.getElementById('estacions');
        estacionesData.forEach(estacion => {
            const option = document.createElement('option');
            option.value = estacion.value;
            option.textContent = estacion.name;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando las estaciones:', error);
        showError('Error al cargar las estaciones');
    }
}

// Función para actualizar el título de la tabla
function updateTableTitle() {
    const select = elements.ad;
    const title = document.getElementById('table-title');
    const value = select.value;
    if (value === 'A') {
        title.textContent = 'Ascendents';
    } else if (value === 'D') {
        title.textContent = 'Descendents';
    } else {
        title.textContent = 'Ascendents/Descendents';
    }
}

// Funciones de conversión de tiempo
const timeToMinutes = timeStr => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Función para cargar datos desde un archivo dado
async function loadData(filename = 'itinerari_LA51_2_0_1_asc_desc.json') {
    try {
        elements.loading.classList.add('visible');
        const jsonData = await fetchJSON(filename);
        data = jsonData;
        elements.resultContainer.style.display = 'none';
        filteredData = [];
        // Limpiar estado anterior al cargar nuevos datos
        previousState = null;
        updateBackButton();
        return data;
    } catch (error) {
        console.error('Error al cargar dades:', error);
        showError('Error al cargar les dades');
        throw error;
    } finally {
        elements.loading.classList.remove('visible');
    }
}

// Función para registrar los event listeners del menú
function initMenuListeners() {
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const filename = e.target.dataset.file;
            try {
                await loadData(filename);
                const title = filename.includes('0_1') ? '000/100' : 
                              filename.includes('4_5') ? '400/500' : 
                              filename.includes('2_3') ? '200/300' : 
                              'feiners';
                document.querySelector('h1').textContent = `Servei ${title}`;
            } catch (error) {
                console.error('Error al canviar d\'itinerari:', error);
            }
        });
    });
}

// Función debounce para optimizar llamadas a filterData
function debounce(func, delay) {
    return function (...args) {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Función para limpiar filtros y actualizar la tabla
function clearFilters() {
    elements.tren.value = '';
    elements.linia.value = '';
    elements.ad.value = '';
    elements.estacio.value = '';
    elements.torn.value = ''; // Limpiar filtro Torn
    elements.horaInici.value = '';
    elements.horaFi.value = '';
    elements.resultContainer.style.display = 'none';
    filteredData = [];
    // Limpiar estado anterior
    previousState = null;
    updateBackButton();
    updateTable();
}

// Función para ordenar resultados basados en la hora
const sortResultsByTime = results => {
    return results.sort((a, b) => {
        const timeA = timeToMinutes(a.hora);
        const timeB = timeToMinutes(b.hora);
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        const adjustedTimeA = timeA < 240 ? timeA + 1440 : timeA;
        const adjustedTimeB = timeB < 240 ? timeB + 1440 : timeB;
        return adjustedTimeA - adjustedTimeB;
    });
};

// Función para determinar si se debe resaltar la hora
const greenTrains = ["M301", "L103","L105", "M303", "L109", "L111", "L106", "M302", "L110", "L112", "M304", "L116", "L814",
                     "L163", "L165", "L167", "L169", "L171", "L173", "L856", "L164", "L166", "L168", "L170", "L172", "L174",
                     "L176", "L858"];

function shouldHighlightGreenTime(entry) {
    return greenTrains.includes(entry.tren);
}

function shouldHighlightTime(entry) {
    const estaciones = {
        R5: ["MV", "CL", "CG"],
        R6: ["MV", "CG"],
        R50: ["MG", "ML", "CG", "CL", "CR", "QC", "PL", "MV", "ME", "AE", "CB"],
        R60: ["MG", "ML", "CG", "CR", "QC", "PA", "PL", "MV", "ME", "BE", "CP"]
    };

    const specificTrains = ["N334", "P336", "P362", "N364", "P364", "N366", "P366"];
    const isLineaValid = Object.keys(estaciones).includes(entry.linia) && estaciones[entry.linia].includes(entry.estacio);
    const isSpecificTrain = specificTrains.includes(entry.tren);
    return isLineaValid && !(isSpecificTrain && entry.ad === "D");
}

// Función de filtrado principal
function filterData() {
    const filters = {
        tren: elements.tren.value.trim(),
        linia: elements.linia.value.trim(),
        ad: elements.ad.value.trim(),
        estacio: elements.estacio.value.trim(),
        torn: elements.torn.value.trim(),
        horaInici: elements.horaInici.value.trim(),
        horaFi: elements.horaFi.value.trim()
    };

    const hasActiveFilters = Object.values(filters).some(value => value);
    if (!hasActiveFilters) {
        elements.resultContainer.style.display = 'none';
        filteredData = [];
        return;
    }

    currentPage = 0;
    let horaIniciMin = timeToMinutes(filters.horaInici);
    let horaFiMin = timeToMinutes(filters.horaFi);

    // Ajustar las horas para manejar correctamente los tiempos después de medianoche
    if (horaIniciMin !== null && horaIniciMin < 240) {
        horaIniciMin += 1440; // Añadir 24 horas a las horas después de medianoche
    }
    if (horaFiMin !== null && horaFiMin < 240) {
        horaFiMin += 1440;
    }

    // Función auxiliar para ajustar el tiempo
    const adjustTime = (timeMin) => {
        if (timeMin === null) return null;
        return timeMin < 240 ? timeMin + 1440 : timeMin;
    };

    if (filters.linia && !filters.estacio) {
        const seenTrains = new Set();
        filteredData = data
            .filter(item => item.Linia.toLowerCase().includes(filters.linia.toLowerCase()))
            .flatMap(item => {
                if (seenTrains.has(item.Tren)) return [];
                
                const stations = Object.keys(item)
                    .filter(key => !['Tren', 'Linia', 'A/D', 'Serveis', 'Torn', 'Tren_S'].includes(key) && item[key])
                    .sort((a, b) => {
                        const tA = timeToMinutes(item[a]);
                        const tB = timeToMinutes(item[b]);
                        return tA - tB;
                    });

                for (const station of stations) {
                    const timeMin = timeToMinutes(item[station]);
                    const adjustedTimeMin = adjustTime(timeMin);
                    let matchesTimeRange = true;

                    if (horaIniciMin !== null) {
                        if (horaFiMin === null) {
                            matchesTimeRange = adjustedTimeMin >= horaIniciMin;
                        } else {
                            if (horaIniciMin > horaFiMin) {
                                matchesTimeRange = adjustedTimeMin >= horaIniciMin || timeMin <= horaFiMin;
                            } else {
                                matchesTimeRange = adjustedTimeMin >= horaIniciMin && adjustedTimeMin <= horaFiMin;
                            }
                        }
                    }

                    if (matchesTimeRange) {
                        seenTrains.add(item.Tren);
                        return [{
                            tren: item.Tren,
                            linia: item.Linia,
                            ad: item['A/D'],
                            torn: item.Torn,
                            tren_s: item.Tren_S,
                            estacio: station,
                            hora: item[station]
                        }];
                    }
                }
                return [];
            })
            .filter(entry => (
                (!filters.tren || entry.tren.toLowerCase().includes(filters.tren.toLowerCase())) &&
                (!filters.ad || entry.ad === filters.ad) &&
                (!filters.torn || entry.torn.toLowerCase().includes(filters.torn.toLowerCase()))
            ));
    } else if (filters.torn) {
        filteredData = data
            .filter(item => item.Torn && item.Torn.toLowerCase().includes(filters.torn.toLowerCase()))
            .map(item => {
                const stations = Object.keys(item)
                    .filter(key => !['Tren', 'Linia', 'A/D', 'Serveis', 'Torn', 'Tren_S'].includes(key) && item[key])
                    .sort((a, b) => {
                        const tA = timeToMinutes(item[a]);
                        const tB = timeToMinutes(item[b]);
                        return tA - tB;
                    });
                if (stations.length > 0) {
                    const selectedStation = stations[0];
                    return {
                        tren: item.Tren,
                        linia: item.Linia,
                        ad: item['A/D'],
                        torn: item.Torn,
                        tren_s: item.Tren_S,
                        estacio: selectedStation,
                        hora: item[selectedStation]
                    };
                }
            })
            .filter(entry => {
                if (!entry) return false;
                const timeMin = timeToMinutes(entry.hora);
                const adjustedTimeMin = adjustTime(timeMin);
                let matchesTimeRange = true;

                if (horaIniciMin !== null) {
                    if (horaFiMin === null) {
                        matchesTimeRange = adjustedTimeMin >= horaIniciMin;
                    } else {
                        if (horaIniciMin > horaFiMin) {
                            matchesTimeRange = adjustedTimeMin >= horaIniciMin || timeMin <= horaFiMin;
                        } else {
                            matchesTimeRange = adjustedTimeMin >= horaIniciMin && adjustedTimeMin <= horaFiMin;
                        }
                    }
                }
                return (
                    (!filters.tren || entry.tren.toLowerCase().includes(filters.tren.toLowerCase())) &&
                    (!filters.linia || entry.linia.toLowerCase().includes(filters.linia.toLowerCase())) &&
                    (!filters.ad || entry.ad === filters.ad) &&
                    (!filters.estacio || entry.estacio.toLowerCase().includes(filters.estacio.toLowerCase())) &&
                    (!filters.torn || entry.torn.toLowerCase().includes(filters.torn.toLowerCase())) &&
                    matchesTimeRange
                );
            });
    } else {
        filteredData = data.flatMap(item =>
            Object.keys(item)
                .filter(key => !['Tren', 'Linia', 'A/D', 'Serveis', 'Torn', 'Tren_S'].includes(key) && item[key])
                .map(station => ({
                    tren: item.Tren,
                    linia: item.Linia,
                    ad: item['A/D'],
                    torn: item.Torn,
                    tren_s: item.Tren_S,
                    estacio: station,
                    hora: item[station]
                }))
            .filter(entry => {
                const timeMin = timeToMinutes(entry.hora);
                const adjustedTimeMin = adjustTime(timeMin);
                let matchesTimeRange = true;

                if (horaIniciMin !== null) {
                    if (horaFiMin === null) {
                        matchesTimeRange = adjustedTimeMin >= horaIniciMin;
                    } else {
                        if (horaIniciMin > horaFiMin) {
                            matchesTimeRange = adjustedTimeMin >= horaIniciMin || timeMin <= horaFiMin;
                        } else {
                            matchesTimeRange = adjustedTimeMin >= horaIniciMin && adjustedTimeMin <= horaFiMin;
                        }
                    }
                }
                
                return (
                    (!filters.tren || entry.tren.toLowerCase().includes(filters.tren.toLowerCase())) &&
                    (!filters.linia || entry.linia.toLowerCase().includes(filters.linia.toLowerCase())) &&
                    (!filters.ad || entry.ad === filters.ad) &&
                    (!filters.estacio || entry.estacio.toLowerCase().includes(filters.estacio.toLowerCase())) &&
                    (!filters.torn || entry.torn.toLowerCase().includes(filters.torn.toLowerCase())) &&
                    matchesTimeRange
                );
            })
        );
    }
    filteredData = sortResultsByTime(filteredData);
    updateTable();
}

// Función para actualizar la tabla de resultados
function updateTable() {
    const tbody = elements.resultats.querySelector('tbody');
    tbody.innerHTML = '';

    if (!filteredData.length) {
        elements.resultContainer.style.display = 'none';
        return;
    }

    const fragment = document.createDocumentFragment();
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = filteredData.slice(startIndex, endIndex);

    itemsToShow.forEach((entry, index) => {
        const row = document.createElement('tr');
        const rowNumber = startIndex + index + 1;
        
        let horaClass = '';
        if (shouldHighlightGreenTime(entry)) {
            horaClass = 'highlighted-green';
        } else if (shouldHighlightTime(entry)) {
            horaClass = 'highlighted-time';
        }
        
        // Agregar clase CSS para filas con línea M
        let rowClass = '';
        if (entry.linia === 'M') {
            rowClass = 'linia-m-row';
        }
        
        if (rowClass) {
            row.className = rowClass;
        }
        
        row.innerHTML = `
            <td class="row-number">${rowNumber}</td>
            <td>${entry.ad}</td>
            <td><a href="#" class="train-link" data-train="${entry.tren}">${entry.tren}</a></td>
            <td>${entry.estacio}</td>
            <td class="${horaClass}">${entry.hora}</td>
            <td>${entry.linia}</td>
            <td class="extra-col">${entry.torn}</td>
            <td class="extra-col"><a href="#" class="train-s-link" data-train="${entry.tren_s}">${entry.tren_s}</a></td>
        `;
        
        // Listener para el enlace del tren principal
        const trainLink = row.querySelector('.train-link');
        trainLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Guardar estado actual antes de hacer nueva búsqueda
            saveCurrentState();
            // Limpiar filtros y buscar el tren específico
            elements.tren.value = '';
            elements.linia.value = '';
            elements.ad.value = '';
            elements.estacio.value = '';
            elements.torn.value = '';
            elements.horaInici.value = '';
            elements.horaFi.value = '';
            elements.tren.value = entry.tren;
            filterData();
            updateBackButton();
        });
        
        // Listener para el enlace del tren_s
        const trainSLink = row.querySelector('.train-s-link');
        trainSLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Guardar estado actual antes de hacer nueva búsqueda
            saveCurrentState();
            // Limpiar filtros y buscar el tren específico
            elements.tren.value = '';
            elements.linia.value = '';
            elements.ad.value = '';
            elements.estacio.value = '';
            elements.torn.value = '';
            elements.horaInici.value = '';
            elements.horaFi.value = '';
            elements.tren.value = entry.tren_s;
            filterData();
            updateBackButton();
        });

        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);
    elements.resultContainer.style.display = 'block';

    const loadMoreButton = document.getElementById('loadMoreButton');
    if (filteredData.length > endIndex) {
        if (!loadMoreButton) {
            const button = document.createElement('button');
            button.id = 'loadMoreButton';
            button.textContent = '+ més';
            button.className = 'clear-filters';
            button.style.marginTop = '1rem';
            button.addEventListener('click', () => {
                currentPage++;
                updateTable();
            });
            elements.resultContainer.appendChild(button);
        }
    } else if (loadMoreButton) {
        loadMoreButton.remove();
    }
}

// Función para inicializar los listeners de inputs
function initInputListeners() {
    elements.tren.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
    elements.linia.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
    elements.ad.addEventListener('change', debounce(filterData, DEBOUNCE_DELAY));
    elements.estacio.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
    elements.torn.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY)); // Nuevo listener para Torn
    elements.horaInici.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
    elements.horaFi.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
    elements.clearFilters.addEventListener('click', clearFilters);
}

// Función de inicialización general
async function init() {
    try {
        elements.resultContainer.style.display = 'none';
        filteredData = [];
        await Promise.all([cargarEstaciones(), loadData()]);
        console.log('Inicialización completada - La tabla permanece oculta');
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        showError('Error al inicializar la aplicación');
    }
    initMenuListeners();
    initInputListeners();
    if (elements.currentYear) {
        elements.currentYear.textContent = new Date().getFullYear();
    }
}

document.addEventListener('DOMContentLoaded', init);
