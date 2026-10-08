"use strict";

/* =========================================================
   ФИНПЛАН — MVP
   Локальное приложение для учета личных финансов
   ========================================================= */

/* =========================================================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
   ========================================================= */

const STORAGE_KEY = "finplan_mvp_v1";

let state = {
    transactions: [],
    debts: [],
    goals: [],
    mandatoryPayments: []
};


/* =========================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ========================================================= */

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}


function formatMoney(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0
    }).format(number);
}


function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}


function formatPercent(value) {
    return `${(Number(value) || 0).toFixed(1)}%`;
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function todayISO() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


function getCurrentMonth() {
    const date = new Date();

    return {
        year: date.getFullYear(),
        month: date.getMonth()
    };
}


function isCurrentMonth(dateString) {
    if (!dateString) return false;

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return false;

    const current = getCurrentMonth();

    return (
        date.getFullYear() === current.year &&
        date.getMonth() === current.month
    );
}


function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}


function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return;
    }

    try {
        const parsed = JSON.parse(saved);

        state = {
            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : [],

            debts: Array.isArray(parsed.debts)
                ? parsed.debts
                : [],

            goals: Array.isArray(parsed.goals)
                ? parsed.goals
                : [],

            mandatoryPayments: Array.isArray(parsed.mandatoryPayments)
                ? parsed.mandatoryPayments
                : []
        };

    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
    }
}


/* =========================================================
   НАВИГАЦИЯ
   ========================================================= */

function showView(viewName) {
    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active");
    });

    const target = document.getElementById(viewName);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    renderAll();
}


/* =========================================================
   ДАТА
   ========================================================= */

function renderDate() {
    const element = document.getElementById("currentDate");

    if (!element) return;

    const date = new Date();

    element.textContent = date.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}


/* =========================================================
   ТРАНЗАКЦИИ
   ========================================================= */

function addTransaction(data) {
    const amount = Number(data.amount);

    if (!amount || amount <= 0) {
        alert("Введите корректную сумму.");
        return;
    }

    state.transactions.push({
        id: generateId(),
        type: data.type === "income" ? "income" : "expense",
        amount,
        category: data.category || "other",
        description: data.description || "",
        date: data.date || todayISO()
    });

    saveState();
    closeModal();
    renderAll();
}


function deleteTransaction(id) {
    const transaction = state.transactions.find(
        item => item.id === id
    );

    if (!transaction) return;

    const confirmed = confirm(
        `Удалить операцию на ${formatMoney(transaction.amount)}?`
    );

    if (!confirmed) return;

    state.transactions = state.transactions.filter(
        item => item.id !== id
    );

    saveState();
    renderAll();
}


function getTransactionCategoryName(category) {
    const categories = {
        salary: "Зарплата",
        freelance: "Подработка",
        investment: "Инвестиции",
        food: "Продукты",
        transport: "Транспорт",
        housing: "Жильё",
        utilities: "Коммунальные",
        shopping: "Покупки",
        health: "Здоровье",
        entertainment: "Развлечения",
        loan: "Кредит",
        mortgage: "Ипотека",
        installment: "Рассрочка",
        other: "Другое"
    };

    return categories[category] || "Другое";
}


function getTransactionIcon(category) {
    const icons = {
        salary: "₽",
        freelance: "💼",
        investment: "📈",
        food: "🍴",
        transport: "🚗",
        housing: "🏠",
        utilities: "💡",
        shopping: "🛍",
        health: "💊",
        entertainment: "🎬",
        loan: "💳",
        mortgage: "🏠",
        installment: "📆",
        other: "•"
    };

    return icons[category] || "•";
}


function getMonthlyIncome() {
    return state.transactions
        .filter(item =>
            item.type === "income" &&
            isCurrentMonth(item.date)
        )
        .reduce((sum, item) => sum + Number(item.amount), 0);
}


function getMonthlyExpenses() {
    return state.transactions
        .filter(item =>
            item.type === "expense" &&
            isCurrentMonth(item.date)
        )
        .reduce((sum, item) => sum + Number(item.amount), 0);
}


function getTotalIncome() {
    return state.transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);
}


function getTotalExpenses() {
    return state.transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);
}


function getBalance() {
    return getTotalIncome() - getTotalExpenses();
}


