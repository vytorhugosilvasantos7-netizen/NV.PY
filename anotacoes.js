document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================
       1. FUNDO DAS ONDAS
       ========================================================= */
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

    /* =========================================================
       2. CATEGORIAS PADRÃO E PERSISTÊNCIA
       Cada categoria agora tem um "type": 'gasto' ou 'investimento'.
       Isso é o que permite separar tudo em dois gráficos e dois
       grupos no extrato, em vez de misturar tudo junto.
       ========================================================= */
    const DEFAULT_CATEGORIES = [
        { name: 'Cartão de Crédito', slug: 'credito', color: '#a855f7', icon: 'fa-credit-card', type: 'gasto' },
        { name: 'Cartão de Débito', slug: 'debito', color: '#7c3aed', icon: 'fa-wallet', type: 'gasto' },
        { name: 'Alimentação', slug: 'alimentacao', color: '#c026d3', icon: 'fa-utensils', type: 'gasto' },
        { name: 'Transporte', slug: 'transporte', color: '#38bdf8', icon: 'fa-car', type: 'gasto' },
        { name: 'Moradia', slug: 'moradia', color: '#ec4899', icon: 'fa-house', type: 'gasto' },
        { name: 'Dinheiro', slug: 'dinheiro', color: '#6366f1', icon: 'fa-money-bill-wave', type: 'gasto' },
        { name: 'Investimentos', slug: 'investimento', color: '#10b981', icon: 'fa-chart-line', type: 'investimento' },
        { name: 'Negócios', slug: 'negocios', color: '#f59e0b', icon: 'fa-briefcase', type: 'gasto' },
        { name: 'Outros', slug: 'outros', color: '#6b7280', icon: 'fa-circle-question', type: 'gasto' }
    ];

    /* Dicionário de palavras-chave por categoria — usado no reconhecimento
       automático. Quanto mais termos, melhor a IA acerta o contexto real
       de uma frase em português, em vez de só olhar a primeira palavra
       que bater (como era antes). */
    const CATEGORY_KEYWORDS = {
        alimentacao: ['almoço', 'almoco', 'jantar', 'lanche', 'restaurante', 'mercado', 'supermercado', 'ifood', 'comida', 'padaria', 'feira', 'delivery', 'café', 'cafe', 'pizza', 'hamburguer'],
        transporte: ['uber', '99', 'combustível', 'combustivel', 'gasolina', 'álcool', 'alcool', 'ônibus', 'onibus', 'metrô', 'metro', 'passagem', 'estacionamento', 'pedágio', 'pedagio', 'carro', 'moto', 'oficina'],
        moradia: ['aluguel', 'condomínio', 'condominio', 'luz', 'energia', 'água', 'agua', 'internet', 'gás', 'gas', 'iptu', 'reforma', 'móveis', 'moveis'],
        credito: ['crédito', 'credito', 'fatura', 'parcela', 'parcelado'],
        debito: ['débito', 'debito'],
        dinheiro: ['dinheiro', 'espécie', 'especie', 'pix'],
        investimento: ['invest', 'fundo', 'ações', 'acoes', 'tesouro', 'cdb', 'poupança', 'poupanca', 'renda fixa', 'cripto', 'bitcoin'],
        negocios: ['empresa', 'negócio', 'negocio', 'cliente', 'fornecedor', 'insumo', 'insumos', 'freelance', 'projeto', 'nota fiscal'],
    };

    let categoriesList = JSON.parse(localStorage.getItem('finance_categories')) || DEFAULT_CATEGORIES;
    let transactions = JSON.parse(localStorage.getItem('finance_transactions')) || [];

    // Migração: dados salvos antes dessa atualização não tinham "type".
    // Aqui a gente preenche isso automaticamente pra nada quebrar.
    categoriesList = categoriesList.map(c => ({
        ...c,
        type: c.type === 'investimento' || c.slug === 'investimento' ? 'investimento' : 'gasto'
    }));
    transactions = transactions.map(t => ({
        ...t,
        categoryType: t.categoryType || (t.categoryName === 'Investimentos' ? 'investimento' : 'gasto')
    }));

    function saveState() {
        localStorage.setItem('finance_categories', JSON.stringify(categoriesList));
        localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }

    /* =========================================================
       3. GRÁFICOS (CHART.JS)
       Gastos: rosquinha (mostra a divisão por categoria).
       Investimentos: linha acumulada — cada aporte soma ao total
       anterior, então a linha sempre sobe conforme você investe.
       ========================================================= */
    function createDoughnutChart(canvasId) {
        const chartCtx = document.getElementById(canvasId).getContext('2d');
        return new Chart(chartCtx, {
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
    }

    function createInvestLineChart(canvasId) {
        const chartCtx = document.getElementById(canvasId).getContext('2d');
        return new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total investido acumulado',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.18)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#0a0518',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: {
                        ticks: { color: '#cbd5e1', font: { size: 10 }, maxRotation: 0, autoSkip: true },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cbd5e1',
                            font: { size: 10 },
                            callback: (value) => `R$ ${value}`
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Acumulado: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`
                        }
                    }
                }
            }
        });
    }

    const financeChartGastos = createDoughnutChart('financeChartGastos');
    const financeChartInvest = createInvestLineChart('financeChartInvest');

    function fillChart(chart, cats, categoryTotals) {
        const labels = [];
        const data = [];
        const colors = [];

        cats.forEach(cat => {
            const val = categoryTotals[cat.name] || 0;
            if (val > 0) {
                labels.push(cat.name);
                data.push(val);
                colors.push(cat.color);
            }
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors;
        chart.update();
    }

    /* Monta a linha do tempo acumulada dos investimentos: ordena do
       mais antigo pro mais novo e vai somando cada aporte, pra linha
       sempre subir a cada novo investimento lançado. */
    function fillInvestLineChart(chart, investTransactions) {
        const chronological = [...investTransactions].sort((a, b) => a.id - b.id);

        const labels = ['Início'];
        const data = [0];
        let running = 0;

        chronological.forEach((t, index) => {
            running += t.amount;
            const shortDate = (t.date || '').replace('Hoje às ', '');
            labels.push(shortDate || `Aporte ${index + 1}`);
            data.push(Number(running.toFixed(2)));
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    /* =========================================================
       4. ELEMENTOS DA INTERFACE
       ========================================================= */
    const categorySelector = document.getElementById('categorySelector');
    const gastoChipsRow = document.getElementById('gastoChipsRow');
    const investChipsRow = document.getElementById('investChipsRow');
    const btnAddCategory = document.getElementById('btnAddCategory');
    const categoryModal = document.getElementById('categoryModal');
    const btnCancelCategory = document.getElementById('btnCancelCategory');
    const btnConfirmCategory = document.getElementById('btnConfirmCategory');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const categoryTypeToggle = document.getElementById('categoryTypeToggle');
    const historyFilter = document.getElementById('historyFilter');
    const historyTypeTabs = document.getElementById('historyTypeTabs');

    const textInput = document.getElementById('textInput');
    const btnSend = document.getElementById('btnSend');
    const chatFeed = document.getElementById('aiChatFeed');
    const historyList = document.getElementById('historyList');
    const totalDisplayGastos = document.getElementById('totalDisplayGastos');
    const totalDisplayInvest = document.getElementById('totalDisplayInvest');
    const investChartWrapper = document.getElementById('investChartWrapper');
    const investEmptyState = document.getElementById('investEmptyState');

    let selectedCategory = 'auto';
    let newCategoryType = 'gasto';
    let historyTypeFilter = 'all'; // 'all' | 'gasto' | 'investimento'

    /* =========================================================
       5. FEED DE CONVERSA
       ========================================================= */
    function formatTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    function addChatMessage(role, html, { showTime = true } = {}) {
        const row = document.createElement('div');
        row.className = `chat-row chat-${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = role === 'ai'
            ? '<i class="fa-solid fa-brain-circuit"></i>'
            : '<i class="fa-solid fa-user"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = html + (showTime ? `<span class="chat-meta">${formatTime()}</span>` : '');

        row.appendChild(avatar);
        row.appendChild(bubble);
        chatFeed.appendChild(row);
        chatFeed.scrollTop = chatFeed.scrollHeight;
        return row;
    }

    function showTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'chat-row chat-ai typing-row';
        row.innerHTML = `
            <div class="chat-avatar"><i class="fa-solid fa-brain-circuit"></i></div>
            <div class="chat-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
        chatFeed.appendChild(row);
        chatFeed.scrollTop = chatFeed.scrollHeight;
        return row;
    }

    function replyWithDelay(html, delay = 500) {
        const typingRow = showTypingIndicator();
        setTimeout(() => {
            typingRow.remove();
            addChatMessage('ai', html);
        }, delay);
    }

    /* Mensagem de boas-vindas ao carregar */
    addChatMessage(
        'ai',
        '<h4 style="color:var(--purple-neon);font-size:0.92rem;margin-bottom:4px;">Olá! Sou sua IA financeira 👋</h4>' +
        '<p>Digite um gasto (ex: <em>"R$ 45 almoço"</em>) ou investimento (ex: <em>"R$ 200 tesouro selic"</em>) e eu categorizo e lanço automaticamente. Também respondo dúvidas sobre organização financeira.</p>',
        { showTime: false }
    );

    /* =========================================================
       6. CHIPS DE CATEGORIA E FILTROS
       O dropdown de categorias agora agrupa Gastos e Investimentos
       separadamente, pra ficar mais fácil de achar.
       ========================================================= */
    function renderCustomChipsAndFilters() {
        const existingCustomChips = categorySelector.querySelectorAll('.custom-chip');
        existingCustomChips.forEach(c => c.remove());

        historyFilter.innerHTML = '<option value="all">Todas as categorias</option>';

        const gastoGroup = document.createElement('optgroup');
        gastoGroup.label = 'Gastos';
        const investGroup = document.createElement('optgroup');
        investGroup.label = 'Investimentos';

        categoriesList.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;

            const isInvest = cat.type === 'investimento';
            if (isInvest) {
                investGroup.appendChild(option);
            } else {
                gastoGroup.appendChild(option);
            }

            const isDefault = DEFAULT_CATEGORIES.some(dc => dc.slug === cat.slug);
            if (!isDefault) {
                const newChip = document.createElement('button');
                newChip.type = 'button';
                newChip.className = `chip-btn custom-chip${isInvest ? ' chip-btn--invest' : ''}`;
                newChip.setAttribute('data-category', cat.slug);
                newChip.setAttribute('data-fullname', cat.name);
                newChip.innerHTML = `<i class="fa-solid ${cat.icon || 'fa-briefcase'}"></i> ${cat.name}`;

                // Cada categoria nova cai no grupo certo (Gastos ou Investimentos)
                const targetRow = isInvest ? investChipsRow : gastoChipsRow;
                if (targetRow) {
                    targetRow.appendChild(newChip);
                } else {
                    categorySelector.insertBefore(newChip, btnAddCategory);
                }
            }
        });

        if (gastoGroup.children.length) historyFilter.appendChild(gastoGroup);
        if (investGroup.children.length) historyFilter.appendChild(investGroup);

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

    /* =========================================================
       7. GRÁFICOS, TOTAIS E EXTRATO
       ========================================================= */
    function updateUI() {
        const categoryTotals = {};
        categoriesList.forEach(c => categoryTotals[c.name] = 0);

        let totalGastos = 0;
        let totalInvest = 0;

        transactions.forEach(t => {
            categoryTotals[t.categoryName] = (categoryTotals[t.categoryName] || 0) + t.amount;
            if ((t.categoryType || 'gasto') === 'investimento') {
                totalInvest += t.amount;
            } else {
                totalGastos += t.amount;
            }
        });

        fillChart(financeChartGastos, categoriesList.filter(c => c.type !== 'investimento'), categoryTotals);

        const investTransactions = transactions.filter(t => (t.categoryType || 'gasto') === 'investimento');
        fillInvestLineChart(financeChartInvest, investTransactions);

        // Se ainda não existe nenhum investimento lançado, mostra uma
        // mensagem no lugar de um gráfico vazio (fica mais organizado).
        if (investChartWrapper && investEmptyState) {
            const hasInvestData = totalInvest > 0;
            investChartWrapper.style.display = hasInvestData ? 'flex' : 'none';
            investEmptyState.style.display = hasInvestData ? 'none' : 'flex';
        }

        totalDisplayGastos.textContent = `Total em Gastos: R$ ${totalGastos.toFixed(2).replace('.', ',')}`;
        totalDisplayInvest.textContent = `Total Investido: R$ ${totalInvest.toFixed(2).replace('.', ',')}`;

        renderHistoryList();
    }

    function renderHistoryList() {
        const categoryFilterValue = historyFilter.value;
        historyList.innerHTML = '';

        let filteredTransactions = transactions;

        if (historyTypeFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => (t.categoryType || 'gasto') === historyTypeFilter);
        }

        if (categoryFilterValue !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.categoryName === categoryFilterValue);
        }

        if (filteredTransactions.length === 0) {
            historyList.innerHTML = '<div class="empty-state">Nenhum lançamento encontrado.</div>';
            return;
        }

        // Quando a aba "Investimentos" está ativa, calcula o acumulado até
        // cada aporte (em ordem cronológica) para mostrar a evolução no extrato.
        let cumulativeById = null;
        if (historyTypeFilter === 'investimento') {
            cumulativeById = new Map();
            const chronological = [...filteredTransactions].sort((a, b) => a.id - b.id);
            let running = 0;
            chronological.forEach(t => {
                running += t.amount;
                cumulativeById.set(t.id, running);
            });
        }

        filteredTransactions.forEach((t) => {
            const isInvest = (t.categoryType || 'gasto') === 'investimento';
            const cumulativeBadge = cumulativeById && cumulativeById.has(t.id)
                ? `<span class="history-cumulative">Acumulado: R$ ${cumulativeById.get(t.id).toFixed(2).replace('.', ',')}</span>`
                : '';

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-info">
                    <div class="history-icon ${isInvest ? 'history-icon--invest' : ''}"><i class="fa-solid ${t.icon}"></i></div>
                    <div class="history-details">
                        <h4>${t.description}</h4>
                        <span>
                            ${t.categoryName} • ${t.date}
                            <em class="history-tag ${isInvest ? 'tag-invest' : 'tag-gasto'}">${isInvest ? 'Investimento' : 'Gasto'}</em>
                            ${cumulativeBadge}
                        </span>
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

        document.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.onclick = () => {
                const idToDelete = parseFloat(btn.getAttribute('data-id'));
                if (confirm('Excluir este lançamento do extrato?')) {
                    deleteTransaction(idToDelete);
                }
            };
        });
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(t => t.id !== id);
        saveState();
        updateUI();
        replyWithDelay('Lançamento removido do seu extrato e recalculado no gráfico com sucesso!', 300);
    }

    // Abas "Todos / Gastos / Investimentos" no extrato
    if (historyTypeTabs) {
        historyTypeTabs.querySelectorAll('.tab-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                historyTypeTabs.querySelectorAll('.tab-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                historyTypeFilter = btn.getAttribute('data-type');
                renderHistoryList();
            });
        });
    }

    /* =========================================================
       8. MODAL & CATEGORIAS CUSTOMIZADAS
       Agora dá pra escolher se a categoria nova é um Gasto ou
       um Investimento, direto no modal.
       ========================================================= */
    btnAddCategory.addEventListener('click', () => {
        categoryModal.classList.add('active');
        newCategoryInput.focus();
    });

    btnCancelCategory.addEventListener('click', () => {
        categoryModal.classList.remove('active');
        newCategoryInput.value = '';
        resetCategoryTypeToggle();
    });

    if (categoryTypeToggle) {
        categoryTypeToggle.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                categoryTypeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                newCategoryType = btn.getAttribute('data-type');
            });
        });
    }

    function resetCategoryTypeToggle() {
        newCategoryType = 'gasto';
        if (categoryTypeToggle) {
            categoryTypeToggle.querySelectorAll('.type-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-type') === 'gasto');
            });
        }
    }

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
            const isInvest = newCategoryType === 'investimento';
            // Tons de verde para investimento, tons de roxo para gasto —
            // assim a cor já ajuda a diferenciar de longe.
            const randomColor = isInvest
                ? `hsl(${Math.floor(Math.random() * 40) + 140}, 55%, 48%)`
                : `hsl(${Math.floor(Math.random() * 60) + 250}, 80%, 65%)`;

            categoriesList.push({
                name: catName,
                slug,
                color: randomColor,
                icon: isInvest ? 'fa-chart-line' : 'fa-briefcase',
                type: newCategoryType
            });
            saveState();
            renderCustomChipsAndFilters();
            updateUI();
        }

        const targetChip = categorySelector.querySelector(`[data-category="${slug}"]`);
        if (targetChip) targetChip.click();

        categoryModal.classList.remove('active');
        newCategoryInput.value = '';
        resetCategoryTypeToggle();
    }

    /* =========================================================
       9. PARSER DE VALOR EM REAIS
       Trata "R$ 1.234,56", "1234.56", "120,50", "850" etc.
       (a versão anterior quebrava em qualquer valor com milhar,
       porque parava no primeiro separador que encontrasse)
       ========================================================= */
    function parseAmount(text) {
        const match = text.match(/(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
        if (!match) return null;

        let raw = match[1];

        const hasDot = raw.includes('.');
        const hasComma = raw.includes(',');

        if (hasDot && hasComma) {
            // "1.234,56" -> ponto é milhar, vírgula é decimal
            raw = raw.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            // "120,50" -> vírgula decimal
            raw = raw.replace(',', '.');
        } else if (hasDot) {
            const parts = raw.split('.');
            const lastPart = parts[parts.length - 1];
            if (parts.length > 1 && lastPart.length === 3) {
                // "1.500" -> ponto de milhar (moeda raramente tem 3 casas decimais)
                raw = raw.replace(/\./g, '');
            }
            // senão, já é decimal padrão ("120.5")
        }

        const value = parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    /* =========================================================
       10. RECONHECIMENTO DE CATEGORIA POR PONTUAÇÃO
       Em vez de parar na primeira palavra-chave que bater
       (o que causava erros como marcar "cliente" como Investimento
       por engano), soma pontos por categoria e escolhe a maior.
       ========================================================= */
    function detectCategoryFromText(lowerText) {
        let bestSlug = null;
        let bestScore = 0;

        Object.entries(CATEGORY_KEYWORDS).forEach(([slug, keywords]) => {
            const score = keywords.reduce((acc, kw) => acc + (lowerText.includes(kw) ? 1 : 0), 0);
            if (score > bestScore) {
                bestScore = score;
                bestSlug = slug;
            }
        });

        if (!bestSlug) return null;
        return categoriesList.find(c => c.slug === bestSlug) || null;
    }

    /* =========================================================
       11. ENVIAR E PROCESSAR MENSAGENS
       ========================================================= */
    btnSend.addEventListener('click', handleUserPrompt);
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserPrompt();
    });

    function handleUserPrompt() {
        const query = textInput.value.trim();
        if (!query) return;

        addChatMessage('user', query);
        textInput.value = '';
        btnSend.disabled = true;

        const lower = query.toLowerCase();
        const value = parseAmount(lower);

        setTimeout(() => {
            if (value !== null) {
                processFinancialRegistration(query, lower, value);
            } else {
                processFinancialAdvisory(lower);
            }
            btnSend.disabled = false;
        }, 150);
    }

    function processFinancialRegistration(rawText, lowerText, value) {
        let matchedCategory = null;
        let autoDetected = false;

        if (selectedCategory !== 'auto') {
            const activeBtn = categorySelector.querySelector('.chip-btn.active');
            const fullName = activeBtn ? activeBtn.getAttribute('data-fullname') : '';
            matchedCategory = categoriesList.find(c => c.name.toLowerCase() === fullName.toLowerCase());
        }

        if (!matchedCategory) {
            matchedCategory = detectCategoryFromText(lowerText);
            autoDetected = true;
        }

        if (!matchedCategory) {
            matchedCategory = categoriesList.find(c => c.slug === 'outros')
                || { name: 'Outros', slug: 'outros', color: '#6b7280', icon: 'fa-circle-question', type: 'gasto' };
        }

        const isInvest = (matchedCategory.type || 'gasto') === 'investimento';

        const newTransaction = {
            id: Date.now(),
            description: rawText,
            amount: value,
            categoryName: matchedCategory.name,
            categoryType: matchedCategory.type || 'gasto',
            icon: matchedCategory.icon || 'fa-wallet',
            date: `Hoje às ${formatTime()}`
        };

        transactions.unshift(newTransaction);
        saveState();
        updateUI();

        const formattedValue = value.toFixed(2).replace('.', ',');
        let message = isInvest
            ? `Investimento de <strong>R$ ${formattedValue}</strong> registrado em <strong>${matchedCategory.name}</strong>. 📈`
            : `Lançamento de <strong>R$ ${formattedValue}</strong> registrado em <strong>${matchedCategory.name}</strong>.`;

        if (autoDetected && matchedCategory.slug === 'outros') {
            message += ' Não reconheci a categoria pelo texto — se quiser, escolha um chip antes de lançar o próximo item.';
        } else if (autoDetected) {
            const categoryTotal = transactions
                .filter(t => t.categoryName === matchedCategory.name)
                .reduce((acc, t) => acc + t.amount, 0);
            const groupTotal = transactions
                .filter(t => (t.categoryType || 'gasto') === (matchedCategory.type || 'gasto'))
                .reduce((acc, t) => acc + t.amount, 0);
            const share = groupTotal > 0 ? Math.round((categoryTotal / groupTotal) * 100) : 0;

            if (share >= 40) {
                const groupLabel = isInvest ? 'do que você investiu' : 'dos seus gastos';
                message += ` Só de olho: <strong>${matchedCategory.name}</strong> já representa ${share}% ${groupLabel}.`;
            }
        }

        replyWithDelay(message, 450);
    }

    function processFinancialAdvisory(query) {
        const tips = [
            { keys: ['empresa', 'negócio', 'negocio'], text: '<strong>Dica corporativa:</strong> manter as contas da empresa separadas das pessoais é o primeiro passo para um crescimento saudável do negócio.' },
            { keys: ['economizar', 'guardar', 'poupar'], text: '<strong>Estratégia 50/30/20:</strong> 50% necessidades, 30% desejos e 20% investimento ou reserva de emergência.' },
            { keys: ['dívida', 'divida', 'endividado'], text: '<strong>Dívidas:</strong> priorize sempre quitar primeiro as de juros mais altos (geralmente cartão de crédito e cheque especial).' },
            { keys: ['reserva', 'emergência', 'emergencia'], text: '<strong>Reserva de emergência:</strong> o ideal é ter de 3 a 6 meses do seu custo de vida guardado em algo líquido, como Tesouro Selic ou CDB com liquidez diária.' },
            { keys: ['meta', 'objetivo', 'planejamento'], text: '<strong>Planejamento:</strong> metas financeiras funcionam melhor quando têm valor e prazo definidos — em vez de "guardar dinheiro", tente "guardar R$ 300/mês por 6 meses".' },
            { keys: ['cartão', 'cartao', 'fatura'], text: '<strong>Cartão de crédito:</strong> tente nunca pagar apenas o mínimo da fatura — os juros do rotativo estão entre os mais altos do mercado.' },
            { keys: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'], text: 'Olá! Pode me contar um gasto (ex: "R$ 30 uber"), um investimento (ex: "R$ 200 cdb") ou perguntar sobre organização financeira, dívidas, reserva de emergência ou metas.' },
        ];

        const found = tips.find(tip => tip.keys.some(k => query.includes(k)));

        const response = found
            ? found.text
            : 'Não peguei um valor na sua mensagem. Digite algo como <strong>"R$ 45 almoço"</strong> para eu lançar, ou pergunte sobre dívidas, reserva de emergência, metas ou economia.';

        replyWithDelay(response, 500);
    }

    // Evento de Mudança no Filtro do Extrato
    historyFilter.addEventListener('change', renderHistoryList);

    // Inicialização
    renderCustomChipsAndFilters();
    updateUI();
});