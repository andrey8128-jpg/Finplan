// Загрузка сохраненных данных из LocalStorage при старте
let items = JSON.parse(localStorage.getItem('financeItems')) || [];

// Элементы формы и ввода
const financeForm = document.getElementById('financeForm');
const typeInput = document.getElementById('type');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');

// Элементы отображения итоговых сумм
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const totalCreditsEl = document.getElementById('totalCredits');

// Контейнеры для списков
const transactionList = document.getElementById('transactionList');
const creditList = document.getElementById('creditList');

// Форматирование чисел в рубли
function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

// Сохранение массива записей в память устройства (LocalStorage)
function saveData() {
  localStorage.setItem('financeItems', JSON.stringify(items));
}

// Полное обновление интерфейса и пересчёт сумм
function updateUI() {
  // Подсчёт доходов
  const incomeTotal = items
    .filter(item => item.type === 'income')
    .reduce((acc, item) => acc + item.amount, 0);

  // Подсчёт обычных расходов
  const expenseTotal = items
    .filter(item => item.type === 'expense')
    .reduce((acc, item) => acc + item.amount, 0);

  // Подсчёт обязательных платежей (Кредиты и Ипотека)
  const creditTotal = items
    .filter(item => item.type === 'credit')
    .reduce((acc, item) => acc + item.amount, 0);

  // Общий оставшийся баланс: Доходы - Расходы - Кредиты
  const balanceTotal = incomeTotal - expenseTotal - creditTotal;

  // Вывод показателей на экран
  totalBalanceEl.textContent = formatCurrency(balanceTotal);
  totalIncomeEl.textContent = formatCurrency(incomeTotal);
  totalExpenseEl.textContent = formatCurrency(expenseTotal);
  totalCreditsEl.textContent = formatCurrency(creditTotal);

  // Очищаем списки перед новой отрисовкой
  transactionList.innerHTML = '';
  creditList.innerHTML = '';

  // Разделяем записи по типам
  const creditItems = items.filter(i => i.type === 'credit');
  const otherItems = items.filter(i => i.type !== 'credit');

  // Отрисовка списка кредитов и ипотек
  if (creditItems.length === 0) {
    creditList.innerHTML = '<p class="empty-text">Нет активных кредитов или ипотек</p>';
  } else {
    creditItems.forEach(item => {
      creditList.appendChild(createItemElement(item));
    });
  }

  // Отрисовка списка остальных операций (доходы/расходы)
  if (otherItems.length === 0) {
    transactionList.innerHTML = '<p class="empty-text">Список транзакций пуст</p>';
  } else {
    otherItems.forEach(item => {
      transactionList.appendChild(createItemElement(item));
    });
  }
}

// Создание HTML-карточки для конкретной записи
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
      <button class="btn-delete" onclick="deleteItem(${item.id})" title="Удалить">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;

  return div;
}

// Обработчик отправки формы (добавление новой записи)
financeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newItem = {
    id: Date.now(), // Уникальный ID на основе времени
    type: typeInput.value,
    title: titleInput.value.trim(),
    amount: parseFloat(amountInput.value)
  };

  if (!newItem.title || isNaN(newItem.amount) || newItem.amount <= 0) return;

  // Добавляем запись в начало массива
  items.unshift(newItem);

  // Сохраняем в память устройства и обновляем UI
  saveData();
  updateUI();

  // Сброс полей ввода
  titleInput.value = '';
  amountInput.value = '';
});

// Функция удаления записи по ID
function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveData();
  updateUI();
}

// Инициализация интерфейса при первой загрузке страницы
updateUI();

// Регистрация Service Worker для возможности работы приложения без интернета
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker успешно зарегистрирован:', reg.scope))
      .catch(err => console.log('Ошибка регистрации Service Worker:', err));
  });
}