function renderTransactions(filter = "all") {
    const list = document.getElementById("transactionsList");

    if (!list) return;

    let transactions = [...state.transactions];

    if (filter === "income") {
        transactions = transactions.filter(
            item => item.type === "income"
        );
    }

    if (filter === "expense") {
        transactions = transactions.filter(
            item => item.type === "expense"
        );
    }

    transactions.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    if (!transactions.length) {
        list.innerHTML = `
            <div class="empty">
                <div class="empty-icon">₽</div>
                <div>Операций пока нет</div>
                <span>Добавьте первую операцию</span>
            </div>
        `;

        return;
    }

    list.innerHTML = transactions.map(item => {
        const isIncome = item.type === "income";

        return `
            <div class="row transaction-row">
                <div class="row-left">

                    <div class="circle ${isIncome ? "green" : "red"}">
                        ${escapeHtml(getTransactionIcon(item.category))}
                    </div>

                    <div>
                        <div class="row-title">
                            ${escapeHtml(
                                item.description ||
                                getTransactionCategoryName(item.category)
                            )}
                        </div>

                        <div class="row-sub">
                            ${escapeHtml(
                                getTransactionCategoryName(item.category)
                            )}
                            · ${formatDate(item.date)}
                        </div>
                    </div>

                </div>

                <div class="row-right">

                    <div class="amount ${isIncome ? "green-text" : "red-text"}">
                        ${isIncome ? "+" : "−"}${formatMoney(item.amount)}
                    </div>

                    <button
                        class="icon-btn"
                        onclick="deleteTransaction('${item.id}')"
                        title="Удалить"
                    >
                        ×
                    </button>

                </div>
            </div>
        `;
    }).join("");
}


