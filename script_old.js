// Variables globals
let data = [];
let currentPage = 0;
const ITEMS_PER_PAGE = 33;
const DEBOUNCE_DELAY = 300;
let filterTimeout;
let filteredData = [];

// Elements del DOM
const elements = {
    tren: document.getElementById('tren'),
    linia: document.getElementById('linia'),
    ad: document.getElementById('ad'),
    estacio: document.getElementById('estacio'),
    horaInici: document.getElementById('horaInici'),
    horaFi: document.getElementById('horaFi'),
    resultContainer: document.getElementById('resultContainer'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('errorMessage'),
    clearFilters: document.getElementById('clearFilters'),
    resultats: document.getElementById('resultats')
};

// Funció per carregar les estacions
async function cargarEstaciones() {
    try {
        const response = await fetch('estacions.json');
        const estacionesData = await response.json();
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

// Funció per actualitzar el títol de la taula
function updateTableTitle() {
    const select = document.getElementById('ad');
    const title = document.getElementById('table-title');
    const value = select.value;

    if (value === 'A') {
        title.textContent = 'Trens Ascendents';
    } else if (value === 'D') {
        title.textContent = 'Trens Descendents';
    } else {
        title.textContent = 'Ascendents/Descendents';
    }
}

// Funcions de conversió de temps
function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function convertTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    if (timeStr.toLowerCase().includes('pm') && hours < 12) {
        hours += 12;
    } else if (timeStr.toLowerCase().includes('am') && hours === 12) {
        hours = 0;
    }
    
    return hours * 60 + minutes;
}

// Funció per carregar dades
async function loadData(filename = 'itinerari_LA51_2_0_1_asc_desc.json') {
    try {
        elements.loading.classList.add('visible');
        const response = await fetch(filename);
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const jsonData = await response.json();
        data = jsonData; // Guardar los datos pero no mostrarlos
        elements.resultContainer.style.display = 'none'; // Asegurar que la tabla está oculta
        filteredData = []; // Inicializar el array de datos filtrados vacío
        return data;
        
    } catch (error) {
        console.error('Error al cargar dades:', error);
        elements.loading.classList.remove('visible');
        showError('Error al cargar les dades');
        throw error;
    } finally {
        elements.loading.classList.remove('visible');
    }
}

// Funció per inicialitzar els event listeners del menú
function initMenuListeners() {
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevenim la navegació per defecte
            console.log('Click detectat'); // Per debugar
            
            const filename = e.target.dataset.file;
            console.log('Fitxer a carregar:', filename); // Per debugar
            
            try {
                await loadData(filename);
                console.log('Dades carregades'); // Per debugar
                
                // Actualitzar el títol
                const title = filename.includes('0_1') ? '000/100' : 
                             filename.includes('4_5') ? '400/500' : 
                             filename.includes('2_3') ? '200/300' : 
                             'feiners';
                             
                document.querySelector('h1').textContent = `Servei ${title}`;
                
                // Si tens alguna funció que processa o mostra les dades, crida-la aquí
                // Per exemple: processData() o showData()
                
            } catch (error) {
                console.error('Error al canviar d\'itinerari:', error);
            }
        });
    });
}

// Cridar la funció d'inicialització quan el document estigui llest
document.addEventListener('DOMContentLoaded', initMenuListeners);

// Funcions d'utilitat
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    setTimeout(() => {
        elements.errorMessage.style.display = 'none';
    }, 5000);
}

function debounce(func, delay) {
    return function executedFunction(...args) {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function clearFilters() {
    elements.tren.value = '';
    elements.linia.value = '';
    elements.ad.value = '';
    elements.estacio.value = '';
    elements.horaInici.value = '';
    elements.horaFi.value = '';
    elements.resultContainer.style.display = 'none';
    filteredData = []; // Limpiar los datos filtrados
    updateTable(); // Actualizar la tabla (estará vacía)
}

function sortResultsByTime(results) {
    return results.sort((a, b) => {
        const timeA = timeToMinutes(a.hora);
        const timeB = timeToMinutes(b.hora);

        if (timeA === null) return 1;
        if (timeB === null) return -1;

        const adjustedTimeA = timeA < 240 ? timeA + 1440 : timeA;
        const adjustedTimeB = timeB < 240 ? timeB + 1440 : timeB;

        return adjustedTimeA - adjustedTimeB;
    });
} 

// Funció principal de filtratge
function filterData() {
    // Verificar si hay algún filtro activo
    const filters = {
        tren: elements.tren.value.trim(),
        linia: elements.linia.value.trim(),
        ad: elements.ad.value.trim(),
        estacio: elements.estacio.value.trim(),
        horaInici: elements.horaInici.value.trim(),
        horaFi: elements.horaFi.value.trim()
    };

    // Debug para ver el estado de los filtros
    console.log('Estado de los filtros:', filters);

    // Comprobar si hay algún filtro activo (ignorando espacios en blanco)
    const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== undefined && value !== null);
    
    // Debug para ver si hay filtros activos
    console.log('¿Hay filtros activos?:', hasActiveFilters);
    
    if (!hasActiveFilters) {
        elements.resultContainer.style.display = 'none';
        filteredData = [];
        return;
    }

    currentPage = 0;
    
    const horaIniciMinuts = timeToMinutes(filters.horaInici);
    const horaFiMinuts = timeToMinutes(filters.horaFi);
    
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
                const entryTimeMinutes = convertTimeToMinutes(entry.hora);
                
                // Lógica del filtro de tiempo mejorada
                let matchesTimeRange = true;
                if (horaIniciMinuts !== null) {
                    if (horaFiMinuts === null) {
                        matchesTimeRange = entryTimeMinutes >= horaIniciMinuts;
                    } else {
                        matchesTimeRange = entryTimeMinutes >= horaIniciMinuts && entryTimeMinutes <= horaFiMinuts;
                    }
                }
                
                return (
                    (!filters.tren || entry.tren.toLowerCase().includes(filters.tren.toLowerCase())) &&
                    (!filters.linia || entry.linia.toLowerCase().includes(filters.linia.toLowerCase())) &&
                    (!filters.ad || entry.ad === filters.ad) &&
                    (!filters.estacio || entry.estacio.toLowerCase().includes(filters.estacio.toLowerCase())) &&
                    matchesTimeRange
                );
            })
    );

    filteredData = sortResultsByTime(filteredData);
    updateTable();
}

