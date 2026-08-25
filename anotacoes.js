document.addEventListener('DOMContentLoaded', () => {

    /* 1. FUNDO DAS ONDAS DO MAR ROXO */
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let step = 0;
    function drawWaves() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0a0518');
        bgGrad.addColorStop(1, '#1e0b36');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const waves = [
            { height: 35, length: 0.008, speed: 0.02, color: 'rgba(168, 85, 247, 0.12)' },
            { height: 50, length: 0.005, speed: 0.015, color: 'rgba(255, 255, 255, 0.06)' }
        ];

        waves.forEach(wave => {
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            for (let x = 0; x < canvas.width; x++) {
                const y = Math.sin(x * wave.length + step * wave.speed) * wave.height + (canvas.height / 2);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fillStyle = wave.color;
            ctx.fill();
        });

        step += 1;
        requestAnimationFrame(drawWaves);
    }
    drawWaves();

    /* 2. GERENCIAMENTO DE PERSISTÊNCIA (LOCALSTORAGE) */
    const DEFAULT_CATEGORIES = [
        { name: 'Cartão de Crédito', slug: 'credito', color: '#a855f7', icon: 'fa-credit-card' },
        { name: 'Cartão de Débito', slug: 'debito', color: '#7c3aed', icon: 'fa-wallet' },
        { name: 'Alimentação', slug: 'alimentacao', color: '#c026d3', icon: 'fa-utensils' },
        { name: 'Dinheiro', slug: 'dinheiro', color: '#6366f1', icon: 'fa-money-bill-wave' },
        { name: 'Investimentos', slug: 'investimento', color: '#10b981', icon: 'fa-chart-line' }
    ];

    let categoriesList = JSON.parse(localStorage.getItem('finance_categories')) || DEFAULT_CATEGORIES;
    let transactions = JSON.parse(localStorage.getItem('finance_transactions')) || [];

    function saveState() {
        localStorage.setItem('finance_categories', JSON.stringify(categoriesList));
        localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }

    /* 3. GRÁFICO (CHART.JS) */
    const ctxChart = document.getElementById('financeChart').getContext('2d');

    const financeChart = new Chart(ctxChart, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderColor: '#0a0518',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#cbd5e1', font: { size: 12 } }
                }
            }
        }
    });

    /* 4. ELEMENTOS DA INTERFACE */
    const categorySelector = document.getElementById('categorySelector');
    const btnAddCategory = document.getElementById('btnAddCategory');
    const categoryModal = document.getElementById('categoryModal');
    const btnCancelCategory = document.getElementById('btnCancelCategory');
    const btnConfirmCategory = document.getElementById('btnConfirmCategory');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const historyFilter = document.getElementById('historyFilter');

    const textInput = document.getElementById('textInput');
    const btnSend = document.getElementById('btnSend');
    const aiTextResponse = document.getElementById('aiTextResponse');
    const historyList = document.getElementById('historyList');
    const totalDisplay = document.getElementById('totalDisplay');

    let selectedCategory = 'auto';

    /* Renderização Inicial dos Chips Dinâmicos e Filtros */
    function renderCustomChipsAndFilters() {
        // Remove chips customizados existentes antes de recriar
        const existingCustomChips = categorySelector.querySelectorAll('.custom-chip');
        existingCustomChips.forEach(c => c.remove());

        // Limpa opções do filtro
        historyFilter.innerHTML = '<option value="all">Todas as categorias</option>';

        categoriesList.forEach(cat => {
            // Adiciona Opção no Filtro
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            historyFilter.appendChild(option);

            // Adiciona Chip apenas para categorias customizadas (que não estão padrão no HTML)
            const isDefault = DEFAULT_CATEGORIES.some(dc => dc.slug === cat.slug);
            if (!isDefault) {
                const newChip = document.createElement('button');
                newChip.type = 'button';
                newChip.className = 'chip-btn custom-chip';
                newChip.setAttribute('data-category', cat.slug);
                newChip.setAttribute('data-fullname', cat.name);
                newChip.innerHTML = `<i class="fa-solid ${cat.icon || 'fa-briefcase'}"></i> ${cat.name}`;
                categorySelector.insertBefore(newChip, btnAddCategory);
            }
        });

        setupChipEvents();
    }

    function setupChipEvents() {
        const chipButtons = categorySelector.querySelectorAll('.chip-btn:not(#btnAddCategory)');
        chipButtons.forEach(btn => {
            btn.onclick = () => {
                categorySelector.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCategory = btn.getAttribute('data-category');
            };
        });
    }

    /* 5. ATUALIZAR GRÁFICO, TOTAL E EXTRATO */
    function updateUI() {
        // Cálculo de totais por categoria
        const categoryTotals = {};
        categoriesList.forEach(c => categoryTotals[c.name] = 0);

        let overallTotal = 0;

        transactions.forEach(t => {
            if (categoryTotals[t.categoryName] !== undefined) {
                categoryTotals[t.categoryName] += t.amount;
            } else {
                categoryTotals[t.categoryName] = t.amount;
            }
            overallTotal += t.amount;
        });

        // Atualiza Gráfico
        const activeLabels = [];
        const activeData = [];
        const activeColors = [];

        categoriesList.forEach(cat => {
            const val = categoryTotals[cat.name] || 0;
            if (val > 0) {
                activeLabels.push(cat.name);
                activeData.push(val);
                activeColors.push(cat.color);
            }
        });

        financeChart.data.labels = activeLabels;
        financeChart.data.datasets[0].data = activeData;
        financeChart.data.datasets[0].backgroundColor = activeColors;
        financeChart.update();

        // Atualiza Total Geral
        totalDisplay.textContent = `Total Registrado: R$ ${overallTotal.toFixed(2).replace('.', ',')}`;

        // Atualiza Extrato
        renderHistoryList();
    }

    function renderHistoryList() {
        const filterValue = historyFilter.value;
        historyList.innerHTML = '';

        const filteredTransactions = filterValue === 'all' 
            ? transactions 
            : transactions.filter(t => t.categoryName === filterValue);

        if (filteredTransactions.length === 0) {
            historyList.innerHTML = '<div class="empty-state">Nenhum lançamento encontrado.</div>';
            return;
        }

        filteredTransactions.forEach((t) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-info">
                    <div class="history-icon"><i class="fa-solid ${t.icon}"></i></div>
                    <div class="history-details">
                        <h4>${t.description}</h4>
                        <span>${t.categoryName} • ${t.date}</span>
                    </div>
                </div>
                <div class="history-right-side">
                    <div class="history-value">R$ ${t.amount.toFixed(2).replace('.', ',')}</div>
                    <button type="button" class="btn-delete-item" data-id="${t.id}" title="Excluir lançamento">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            historyList.appendChild(item);
        });

        // Adiciona eventos de exclusão
        document.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.onclick = (e) => {
                const idToDelete = parseFloat(btn.getAttribute('data-id'));
                deleteTransaction(idToDelete);
            };
        });
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(t => t.id !== id);
        saveState();
        updateUI();
        aiTextResponse.innerHTML = 'Lançamento removido do seu extrato e recalculado no gráfico com sucesso!';
    }

    /* 6. MODAL & CATEGORIAS CUSTOMIZADAS */
    btnAddCategory.addEventListener('click', () => {
        categoryModal.classList.add('active');
        newCategoryInput.focus();
    });

    btnCancelCategory.addEventListener('click', () => {
        categoryModal.classList.remove('active');
        newCategoryInput.value = '';
    });

    btnConfirmCategory.addEventListener('click', createCustomCategory);
    newCategoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createCustomCategory();
    });

    function createCustomCategory() {
        const catName = newCategoryInput.value.trim();
        if (!catName) return;

        const slug = catName.toLowerCase().replace(/\s+/g, '_');
        const exists = categoriesList.some(c => c.name.toLowerCase() === catName.toLowerCase());

        if (!exists) {
            const randomColor = `hsl(${Math.floor(Math.random() * 60) + 250}, 80%, 65%)`;
            categoriesList.push({
                name: catName,
                slug: slug,
                color: randomColor,
                icon: 'fa-briefcase'
            });
            saveState();
            renderCustomChipsAndFilters();
            updateUI();
        }

        // Ativa o chip da recém-criada categoria
        const targetChip = categorySelector.querySelector(`[data-category="${slug}"]`);
        if (targetChip) targetChip.click();

        categoryModal.classList.remove('active');
        newCategoryInput.value = '';
    }

    /* 7. ENVIAR E PROCESSAR REGISTROS */
    btnSend.addEventListener('click', handleUserPrompt);
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserPrompt();
    });

    function handleUserPrompt() {
        const query = textInput.value.trim();
        if (!query) return;

        const lower = query.toLowerCase();
        const matchValue = lower.match(/(\d+[\.,]?\d*)/);

        if (matchValue) {
            processFinancialRegistration(query, lower, parseFloat(matchValue[0].replace(',', '.')));
        } else {
            processFinancialAdvisory(lower);
        }

        textInput.value = '';
    }

    function processFinancialRegistration(rawText, lowerText, value) {
        let matchedCategory = null;

        // 1. Seleção manual via botão/chip
        if (selectedCategory !== 'auto') {
            const activeBtn = categorySelector.querySelector('.chip-btn.active');
            const fullName = activeBtn ? activeBtn.getAttribute('data-fullname') : '';
            matchedCategory = categoriesList.find(c => c.name.toLowerCase() === fullName.toLowerCase());
        }

        // 2. Reconhecimento automático pela IA se 'Auto' estiver selecionado
        if (!matchedCategory) {
            if (lowerText.includes('empresa') || lowerText.includes('negócio') || lowerText.includes('cliente')) {
                matchedCategory = categoriesList.find(c => c.slug === 'empresa');
                if (!matchedCategory) {
                    matchedCategory = { name: 'Empresa', slug: 'empresa', color: '#f59e0b', icon: 'fa-building' };
                    categoriesList.push(matchedCategory);
                    renderCustomChipsAndFilters();
                }
            } else if (lowerText.includes('invest') || lowerText.includes('fundo') || lowerText.includes('ações')) {
                matchedCategory = categoriesList.find(c => c.slug === 'investimento');
            } else if (lowerText.includes('alimenta') || lowerText.includes('almoço') || lowerText.includes('mercado')) {
                matchedCategory = categoriesList.find(c => c.slug === 'alimentacao');
            } else if (lowerText.includes('crédito') || lowerText.includes('credito')) {
                matchedCategory = categoriesList.find(c => c.slug === 'credito');
            } else if (lowerText.includes('dinheiro')) {
                matchedCategory = categoriesList.find(c => c.slug === 'dinheiro');
            } else {
                matchedCategory = categoriesList.find(c => c.slug === 'debito');
            }
        }

        const now = new Date();
        const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newTransaction = {
            id: Date.now(),
            description: rawText,
            amount: value,
            categoryName: matchedCategory.name,
            icon: matchedCategory.icon || 'fa-wallet',
            date: `Hoje às ${timeFormatted}`
        };

        transactions.unshift(newTransaction);
        saveState();
        updateUI();

        aiTextResponse.innerHTML = `Lançamento de <strong>R$ ${value.toFixed(2).replace('.', ',')}</strong> direcionado com sucesso para a categoria <strong>${matchedCategory.name}</strong>.`;
    }

    function processFinancialAdvisory(query) {
        let response = "Estou pronto para ajudar! Digite um valor e escolha a categoria para registrar seu lançamento.";
        if (query.includes('empresa')) {
            response = "<strong>Dica Corporativa:</strong> Manter as contas da Empresa separadas das contas Pessoais é o primeiro passo para o crescimento saudável do seu negócio!";
        } else if (query.includes('economizar') || query.includes('guardar')) {
            response = "<strong>Estratégia:</strong> Utilize a regra 50/30/20: 50% necessidades, 30% desejos e 20% investimento/empresa.";
        }
        aiTextResponse.innerHTML = response;
    }

    // Evento de Mudança no Filtro do Extrato
    historyFilter.addEventListener('change', renderHistoryList);

    // Inicialização
    renderCustomChipsAndFilters();
    updateUI();
});