// Хранилище данных
let items = JSON.parse(localStorage.getItem('financeItems')) || [];

// DOM Элементы
const financeForm = document.getElementById('financeForm');
const typeInput = document.getElementById('type');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');

const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const totalCreditsEl = document.getElementById('totalCredits');

const transactionList = document.getElementById('transactionList');
const creditList = document.getElementById('creditList');

// Форматирование чисел в валюту
function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

// Сохранение в LocalStorage
function saveData() {
  localStorage.setItem('financeItems', JSON.stringify(items));
}

// Отрисовка данных и перерасчет
function updateUI() {
  // Вычисления
  const incomeTotal = items
    .filter(item => item.type === 'income')
    .reduce((acc, item) => acc + item.amount, 0);

  const expenseTotal = items
    .filter(item => item.type === 'expense')
    .reduce((acc, item) => acc + item.amount, 0);

  const creditTotal = items
    .filter(item => item.type === 'credit')
    .reduce((acc, item) => acc + item.amount, 0);

  // Общий баланс (Доходы минус Расходы и Кредиты)
  const balanceTotal = incomeTotal - expenseTotal - creditTotal;

  // Обновление общего баланса и показателей
  totalBalanceEl.textContent = formatCurrency(balanceTotal);
  totalIncomeEl.textContent = formatCurrency(incomeTotal);
  totalExpenseEl.textContent = formatCurrency(expenseTotal);
  totalCreditsEl.textContent = formatCurrency(creditTotal);

  // Очистка списков
  transactionList.innerHTML = '';
  creditList.innerHTML = '';

  const creditItems = items.filter(i => i.type === 'credit');
  const otherItems = items.filter(i => i.type !== 'credit');

  // Отрисовка обязательных платежей (Кредитов)
  if (creditItems.length === 0) {
    creditList.innerHTML = '<p class="empty-text">Нет активных кредитов или ипотек</p>';
  } else {
    creditItems.forEach(item => {
      creditList.appendChild(createItemElement(item));
    });
  }

  // Отрисовка обычных транзакций (Доходы/Расходы)
  if (otherItems.length === 0) {
    transactionList.innerHTML = '<p class="empty-text">Список транзакций пуст</p>';
  } else {
    otherItems.forEach(item => {
      transactionList.appendChild(createItemElement(item));
    });
  }
}

// Создание HTML-элемента для записи
function createItemElement(item) {
  const div = document.createElement('div');
  div.className = 'item-card';

  let iconClass = 'fa-arrow-down';
  let typeLabel = 'Доход';
  let sign = '+';

  if (item.type === 'expense') {
    iconClass = 'fa-arrow-up';
    typeLabel = 'Расход';
    sign = '-';
  } else if (item.type === 'credit') {
    iconClass = 'fa-building-columns';
    typeLabel = 'Кредит/Ипотека';
    sign = '-';
  }

  div.innerHTML = `
    <div class="item-info">
      <div class="item-icon ${item.type}">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div>
        <div class="item-title">${item.title}</div>
        <div class="item-type">${typeLabel}</div>
      </div>
    </div>
    <div class="item-right">
      <span class="item-amount ${item.type}">
        ${sign}${formatCurrency(item.amount)}
      </span>
      <button class="btn-delete" onclick="deleteItem(${item.id})">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;

  return div;
}

// Добавление новой записи
financeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newItem = {
    id: Date.now(),
    type: typeInput.value,
    title: titleInput.value.trim(),
    amount: parseFloat(amountInput.value)
  };

  if (!newItem.title || isNaN(newItem.amount)) return;

  items.unshift(newItem);
  saveData();
  updateUI();

  // Сброс полей формы
  titleInput.value = '';
  amountInput.value = '';
});

// Удаление записи
function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveData();
  updateUI();
}

// Первоначальный запуск
updateUI();