// Función auxiliar canvi color antes de updateTable
function shouldHighlightTime(entry) {
    // Define las estaciones para cada línea
    const r5Stations = ["MV", "CL", "CG"];
    const r6Stations = ["MV", "CG"];
    const r50Stations = ["MG", "ML", "CG", "CL", "CR", "QC", "PL", "MV", "ME", "AE", "CB"];
    const r60Stations = ["MG", "ML", "CG", "CR", "QC", "PA", "PL", "MV", "ME", "BE", "CP"];

    // Define los trenes específicos que deben cumplir la condición
    const specificTrains = ["N334", "P336", "P362", "N364", "P364", "N366", "P366"];

    // Comprueba la línea y las estaciones correspondientes
    const isR5 = entry.linia === "R5" && r5Stations.includes(entry.estacio);
    const isR6 = entry.linia === "R6" && r6Stations.includes(entry.estacio);
    const isR50 = entry.linia === "R50" && r50Stations.includes(entry.estacio);
    const isR60 = entry.linia === "R60" && r60Stations.includes(entry.estacio);

    // Comprueba si es uno de los trenes específicos y es descendente
    const isSpecificTrain = specificTrains.includes(entry.tren);
    const isDescendente = entry.ad === "D";
    
    // Retorna true si:
    // - Es R5, R6, R50 o R60 en sus estaciones correspondientes
    // - Y NO es uno de los trenes específicos en sentido descendente
    return (isR5 || isR6 || isR50 || isR60) && !(isSpecificTrain && isDescendente);
}

// Funció per actualitzar la taula
function updateTable() {
    const tbody = elements.resultats.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!filteredData || filteredData.length === 0) {
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

        // Determinar si se debe resaltar la hora
        const horaClass = shouldHighlightTime(entry) ? 'highlighted-time' : '';

        row.innerHTML = `
            <td class="row-number">${rowNumber}</td>
            <td>${entry.ad}</td>
            <td>${entry.tren}</td>
            <td>${entry.estacio}</td>
            <td class="${horaClass}">${entry.hora}</td>
            <td>${entry.linia}</td>
            <td class="extra-col">${entry.torn}</td>
            <td class="extra-col">${entry.tren_s}</td>
        `;
        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);
    elements.resultContainer.style.display = 'block';

    // Gestionar el botón "Cargar más"
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
    } else {
        if (loadMoreButton) {
            loadMoreButton.remove();
        }
    }
}

// Event Listeners
elements.tren.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
elements.linia.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
elements.ad.addEventListener('change', debounce(filterData, DEBOUNCE_DELAY));
elements.estacio.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
elements.horaInici.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
elements.horaFi.addEventListener('input', debounce(filterData, DEBOUNCE_DELAY));
elements.clearFilters.addEventListener('click', clearFilters);


// Inicialització
window.onload = async () => {
    try {
        // Ocultar la tabla antes de cargar los datos
        elements.resultContainer.style.display = 'none';
        
        // Inicializar los datos filtrados como array vacío
        filteredData = [];
        
        // Cargar los datos
        await Promise.all([cargarEstaciones(), loadData()]);
        
        // No llamar a filterData() aquí
        // Asegurarse de que la tabla permanece oculta
        elements.resultContainer.style.display = 'none';
        
        console.log('Inicialización completada - La tabla debería estar oculta');
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        showError('Error al inicializar la aplicación');
    }
}

document.getElementById('current-year').textContent = new Date().getFullYear();
