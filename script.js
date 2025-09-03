document.addEventListener('DOMContentLoaded', function() {
    
    const initialState = {
        recrutement: [],
        mutation: [],
        doc_adm: [],
        depart: [],
        stc: [],
        employeeList: []
    };

    // --- State Management with localStorage ---
    let state = loadState();
    let filters = {};

    function loadState() {
        try {
            const serializedState = localStorage.getItem('employeeDashboardState');
            if (serializedState === null) {
                return initialState;
            }
            const loadedState = JSON.parse(serializedState);
            loadedState.employeeList = loadedState.employeeList || [];
            return loadedState;
        } catch (e) {
            console.error("Could not load state from localStorage", e);
            return initialState;
        }
    }

    function saveState() {
        try {
            const serializedState = JSON.stringify(state);
            localStorage.setItem('employeeDashboardState', serializedState);
        } catch (e) {
            console.error("Could not save state to localStorage", e);
        }
    }


    let charts = {};

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
            tabs.forEach(t => t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'));
            
            tab.classList.add('active', 'border-blue-500', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            
            if (tab.dataset.tab === 'dashboard') {
                renderDashboard();
            }
        });
    });

    // --- Dashboard Rendering ---
    function renderDashboard() {
        document.getElementById('total-recrutement').textContent = state.recrutement.length;
        document.getElementById('total-mutation').textContent = state.mutation.length;
        document.getElementById('total-depart').textContent = state.depart.length;
        document.getElementById('total-stc').textContent = state.stc.length;

        // Recrutement Chart
        const recrutementCtx = document.getElementById('recrutementChart').getContext('2d');
        const recrutementData = state.recrutement.reduce((acc, item) => {
            acc[item.type_contrat] = (acc[item.type_contrat] || 0) + 1;
            return acc;
        }, {});
        
        if (charts.recrutement) charts.recrutement.destroy();
        charts.recrutement = new Chart(recrutementCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(recrutementData),
                datasets: [{
                    label: 'Nombre de recrutements',
                    data: Object.values(recrutementData),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });

        // Depart Chart
        const departCtx = document.getElementById('departChart').getContext('2d');
        const departData = state.depart.reduce((acc, item) => {
            const nature = item.nature_depart || 'Non specifie';
            acc[nature] = (acc[nature] || 0) + 1;
            return acc;
        }, {});

        if (charts.depart) charts.depart.destroy();
        charts.depart = new Chart(departCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(departData),
                datasets: [{
                    label: 'Nature de depart',
                    data: Object.values(departData),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                    ],
                    borderWidth: 1
                }]
            }
        });
    }

    // --- Search and Filter Logic ---
    function applyFilters(section) {
        let filteredData = [...(state[section] || [])];
        const searchTerm = filters[section]?.search?.toLowerCase() || '';

        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(searchTerm)
                )
            );
        }
        
        if (filters[section]?.specific) {
            for (const key in filters[section].specific) {
                const value = filters[section].specific[key];
                if (value) {
                    filteredData = filteredData.filter(item => item[key] === value);
                }
            }
        }
        
        renderTable(section, filteredData);
    }

    function populateFilterOptions(section, key) {
        const select = document.getElementById(`filter-${key}-${section}`);
        if (!select) return;

        const options = [...new Set(state[section].map(item => item[key]))];
        select.innerHTML = '<option value="">Tous</option>';
        options.forEach(option => {
            if(option) {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                select.appendChild(opt);
            }
        });
    }
    
    window.toggleFilter = function(section) {
        const dropdown = document.getElementById(`filter-${section}`);
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    }

    // --- Generic CRUD and Rendering Logic ---
    function renderTable(section, dataToRender) {
        const tableBody = document.querySelector(`#table-${section} tbody`);
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        const data = dataToRender || state[section] || [];
        
        if (data.length === 0) return;
        
        const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt');
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            row.setAttribute('data-id', item.id);

            keys.forEach(key => {
                const cell = document.createElement('td');
                cell.className = 'px-6 py-4';
                cell.textContent = item[key] || '-';
                row.appendChild(cell);
            });
            
            const actionCell = document.createElement('td');
            actionCell.className = 'px-6 py-4 flex items-center space-x-4';
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Modifier';
            editButton.className = 'text-blue-600 hover:text-blue-800 font-medium';
            editButton.onclick = () => openEditModal(section, item.id);
            actionCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Supprimer';
            deleteButton.className = 'text-red-600 hover:text-red-800 font-medium';
            deleteButton.onclick = () => deleteItem(section, item.id);
            actionCell.appendChild(deleteButton);

            row.appendChild(actionCell);
            tableBody.appendChild(row);
        });
    }

    function handleFormSubmit(event, section) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const newItem = { 
            id: Date.now(),
            createdAt: new Date().toISOString() // Add creation timestamp
        };
        for (let [key, value] of formData.entries()) {
            newItem[key] = value;
        }
        if (!state[section]) state[section] = [];
        state[section].push(newItem);
        saveState();
        applyFilters(section);
        renderDashboard(); 
        form.reset();
    }

    function deleteItem(section, id) {
        if (confirm('Etes-vous sur de vouloir supprimer cette entree ?')) {
            state[section] = state[section].filter(item => item.id !== id);
            saveState();
            applyFilters(section);
            renderDashboard();
        }
    }
    
    // --- Enhanced Autocomplete Logic ---
    function setupAutocomplete(form) {
        const matriculeInput = form.querySelector('input[name="matricule"]');
        if (!matriculeInput) return;

        // Use 'change' event to trigger after the user leaves the field
        matriculeInput.addEventListener('change', () => {
            const matriculeValue = matriculeInput.value.trim();
            
            // Find the employee in the master list
            const employee = state.employeeList.find(emp => emp.matricule === matriculeValue);

            // First, clear all form fields except for the matricule itself
            Array.from(form.elements).forEach(el => {
                if (el.name !== 'matricule') {
                    el.value = '';
                }
            });

            if (employee) {
                // If an employee is found, populate the form with their data
                for (const key in employee) {
                    const input = form.querySelector(`input[name="${key}"], select[name="${key}"]`);
                    // Check if the form has a field for this piece of data
                    if (input && key !== 'matricule') {
                        input.value = employee[key];
                    }
                }
            }
            // If no employee is found, the fields are already cleared and ready for manual entry.
        });
    }

    // --- Initial setup and event listeners ---
    const sections = ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc'];
    sections.forEach(section => {
        filters[section] = { search: '', specific: {} };
        const form = document.getElementById(`form-${section}`);
        if(form) {
            form.addEventListener('submit', (e) => handleFormSubmit(e, section));
            setupAutocomplete(form);
        }
        
        const importInput = document.getElementById(`import-${section}`);
        if(importInput) {
             importInput.addEventListener('change', (e) => handleFileUpload(e, section));
        }

        const searchInput = document.getElementById(`search-${section}`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filters[section].search = e.target.value;
                applyFilters(section);
            });
        }
        
        const filterDropdown = document.getElementById(`filter-${section}`);
        if (filterDropdown) {
             const selects = filterDropdown.querySelectorAll('select');
             selects.forEach(select => {
                const key = select.id.split('-')[1];
                 filters[section].specific[key] = '';
                 populateFilterOptions(section, key);
                 select.addEventListener('change', (e) => {
                    filters[section].specific[key] = e.target.value;
                    applyFilters(section);
                });
             });
        }

        applyFilters(section);
    });

    // --- Modal Logic ---
    const editModal = document.getElementById('editModal');
    const closeModalBtn = document.getElementById('closeModal');
    const saveChangesBtn = document.getElementById('saveChanges');
    const editForm = document.getElementById('editForm');
    const modalTitle = document.getElementById('modal-title');
    let currentEditInfo = { section: null, id: null };

    function openEditModal(section, id) {
        currentEditInfo = { section, id };
        const item = state[section].find(i => i.id === id);
        const originalForm = document.getElementById(`form-${section}`);

        modalTitle.textContent = `Modifier - ${originalForm.previousElementSibling.textContent.replace('Ajouter un nouveau', '').trim()}`;
        editForm.innerHTML = '';

        Array.from(originalForm.elements).forEach(el => {
            if (el.name) {
                const newEl = el.cloneNode(true);
                newEl.value = item[el.name] || '';
                editForm.appendChild(newEl);
            }
        });
        
        editModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
    }
    
    function saveEdit() {
        const { section, id } = currentEditInfo;
        const itemIndex = state[section].findIndex(i => i.id === id);
        if (itemIndex === -1) return;

        const formData = new FormData(editForm);
        const updatedValues = {};
        for (let [key, value] of formData.entries()) {
            updatedValues[key] = value;
        }

        state[section][itemIndex] = { ...state[section][itemIndex], ...updatedValues };
        saveState();
        applyFilters(section);
        renderDashboard();
        closeEditModal();
    }

    closeModalBtn.addEventListener('click', closeEditModal);
    saveChangesBtn.addEventListener('click', saveEdit);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
            closeEditModal();
        }
    });

    // --- Deadline Alert ---
    function checkDeadlineAlert() {
        const today = new Date();
        if (today.getDate() === 15) {
            document.getElementById('deadline-alert').classList.remove('hidden');
        }
    }

    // --- Master Employee List Import ---
    const importEmployeeListBtn = document.getElementById('import-employee-list-btn');
    const importEmployeeListInput = document.getElementById('import-employee-list-input');
    
    importEmployeeListBtn.addEventListener('click', () => importEmployeeListInput.click());
    importEmployeeListInput.addEventListener('change', handleEmployeeListUpload);

    function handleEmployeeListUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line);
            if (lines.length < 2) {
                alert("Fichier CSV invalide ou vide.");
                return;
            }

            // Normalize headers: lowercase, trim, handle common variations
            const headers = lines[0].split(',').map(h => 
                h.trim().toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace('é', 'e').replace('è', 'e')
            );

            const employeeList = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                let employee = {};
                let hasMatricule = false;
                headers.forEach((header, index) => {
                    // Map CSV header to form field name
                    let key = header.replace('nom_et_prenom', 'nom_prenom').replace('numero_de_telephone', 'telephone');
                    if (key === 'matricule' && values[index]) {
                        hasMatricule = true;
                    }
                    employee[key] = values[index];
                });
                if(hasMatricule) {
                    employeeList.push(employee);
                }
            }
            
            state.employeeList = employeeList;
            saveState();
            alert(`${employeeList.length} employes importes avec succes depuis le fichier principal.`);
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // --- Daily Report Generation ---
    const generateDailyReportBtn = document.getElementById('generate-daily-report-btn');
    generateDailyReportBtn.addEventListener('click', generateDailyReport);

    function generateDailyReport() {
        const today = new Date().toISOString().slice(0, 10); // Get YYYY-MM-DD
        let dailyEntries = [];

        sections.forEach(section => {
            if (state[section] && state[section].length > 0) {
                const todaySectionEntries = state[section].filter(item => item.createdAt && item.createdAt.slice(0, 10) === today);
                todaySectionEntries.forEach(entry => {
                    dailyEntries.push({ Section: section, ...entry });
                });
            }
        });

        if (dailyEntries.length === 0) {
            alert("Aucune nouvelle entree enregistree aujourd'hui.");
            return;
        }

        exportToCsv(`Rapport_Journalier_${today}.csv`, null, dailyEntries);
        alert(`Rapport journalier genere avec ${dailyEntries.length} entrees.`);
    }

    // Initial Dashboard Render and Checks
    renderDashboard();
    checkDeadlineAlert();

    // --- CSV Import/Export Logic ---

    window.importFromCsv = function(section) {
        document.getElementById(`import-${section}`).click();
    }

    function handleFileUpload(event, section) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const data = parseCSV(text, section);
            if (data.length > 0) {
                if (!state[section]) state[section] = [];
                state[section] = [...state[section], ...data];
                saveState();
                applyFilters(section);
                renderDashboard();
                alert(`${data.length} enregistrements importes avec succes!`);
            } else {
                alert("Impossible d'importer le fichier. Verifiez le format et les en-tetes.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function parseCSV(text, section) {
        const lines = text.split(/\r\n|\n/).filter(line => line);
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const form = document.getElementById(`form-${section}`);
        const expectedKeys = Array.from(form.elements).map(el => el.name).filter(Boolean);

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const newEntry = { 
                id: Date.now() + i,
                createdAt: new Date().toISOString()
            };
            
            for (let j = 0; j < expectedKeys.length; j++) {
                if (values[j] !== undefined) {
                     newEntry[expectedKeys[j]] = values[j];
                }
            }
            data.push(newEntry);
        }
        return data;
    }

    window.exportToCsv = function(filename, section, customData = null) {
        const data = customData || state[section];
        if (!data || data.length === 0) {
            if (!customData) alert("Aucune donnee a exporter.");
            return;
        }
        
        // Create a set of all possible keys from the data
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });

        // Define a consistent order, removing internal keys
        const orderedKeys = Array.from(allKeys).filter(k => k !== 'id' && k !== 'createdAt');

        const headerRow = orderedKeys.join(',');
        const rows = data.map(item => {
            return orderedKeys.map(key => {
                let cell = item[key] === null || item[key] === undefined ? '' : item[key];
                cell = String(cell);
                if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',');
        });

        const csvContent = [headerRow, ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});