function renderDashboardTransactions() {
    const container = document.getElementById(
        "dashboardTransactions"
    );

    if (!container) return;

    const transactions = [...state.transactions]
        .sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        )
        .slice(0, 5);

    if (!transactions.length) {
        container.innerHTML = `
            <div class="empty">
                Операций пока нет
            </div>
        `;

        return;
    }

    container.innerHTML = transactions.map(item => {
        const isIncome = item.type === "income";

        return `
            <div class="row">

                <div class="row-left">

                    <div class="circle ${isIncome ? "green" : "red"}">
                        ${escapeHtml(getTransactionIcon(item.category))}
                    </div>

                    <div>
                        <div class="row-title">
                            ${escapeHtml(
                                item.description ||
                                getTransactionCategoryName(item.category)
                            )}
                        </div>

                        <div class="row-sub">
                            ${formatDate(item.date)}
                        </div>
                    </div>

                </div>

                <div class="amount ${isIncome ? "green-text" : "red-text"}">
                    ${isIncome ? "+" : "−"}${formatMoney(item.amount)}
                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   МОДАЛЬНОЕ ОКНО ТРАНЗАКЦИИ
   ========================================================= */

function openTransactionModal() {
    openModal(
        "Добавить операцию",
        `
        <form onsubmit="submitTransactionForm(event)">

            <div class="form-grid">

                <div class="field full">
                    <label>Тип операции</label>

                    <select id="transactionType">
                        <option value="expense">
                            Расход
                        </option>

                        <option value="income">
                            Доход
                        </option>
                    </select>
                </div>

                <div class="field">
                    <label>Сумма</label>

                    <input
                        id="transactionAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="5000"
                        required
                    >
                </div>

                <div class="field">
                    <label>Дата</label>

                    <input
                        id="transactionDate"
                        type="date"
                        value="${todayISO()}"
                        required
                    >
                </div>

                <div class="field full">
                    <label>Категория</label>

                    <select id="transactionCategory">

                        <option value="salary">
                            Зарплата
                        </option>

                        <option value="freelance">
                            Подработка
                        </option>

                        <option value="food">
                            Продукты
                        </option>

                        <option value="transport">
                            Транспорт
                        </option>

                        <option value="housing">
                            Жильё
                        </option>

                        <option value="utilities">
                            Коммунальные
                        </option>

                        <option value="shopping">
                            Покупки
                        </option>

                        <option value="health">
                            Здоровье
                        </option>

                        <option value="entertainment">
                            Развлечения
                        </option>

                        <option value="loan">
                            Кредит
                        </option>

                        <option value="mortgage">
                            Ипотека
                        </option>

                        <option value="installment">
                            Рассрочка
                        </option>

                        <option value="other">
                            Другое
                        </option>

                    </select>
                </div>

                <div class="field full">
                    <label>Описание</label>

                    <input
                        id="transactionDescription"
                        type="text"
                        placeholder="Например: продукты в Пятёрочке"
                    >
                </div>

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="primary-btn"
                >
                    Добавить
                </button>

            </div>

        </form>
        `
    );
}


function submitTransactionForm(event) {
    event.preventDefault();

    addTransaction({
        type: document.getElementById("transactionType").value,
        amount: document.getElementById("transactionAmount").value,
        category: document.getElementById("transactionCategory").value,
        description: document.getElementById("transactionDescription").value.trim(),
        date: document.getElementById("transactionDate").value
    });
}


function filterTransactions(type, button) {
    document.querySelectorAll(".filter").forEach(item => {
        item.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    renderTransactions(type);
}


/* =========================================================
   КРЕДИТЫ / ИПОТЕКА / РАССРОЧКИ
   ========================================================= */

/*
    Расчет оставшейся задолженности.

    balance  — текущий остаток
    annualRate — годовая ставка
    payment — ежемесячный платеж

    Расчет делается помесячно.
*/

function calculateLoan(balance, annualRate, payment) {
    let remaining = Number(balance) || 0;
    const rate = (Number(annualRate) || 0) / 100 / 12;
    const monthlyPayment = Number(payment) || 0;

    if (remaining <= 0) {
        return {
            valid: true,
            months: 0,
            totalPayments: 0,
            interest: 0
        };
    }

    if (monthlyPayment <= 0) {
        return {
            valid: false,
            reason: "Не указан ежемесячный платеж"
        };
    }

    if (rate > 0 && monthlyPayment <= remaining * rate) {
        return {
            valid: false,
            reason: "Платеж не покрывает начисляемые проценты"
        };
    }

    let months = 0;
    let totalPayments = 0;
    let totalInterest = 0;

    const MAX_MONTHS = 1200;

    while (remaining > 0.01 && months < MAX_MONTHS) {
        let interest = remaining * rate;

        let principal = monthlyPayment - interest;

        if (rate === 0) {
            interest = 0;
            principal = monthlyPayment;
        }

        if (principal <= 0) {
            return {
                valid: false,
                reason: "Платеж слишком маленький"
            };
        }

        let actualPayment = monthlyPayment;

        if (principal >= remaining) {
            principal = remaining;
            actualPayment = remaining + interest;
        }

        remaining -= principal;

        totalInterest += interest;
        totalPayments += actualPayment;

        months++;
    }

    if (months >= MAX_MONTHS) {
        return {
            valid: false,
            reason: "Срок расчета слишком большой"
        };
    }

    return {
        valid: true,
        months,
        totalPayments,
        interest: totalInterest
    };
}


function addDebt(data) {
    const balance = Number(data.balance);
    const payment = Number(data.payment);

    if (!balance || balance <= 0) {
        alert("Введите остаток долга.");
        return;
    }

    if (!payment || payment <= 0) {
        alert("Введите ежемесячный платеж.");
        return;
    }

    state.debts.push({
        id: generateId(),

        name: data.name || "Новый кредит",

        type: data.type || "credit",

        bank: data.bank || "",

        originalAmount: Number(data.originalAmount) || balance,

        balance,

        annualRate: Number(data.annualRate) || 0,

        payment,

        paymentDay: Number(data.paymentDay) || 1,

        startDate: data.startDate || todayISO(),

        termMonths: Number(data.termMonths) || 0
    });

    saveState();
    closeModal();
    renderAll();
}


function deleteDebt(id) {
    const debt = state.debts.find(
        item => item.id === id
    );

    if (!debt) return;

    if (!confirm(`Удалить «${debt.name}»?`)) {
        return;
    }

    state.debts = state.debts.filter(
        item => item.id !== id
    );

    saveState();
    renderAll();
}


function openDebtModal() {
    openModal(
        "Добавить долг",
        `
        <form onsubmit="submitDebtForm(event)">

            <div class="form-grid">

                <div class="field full">
                    <label>Название</label>

                    <input
                        id="debtName"
                        type="text"
                        placeholder="Например: Потребительский кредит"
                        required
                    >
                </div>

                <div class="field">
                    <label>Тип</label>

                    <select id="debtType">

                        <option value="credit">
                            Кредит
                        </option>

                        <option value="mortgage">
                            Ипотека
                        </option>

                        <option value="installment">
                            Рассрочка
                        </option>

                    </select>
                </div>

                <div class="field">
                    <label>Банк</label>

                    <input
                        id="debtBank"
                        type="text"
                        placeholder="Название банка"
                    >
                </div>

                <div class="field">
                    <label>Первоначальная сумма</label>

                    <input
                        id="debtOriginal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="300000"
                    >
                </div>

                <div class="field">
                    <label>Текущий остаток</label>

                    <input
                        id="debtBalance"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="250000"
                        required
                    >
                </div>

                <div class="field">
                    <label>Ставка, % годовых</label>

                    <input
                        id="debtRate"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="24.9"
                    >
                </div>

                <div class="field">
                    <label>Ежемесячный платеж</label>

                    <input
                        id="debtPayment"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="10000"
                        required
                    >
                </div>

                <div class="field">
                    <label>День платежа</label>

                    <input
                        id="debtPaymentDay"
                        type="number"
                        min="1"
                        max="31"
                        value="10"
                    >
                </div>

                <div class="field">
                    <label>Срок, месяцев</label>

                    <input
                        id="debtTerm"
                        type="number"
                        min="0"
                        placeholder="36"
                    >
                </div>

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="primary-btn"
                >
                    Добавить
                </button>

            </div>

        </form>
        `
    );
}


function submitDebtForm(event) {
    event.preventDefault();

    addDebt({
        name: document.getElementById("debtName").value.trim(),

        type: document.getElementById("debtType").value,

        bank: document.getElementById("debtBank").value.trim(),

        originalAmount: document.getElementById("debtOriginal").value,

        balance: document.getElementById("debtBalance").value,

        annualRate: document.getElementById("debtRate").value,

        payment: document.getElementById("debtPayment").value,

        paymentDay: document.getElementById("debtPaymentDay").value,

        termMonths: document.getElementById("debtTerm").value
    });
}


function getDebtTypeName(type) {
    const names = {
        credit: "Кредит",
        mortgage: "Ипотека",
        installment: "Рассрочка"
    };

    return names[type] || "Долг";
}


function getTotalDebt() {
    return state.debts.reduce(
        (sum, debt) => sum + Number(debt.balance),
        0
    );
}


function getMonthlyDebtPayments() {
    return state.debts.reduce(
        (sum, debt) => sum + Number(debt.payment),
        0
    );
}


function renderDebts() {
    const list = document.getElementById("debtsList");

    if (!list) return;

    if (!state.debts.length) {
        list.innerHTML = `
            <div class="empty">
                <div class="empty-icon">💳</div>
                <div>Долгов пока нет</div>
                <span>Добавьте кредит, ипотеку или рассрочку</span>
            </div>
        `;

        return;
    }

    list.innerHTML = state.debts.map(debt => {
        const calculation = calculateLoan(
            debt.balance,
            debt.annualRate,
            debt.payment
        );

        let calculationText = "";

        if (calculation.valid) {
            calculationText = `
                <div class="debt-grid">

                    <div class="debt-metric">
                        <span>Осталось месяцев</span>
                        <strong>${calculation.months}</strong>
                    </div>

                    <div class="debt-metric">
                        <span>Проценты</span>
                        <strong>
                            ${formatMoney(calculation.interest)}
                        </strong>
                    </div>

                </div>
            `;
        } else {
            calculationText = `
                <div class="debt-warning">
                    ${escapeHtml(calculation.reason)}
                </div>
            `;
        }

        let progress = 0;

        if (
            Number(debt.originalAmount) > 0 &&
            Number(debt.balance) >= 0
        ) {
            progress =
                (1 -
                    Number(debt.balance) /
                    Number(debt.originalAmount)
                ) * 100;

            progress = clamp(progress, 0, 100);
        }

        return `
            <div class="debt-card">

                <div class="debt-top">

                    <div>
                        <div class="debt-name">
                            ${escapeHtml(debt.name)}
                        </div>

                        <div class="row-sub">
                            ${escapeHtml(getDebtTypeName(debt.type))}
                            ${debt.bank
                                ? " · " + escapeHtml(debt.bank)
                                : ""}
                        </div>
                    </div>

                    <button
                        class="icon-btn"
                        onclick="deleteDebt('${debt.id}')"
                        title="Удалить"
                    >
                        ×
                    </button>

                </div>

                <div class="debt-balance">
                    ${formatMoney(debt.balance)}
                </div>

                <div class="row-sub">
                    Остаток долга
                </div>

                <div class="progress">
                    <div
                        class="progress-bar"
                        style="width:${progress}%"
                    ></div>
                </div>

                <div class="row-sub">
                    Погашено тела: ${progress.toFixed(0)}%
                </div>

                ${calculationText}

                <div class="debt-grid">

                    <div class="debt-metric">
                        <span>Ставка</span>
                        <strong>
                            ${formatPercent(debt.annualRate)}
                        </strong>
                    </div>

                    <div class="debt-metric">
                        <span>Платеж</span>
                        <strong>
                            ${formatMoney(debt.payment)}
                        </strong>
                    </div>

                    <div class="debt-metric">
                        <span>День платежа</span>
                        <strong>
                            ${debt.paymentDay}
                        </strong>
                    </div>

                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   ЦЕЛИ
   ========================================================= */

function addGoal(data) {
    const target = Number(data.target);
    const current = Number(data.current) || 0;

    if (!target || target <= 0) {
        alert("Введите сумму цели.");
        return;
    }

    state.goals.push({
        id: generateId(),

        name: data.name || "Новая цель",

        target,

        current: Math.max(0, current),

        deadline: data.deadline || "",

        icon: data.icon || "🎯"
    });

    saveState();
    closeModal();
    renderAll();
}


function deleteGoal(id) {
    const goal = state.goals.find(
        item => item.id === id
    );

    if (!goal) return;

    if (!confirm(`Удалить цель «${goal.name}»?`)) {
        return;
    }

    state.goals = state.goals.filter(
        item => item.id !== id
    );

    saveState();
    renderAll();
}


function openGoalModal() {
    openModal(
        "Добавить цель",
        `
        <form onsubmit="submitGoalForm(event)">

            <div class="form-grid">

                <div class="field full">
                    <label>Название цели</label>

                    <input
                        id="goalName"
                        type="text"
                        placeholder="Например: Япония"
                        required
                    >
                </div>

                <div class="field">
                    <label>Целевая сумма</label>

                    <input
                        id="goalTarget"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="280000"
                        required
                    >
                </div>

                <div class="field">
                    <label>Уже накоплено</label>

                    <input
                        id="goalCurrent"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="15000"
                    >
                </div>

                <div class="field">
                    <label>Срок</label>

                    <input
                        id="goalDeadline"
                        type="date"
                    >
                </div>

                <div class="field">
                    <label>Иконка</label>

                    <input
                        id="goalIcon"
                        type="text"
                        value="🎯"
                        maxlength="2"
                    >
                </div>

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="primary-btn"
                >
                    Добавить
                </button>

            </div>

        </form>
        `
    );
}


function submitGoalForm(event) {
    event.preventDefault();

    addGoal({
        name: document.getElementById("goalName").value.trim(),

        target: document.getElementById("goalTarget").value,

        current: document.getElementById("goalCurrent").value,

        deadline: document.getElementById("goalDeadline").value,

        icon: document.getElementById("goalIcon").value || "🎯"
    });
}


function renderGoals() {
    const list = document.getElementById("goalsList");

    if (!list) return;

    if (!state.goals.length) {
        list.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎯</div>
                <div>Целей пока нет</div>
                <span>Создайте первую финансовую цель</span>
            </div>
        `;

        return;
    }

    list.innerHTML = state.goals.map(goal => {
        const target = Number(goal.target);
        const current = Number(goal.current);

        const progress = target > 0
            ? clamp((current / target) * 100, 0, 100)
            : 0;

        const remaining = Math.max(
            target - current,
            0
        );

        return `
            <div class="goal-card">

                <div class="goal-header">

                    <div class="goal-icon">
                        ${escapeHtml(goal.icon)}
                    </div>

                    <div>
                        <div class="goal-name">
                            ${escapeHtml(goal.name)}
                        </div>

                        <div class="row-sub">
                            ${goal.deadline
                                ? "До " + formatDate(goal.deadline)
                                : "Без срока"}
                        </div>
                    </div>

                    <button
                        class="icon-btn"
                        onclick="deleteGoal('${goal.id}')"
                    >
                        ×
                    </button>

                </div>

                <div class="goal-numbers">

                    <strong>
                        ${formatMoney(current)}
                    </strong>

                    <span>
                        из ${formatMoney(target)}
                    </span>

                </div>

                <div class="goal-bar">
                    <div
                        style="width:${progress}%"
                    ></div>
                </div>

                <div class="goal-footer">

                    <span>
                        ${progress.toFixed(0)}%
                    </span>

                    <span>
                        Осталось ${formatMoney(remaining)}
                    </span>

                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ
   ========================================================= */

function addMandatoryPayment(data) {
    const amount = Number(data.amount);

    if (!amount || amount <= 0) {
        alert("Введите сумму платежа.");
        return;
    }

    state.mandatoryPayments.push({
        id: generateId(),

        name: data.name || "Обязательный платеж",

        amount,

        category: data.category || "other",

        paymentDay: Number(data.paymentDay) || 1
    });

    saveState();
    closeModal();
    renderAll();
}


function deleteMandatoryPayment(id) {
    state.mandatoryPayments =
        state.mandatoryPayments.filter(
            item => item.id !== id
        );

    saveState();
    renderAll();
}


function openMandatoryPaymentModal() {
    openModal(
        "Добавить обязательный платеж",
        `
        <form onsubmit="submitMandatoryPaymentForm(event)">

            <div class="form-grid">

                <div class="field full">
                    <label>Название</label>

                    <input
                        id="mandatoryName"
                        type="text"
                        placeholder="Например: Интернет"
                        required
                    >
                </div>

                <div class="field">
                    <label>Сумма в месяц</label>

                    <input
                        id="mandatoryAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="1200"
                        required
                    >
                </div>

                <div class="field">
                    <label>День платежа</label>

                    <input
                        id="mandatoryDay"
                        type="number"
                        min="1"
                        max="31"
                        value="10"
                    >
                </div>

                <div class="field full">
                    <label>Категория</label>

                    <select id="mandatoryCategory">

                        <option value="housing">
                            Жильё
                        </option>

                        <option value="utilities">
                            Коммунальные
                        </option>

                        <option value="transport">
                            Транспорт
                        </option>

                        <option value="subscription">
                            Подписка
                        </option>

                        <option value="other">
                            Другое
                        </option>

                    </select>
                </div>

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeModal()"
                >
                    Отмена
                </button>

                <button
                    type="submit"
                    class="primary-btn"
                >
                    Добавить
                </button>

            </div>

        </form>
        `
    );
}


function submitMandatoryPaymentForm(event) {
    event.preventDefault();

    addMandatoryPayment({
        name: document.getElementById("mandatoryName").value.trim(),

        amount: document.getElementById("mandatoryAmount").value,

        paymentDay: document.getElementById("mandatoryDay").value,

        category: document.getElementById("mandatoryCategory").value
    });
}


function getMandatoryPaymentsTotal() {
    return state.mandatoryPayments.reduce(
        (sum, item) => sum + Number(item.amount),
        0
    );
}


function getTotalMandatoryExpenses() {
    return (
        getMonthlyDebtPayments() +
        getMandatoryPaymentsTotal()
    );
}


function renderPayments() {
    const list = document.getElementById("paymentsList");

    if (!list) return;

    const payments = [];

    state.debts.forEach(debt => {
        payments.push({
            id: `debt-${debt.id}`,

            name: debt.name,

            amount: debt.payment,

            day: debt.paymentDay,

            type: getDebtTypeName(debt.type),

            source: "debt"
        });
    });

    state.mandatoryPayments.forEach(payment => {
        payments.push({
            id: `mandatory-${payment.id}`,

            name: payment.name,

            amount: payment.amount,

            day: payment.paymentDay,

            type: "Обязательный платеж",

            source: "mandatory"
        });
    });

    payments.sort((a, b) =>
        Number(a.day) - Number(b.day)
    );

    if (!payments.length) {
        list.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📅</div>
                <div>Обязательных платежей пока нет</div>
                <span>Добавьте кредит или регулярный платеж</span>
            </div>
        `;

        return;
    }

    list.innerHTML = payments.map(payment => `
        <div class="row">

            <div class="row-left">

                <div class="circle orange">
                    ${payment.source === "debt" ? "₽" : "•"}
                </div>

                <div>

                    <div class="row-title">
                        ${escapeHtml(payment.name)}
                    </div>

                    <div class="row-sub">
                        ${escapeHtml(payment.type)}
                        · ${payment.day}-го числа
                    </div>

                </div>

            </div>

            <div class="row-right">

                <div class="amount">
                    ${formatMoney(payment.amount)}
                </div>

                ${
                    payment.source === "mandatory"
                    ? `
                        <button
                            class="icon-btn"
                            onclick="deleteMandatoryPayment('${payment.id.replace("mandatory-", "")}')"
                        >
                            ×
                        </button>
                    `
                    : ""
                }

            </div>

        </div>
    `).join("");
}


function renderDashboardPayments() {
    const container = document.getElementById(
        "dashboardPayments"
    );

    if (!container) return;

    const payments = [];

    state.debts.forEach(debt => {
        payments.push({
            name: debt.name,
            amount: debt.payment,
            day: debt.paymentDay
        });
    });

    state.mandatoryPayments.forEach(payment => {
        payments.push({
            name: payment.name,
            amount: payment.amount,
            day: payment.paymentDay
        });
    });

    payments.sort((a, b) =>
        Number(a.day) - Number(b.day)
    );

    const firstPayments = payments.slice(0, 5);

    if (!firstPayments.length) {
        container.innerHTML = `
            <div class="empty">
                Платежей пока нет
            </div>
        `;

        return;
    }

    container.innerHTML = firstPayments.map(payment => `
        <div class="row">

            <div class="row-left">

                <div class="circle orange">
                    ${payment.day}
                </div>

                <div>

                    <div class="row-title">
                        ${escapeHtml(payment.name)}
                    </div>

                    <div class="row-sub">
                        Платеж ${payment.day}-го числа
                    </div>

                </div>

            </div>

            <div class="amount">
                ${formatMoney(payment.amount)}
            </div>

        </div>
    `).join("");
}


/* =========================================================
   ДАШБОРД
   ========================================================= */

function renderDashboard() {
    const balance = getBalance();
    const income = getMonthlyIncome();
    const expense = getMonthlyExpenses();

    const totalDebt = getTotalDebt();
    const monthlyDebt = getMonthlyDebtPayments();
    const mandatory = getTotalMandatoryExpenses();

    const debtLoad =
        income > 0
            ? (monthlyDebt / income) * 100
            : 0;

    const balanceElement =
        document.getElementById("heroBalance");

    const incomeElement =
        document.getElementById("heroIncome");

    const expenseElement =
        document.getElementById("heroExpense");

    const totalDebtElement =
        document.getElementById("totalDebt");

    const monthlyDebtElement =
        document.getElementById("monthlyDebt");

    const mandatoryElement =
        document.getElementById("mandatoryExpenses");

    const debtLoadElement =
        document.getElementById("debtLoad");

    if (balanceElement) {
        balanceElement.textContent =
            formatMoney(balance);
    }

    if (incomeElement) {
        incomeElement.textContent =
            formatMoney(income);
    }

    if (expenseElement) {
        expenseElement.textContent =
            formatMoney(expense);
    }

    if (totalDebtElement) {
        totalDebtElement.textContent =
            formatMoney(totalDebt);
    }

    if (monthlyDebtElement) {
        monthlyDebtElement.textContent =
            formatMoney(monthlyDebt);
    }

    if (mandatoryElement) {
        mandatoryElement.textContent =
            formatMoney(mandatory);
    }

    if (debtLoadElement) {
        debtLoadElement.textContent =
            income > 0
                ? `${debtLoad.toFixed(0)}%`
                : "—";
    }

    renderDashboardPayments();
    renderDashboardTransactions();
}


/* =========================================================
   ФИНАНСОВЫЙ ПОМОЩНИК
   ========================================================= */

function addChatMessage(text, type = "ai") {
    const container =
        document.getElementById("chatMessages");

    if (!container) return;

    const message = document.createElement("div");

    message.className = `message ${type}`;

    message.textContent = text;

    container.appendChild(message);

    container.scrollTop =
        container.scrollHeight;
}


function localAI(question) {
    const text = question.toLowerCase();

    const balance = getBalance();

    const income = getMonthlyIncome();

    const expenses = getMonthlyExpenses();

    const debt = getTotalDebt();

    const debtPayment = getMonthlyDebtPayments();

    const mandatory = getTotalMandatoryExpenses();

    const debtLoad =
        income > 0
            ? (debtPayment / income) * 100
            : 0;


    if (
        text.includes("долг") ||
        text.includes("кредит") ||
        text.includes("закрыть")
    ) {
        if (!state.debts.length) {
            return (
                "У вас пока не добавлены кредиты или другие долги. " +
                "Добавьте их в разделе «Долги», и я смогу рассчитать " +
                "остаток, платежи и примерную переплату."
            );
        }

        const sorted = [...state.debts]
            .sort(
                (a, b) =>
                    Number(b.annualRate) -
                    Number(a.annualRate)
            );

        const expensive = sorted[0];

        return (
            `Сейчас в приложении указано долгов на ${formatMoney(debt)}. ` +
            `Минимальные ежемесячные платежи составляют ${formatMoney(debtPayment)}. ` +
            `Если выбирать долг для досрочного погашения, математически ` +
            `обычно выгоднее направлять дополнительные деньги на кредит ` +
            `с самой высокой ставкой — сейчас это «${expensive.name}» ` +
            `со ставкой ${formatPercent(expensive.annualRate)}. ` +
            `Перед досрочным платежом стоит проверить условия банка.`
        );
    }


    if (
        text.includes("эконом") ||
        text.includes("сэкономить") ||
        text.includes("расход")
    ) {
        if (income <= 0) {
            return (
                "Добавьте доход за текущий месяц. После этого я смогу " +
                "оценить долю расходов и предложить конкретные направления " +
                "для сокращения бюджета."
            );
        }

        const expensePercent =
            (expenses / income) * 100;

        return (
            `За текущий месяц доход составляет ${formatMoney(income)}, ` +
            `а расходы — ${formatMoney(expenses)}. ` +
            `Расходы занимают примерно ${expensePercent.toFixed(0)}% дохода. ` +
            `Обязательные платежи — ${formatMoney(mandatory)}. ` +
            `Для начала я бы контролировал необязательные расходы и ` +
            `оставлял резерв после обязательных платежей.`
        );
    }


    if (
        text.includes("накоп") ||
        text.includes("сбереж") ||
        text.includes("копить")
    ) {
        return (
            `Сейчас ваш расчетный баланс по внесенным операциям — ` +
            `${formatMoney(balance)}. ` +
            `Чтобы накопления не зависели от остатка в конце месяца, ` +
            `лучше задать отдельную финансовую цель и переводить ` +
            `фиксированную сумму сразу после получения дохода.`
        );
    }


    if (
        text.includes("нагруз") ||
        text.includes("процент дохода")
    ) {
        if (income <= 0) {
            return (
                "Для расчета долговой нагрузки нужен доход за текущий месяц."
            );
        }

        return (
            `Текущая долговая нагрузка по кредитным платежам составляет ` +
            `примерно ${debtLoad.toFixed(0)}% от дохода. ` +
            `Ежемесячно на долги приходится ${formatMoney(debtPayment)}.`
        );
    }


    if (
        text.includes("баланс") ||
        text.includes("сколько денег")
    ) {
        return (
            `По внесенным операциям ваш расчетный баланс составляет ` +
            `${formatMoney(balance)}. ` +
            `Доходы за текущий месяц: ${formatMoney(income)}, ` +
            `расходы: ${formatMoney(expenses)}.`
        );
    }


    return (
        "Я могу помочь с бюджетом, кредитами, долгами, накоплениями " +
        "и финансовыми целями. Например, спросите: «Как быстрее закрыть " +
        "кредиты?» или «Сколько я могу откладывать каждый месяц?»"
    );
}


function sendAI() {
    const input =
        document.getElementById("aiInput");

    if (!input) return;

    const question =
        input.value.trim();

    if (!question) return;

    addChatMessage(question, "user");

    input.value = "";

    setTimeout(() => {
        const answer = localAI(question);

        addChatMessage(answer, "ai");
    }, 300);
}


/* =========================================================
   МОДАЛЬНОЕ ОКНО
   ========================================================= */

function openModal(title, content) {
    const modal =
        document.getElementById("modal");

    const titleElement =
        document.getElementById("modalTitle");

    const contentElement =
        document.getElementById("modalContent");

    if (!modal || !titleElement || !contentElement) {
        return;
    }

    titleElement.textContent = title;

    contentElement.innerHTML = content;

    modal.classList.add("open");
}


function closeModal() {
    const modal =
        document.getElementById("modal");

    if (modal) {
        modal.classList.remove("open");
    }
}


document.addEventListener("click", event => {
    const modal =
        document.getElementById("modal");

    if (
        modal &&
        event.target === modal
    ) {
        closeModal();
    }
});


document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
    }
});


/* =========================================================
   НАСТРОЙКИ
   ========================================================= */

function openSettings() {
    openModal(
        "Настройки",
        `
        <div class="settings-menu">

            <button
                class="secondary-btn full-btn"
                onclick="exportData()"
            >
                Экспортировать данные
            </button>

            <button
                class="secondary-btn full-btn"
                onclick="document.getElementById('importFile').click()"
            >
                Импортировать данные
            </button>

            <input
                id="importFile"
                type="file"
                accept=".json"
                style="display:none"
                onchange="importData(event)"
            >

            <button
                class="secondary-btn full-btn"
                onclick="loadDemoData()"
            >
                Загрузить пример данных
            </button>

            <button
                class="danger-btn full-btn"
                onclick="resetApplication()"
            >
                Очистить все данные
            </button>

        </div>
        `
    );
}


function exportData() {
    const data = JSON.stringify(
        state,
        null,
        2
    );

    const blob = new Blob(
        [data],
        {
            type: "application/json"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `finplan-backup-${todayISO()}.json`;

    link.click();

    URL.revokeObjectURL(url);
}


function importData(event) {
    const file =
        event.target.files[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload = function () {
        try {
            const imported =
                JSON.parse(reader.result);

            state = {
                transactions:
                    Array.isArray(imported.transactions)
                        ? imported.transactions
                        : [],

                debts:
                    Array.isArray(imported.debts)
                        ? imported.debts
                        : [],

                goals:
                    Array.isArray(imported.goals)
                        ? imported.goals
                        : [],

                mandatoryPayments:
                    Array.isArray(imported.mandatoryPayments)
                        ? imported.mandatoryPayments
                        : []
            };

            saveState();

            closeModal();

            renderAll();

            alert("Данные успешно импортированы.");

        } catch (error) {
            console.error(error);

            alert(
                "Не удалось импортировать файл. " +
                "Проверьте, что это файл ФинПлана."
            );
        }
    };

    reader.readAsText(file);
}


function resetApplication() {
    const confirmed = confirm(
        "Удалить все операции, долги, цели и платежи?"
    );

    if (!confirmed) return;

    state = {
        transactions: [],
        debts: [],
        goals: [],
        mandatoryPayments: []
    };

    saveState();

    closeModal();

    renderAll();
}


/* =========================================================
   ДЕМО-ДАННЫЕ
   ========================================================= */

function loadDemoData() {
    const confirmed = confirm(
        "Демо-данные заменят текущие данные. Продолжить?"
    );

    if (!confirmed) return;

    state = {
        transactions: [
            {
                id: generateId(),
                type: "income",
                amount: 71000,
                category: "salary",
                description: "Зарплата",
                date: todayISO()
            },

            {
                id: generateId(),
                type: "expense",
                amount: 9000,
                category: "food",
                description: "Продукты",
                date: todayISO()
            },

            {
                id: generateId(),
                type: "expense",
                amount: 3500,
                category: "transport",
                description: "Топливо",
                date: todayISO()
            },

            {
                id: generateId(),
                type: "expense",
                amount: 2500,
                category: "utilities",
                description: "Коммунальные услуги",
                date: todayISO()
            }
        ],

        debts: [
            {
                id: generateId(),

                name: "Потребительский кредит",

                type: "credit",

                bank: "Банк",

                originalAmount: 400000,

                balance: 357898,

                annualRate: 34.6,

                payment: 13665,

                paymentDay: 10,

                startDate: todayISO(),

                termMonths: 49
            },

            {
                id: generateId(),

                name: "Кредит №2",

                type: "credit",

                bank: "Банк",

                originalAmount: 100000,

                balance: 63082,

                annualRate: 25.18,

                payment: 7058,

                paymentDay: 19,

                startDate: todayISO(),

                termMonths: 10
            },

            {
                id: generateId(),

                name: "Кредит №3",

                type: "credit",

                bank: "Банк",

                originalAmount: 100000,

                balance: 74247,

                annualRate: 26.45,

                payment: 3754,

                paymentDay: 21,

                startDate: todayISO(),

                termMonths: 28
            }
        ],

        goals: [
            {
                id: generateId(),

                name: "Поездка в Японию",

                target: 280000,

                current: 15000,

                deadline: "2028-07-01",

                icon: "🇯🇵"
            }
        ],

        mandatoryPayments: [
            {
                id: generateId(),

                name: "Интернет и мобильная связь",

                amount: 1200,

                category: "utilities",

                paymentDay: 5
            },

            {
                id: generateId(),

                name: "Коммунальные услуги",

                amount: 2500,

                category: "utilities",

                paymentDay: 20
            }
        ]
    };

    saveState();

    closeModal();

    renderAll();
}


/* =========================================================
   ОБЩИЙ РЕНДЕР
   ========================================================= */

function renderAll() {
    renderDate();

    renderDashboard();

    renderTransactions();

    renderDebts();

    renderGoals();

    renderPayments();
}


/* =========================================================
   КЛАВИАТУРА В AI-ЧАТЕ
   ========================================================= */

document.addEventListener("keydown", event => {
    const input =
        document.getElementById("aiInput");

    if (!input) return;

    if (
        document.activeElement === input &&
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();

        sendAI();
    }
});


/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

function initApp() {
    loadState();

    renderDate();

    renderAll();
}


document.addEventListener(
    "DOMContentLoaded",
    initApp
);