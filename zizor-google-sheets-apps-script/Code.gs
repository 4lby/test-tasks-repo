/**
 * ============================================================
 * Тестовое задание: Система учета товаров и продаж
 * Кандидат: Александр Юшкевич
 * Вакансия: Ассистент программиста (Зизор), отклик на rabota.by
 * Дата: 2026-09-07
 *
 * Стек: Google Sheets + Google Apps Script
 * Весь код находится в файле Code.gs (этот файл).
 * Файл helper functions.gs НЕ изменялся и используется повторно:
 *   - findProductByArticle(article)  — поиск товара в базе
 *   - updateProductStock(article, qty) — списание остатка (+проверка)
 *   - parseDate(str)                 — строка "DD.MM.YYYY" -> Date
 *   - formatDate(date)               — Date -> "DD.MM.YYYY"
 *   - setCellColor(sheet,row,col,status) — заливка ячейки (success/error/warning)
 *   - getSalesSheet() / getProductsSheet() — доступ к листам
 *   - isNumeric(value)               — проверка числа
 * ============================================================
 */

// ------------------------------------------------------------
// Названия листов (совпадают с helper functions.gs)
// ------------------------------------------------------------
var SHEET_PRODUCTS = 'База товаров';
var SHEET_SALES = 'Журнал продаж';

// ------------------------------------------------------------
// Колонки листа "База товаров" (1-based)
// ------------------------------------------------------------
var COL_ARTICLE = 1;   // Артикул
var COL_NAME = 2;      // Название товара
var COL_CATEGORY = 3;  // Категория
var COL_PRICE = 4;     // Цена
var COL_STOCK = 5;     // Остаток
var COL_MIN_STOCK = 6; // Мин. остаток

// ------------------------------------------------------------
// Колонки листа "Журнал продаж" (1-based)
// ------------------------------------------------------------
var COL_DATE = 1;          // Дата
var COL_ARTICLE_SALE = 2;  // Артикул
var COL_QTY = 3;           // Количество
var COL_AMOUNT = 4;        // Сумма (автозаполнение)
var COL_STATUS = 5;        // Статус (автозаполнение)

// Статусы
var STATUS_OK = '\u2713 Выполнено';                  // ✓ Выполнено
var STATUS_NOT_ENOUGH = '\u2717 Недостаточно товара'; // ✗ Недостаточно товара
var STATUS_ARTICLE_NOT_FOUND = 'Артикул не найден';
var STATUS_INVALID = 'Ошибка данных';

// ------------------------------------------------------------
// ЗАДАЧА 5: Триггер onEdit(e)
// Срабатывает при любом редактировании. Если правка в листе
// "Журнал продаж" затрагивает Дату/Артикул/Количество — запускает
// расчёт суммы и проверку наличия (задачи 1 и 2).
// ------------------------------------------------------------
function onEdit(e) {
  if (!e) return;
  var range = e.range;
  var sheet = range.getSheet();

  // Работаем только с журналом продаж
  if (sheet.getName() !== SHEET_SALES) return;

  var row = range.getRow();
  var col = range.getColumn();

  // Игнорируем заголовок (строка 1) и любые правки вне колонок Дата/Артикул/Количество
  if (row <= 1) return;
  if (col > COL_QTY) return;

  processSaleRow_(row, sheet);
}

// ------------------------------------------------------------
// ЗАДАЧА 1 + ЗАДАЧА 2: обработка одной строки продажи
// 1) Находим товар по артикулу, считаем Сумма = Цена × Количество
// 2) Проверяем наличие: хватает -> "✓ Выполнено" и минус остаток;
//    не хватает -> "✗ Недостаточно товара"
// Использует готовые функции из helper functions.gs:
//   findProductByArticle, updateProductStock, isNumeric, setCellColor
// ------------------------------------------------------------
function processSaleRow_(row, sheet) {
  if (!sheet) sheet = getSalesSheet(); // helper
  if (!sheet) return;

  var articleCell = sheet.getRange(row, COL_ARTICLE_SALE);
  var qtyCell = sheet.getRange(row, COL_QTY);
  var amountCell = sheet.getRange(row, COL_AMOUNT);
  var statusCell = sheet.getRange(row, COL_STATUS);
  var dateCell = sheet.getRange(row, COL_DATE);

  var article = articleCell.getValue();
  var qty = qtyCell.getValue();
  var dateVal = dateCell.getValue();

  // Совсем пустая строка — ничего не делаем
  if (article === '' && qty === '' && dateVal === '') return;

  // --- Обработка ошибок (доп. требование ТЗ) ---
  // Пустой артикул
  if (article === '' || article === null) {
    statusCell.setValue(STATUS_INVALID);
    colorRow_(sheet, row, 'error'); // helper setCellColor по всей строке A:E
    return;
  }
  // Количество не число или не положительное (isNumeric из helper)
  if (!isNumeric(qty) || qty <= 0) {
    statusCell.setValue(STATUS_INVALID);
    colorRow_(sheet, row, 'error');
    return;
  }

  // Поиск товара через helper findProductByArticle
  var product = findProductByArticle(String(article).trim());
  if (!product) {
    statusCell.setValue(STATUS_ARTICLE_NOT_FOUND);
    colorRow_(sheet, row, 'error');
    return;
  }

  var price = Number(product.price);
  if (!isNumeric(price)) {
    statusCell.setValue(STATUS_INVALID);
    colorRow_(sheet, row, 'error');
    return;
  }

  // ЗАДАЧА 1: авторасчёт суммы (Цена × Количество)
  var amount = price * qty;
  amountCell.setValue(amount);

  // ЗАДАЧА 2: проверка наличия + списание через helper updateProductStock
  if (product.stock >= qty) {
    updateProductStock(String(article).trim(), qty); // helper: уменьшает остаток в базе
    statusCell.setValue(STATUS_OK);
    colorRow_(sheet, row, 'success'); // helper: зелёный по всей строке
  } else {
    statusCell.setValue(STATUS_NOT_ENOUGH);
    colorRow_(sheet, row, 'error'); // helper setCellColor по всей строке A:E: красный
  }
}

// ------------------------------------------------------------
// Вспомогательная: закрашивает ВСЮ строку продажи (A:E) через
// готовый setCellColor из helper функций (зелёный/красный).
// ТЗ Задача 5, п.3: "Форматирует ячейки (зеленый... красный...)".
// ------------------------------------------------------------
function colorRow_(sheet, row, status) {
  for (var c = COL_DATE; c <= COL_STATUS; c++) {
    setCellColor(sheet, row, c, status); // helper functions.gs
  }
}

// ------------------------------------------------------------
// ЗАДАЧА 3: checkLowStock()
// Находит товары, где Остаток <= Мин. остаток, выводит список
// в модальном окне (если доступен UI) и логирует в консоль.
// Использует getProductsSheet() из helper.
// ------------------------------------------------------------
function checkLowStock() {
  var products = getProductsSheet(); // helper
  if (!products) {
    Logger.log('Лист "' + SHEET_PRODUCTS + '" не найден');
    return [];
  }

  var lastRow = products.getLastRow();
  if (lastRow < 2) {
    Logger.log('База товаров пуста');
    return [];
  }

  var data = products.getRange(2, 1, lastRow - 1, COL_MIN_STOCK).getValues();
  var low = [];

  for (var i = 0; i < data.length; i++) {
    var article = String(data[i][COL_ARTICLE - 1]).trim();
    var name = data[i][COL_NAME - 1];
    var stock = Number(data[i][COL_STOCK - 1]);
    var minStock = Number(data[i][COL_MIN_STOCK - 1]);

    if (!article) continue; // пропускаем пустые строки

    if (stock <= minStock) {
      low.push(article + ' — ' + name + ': остаток ' + stock + ' (мин. ' + minStock + ')');
    }
  }

  // Логируем в консоль
  if (low.length === 0) {
    Logger.log('Все товары в достатке');
  } else {
    Logger.log('Низкий остаток:\n' + low.join('\n'));
  }

  // Модальное окно, если есть UI
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui && low.length > 0) {
      ui.alert('Низкий остаток (' + low.length + ')', low.join('\n'), ui.ButtonSet.OK);
    }
  } catch (err) {
    Logger.log('UI недоступен: ' + err.message);
  }

  return low; // удобно для вызова из других скриптов/тестов
}

// ------------------------------------------------------------
// ЗАДАЧА 4: getDailySales(date)
// Принимает дату в формате "DD.MM.YYYY".
// Возвращает объект: { total: сумма успешных продаж за день,
//                       count: количество успешных продаж }
// Использует getSalesSheet() из helper и parseDate_(ниже).
// ------------------------------------------------------------
function getDailySales(date) {
  var target = parseDate_(date);
  var sales = getSalesSheet(); // helper
  if (!sales) {
    Logger.log('Лист "' + SHEET_SALES + '" не найден');
    return { total: 0, count: 0 };
  }

  var lastRow = sales.getLastRow();
  if (lastRow < 2) return { total: 0, count: 0 };

  var data = sales.getRange(2, 1, lastRow - 1, COL_STATUS).getValues();
  var total = 0;
  var count = 0;

  for (var i = 0; i < data.length; i++) {
    var rowDate = data[i][COL_DATE - 1];
    var amount = Number(data[i][COL_AMOUNT - 1]) || 0;
    var status = String(data[i][COL_STATUS - 1]);

    // Считаем только статус "✓ Выполнено" и только за нужный день
    if (status === STATUS_OK && sameDay_(rowDate, target)) {
      total += amount;
      count++;
    }
  }

  Logger.log('Продажи за ' + date + ': сумма ' + total + ', успешных продаж ' + count);
  return { total: total, count: count };
}

// ------------------------------------------------------------
// Вспомогательная: парсинг даты в Date
// Поддерживает: объект Date, строку "DD.MM.YYYY" (через helper parseDate)
// и серийный номер дня Google Sheets (например, 45962 = 01.11.2025).
// ------------------------------------------------------------
function parseDate_(input) {
  if (input instanceof Date) return input;

  if (typeof input === 'number') {
    // Серийный номер дня Google Sheets
    return new Date(Math.round((input - 25569) * 86400000));
  }

  if (typeof input === 'string') {
    var d = parseDate(input); // helper functions.gs
    if (d) return d;
    throw new Error('Неверный формат даты, ожидается "DD.MM.YYYY"');
  }

  throw new Error('Неверный формат даты, ожидается "DD.MM.YYYY"');
}

// ------------------------------------------------------------
// Вспомогательная: сравнение двух дат по году/месяцу/дню
// ------------------------------------------------------------
function sameDay_(a, b) {
  var da = parseDate_(a);
  var db = parseDate_(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

// ------------------------------------------------------------
// БОНУС 1: экспорт статистики за месяц
// Формат вызова: getMonthlyStats("MM.YYYY"), например "09.2026".
// Возвращает { month, total, count, byDay: { "DD.MM.YYYY": сумма } }
// Использует getSalesSheet() и formatDate() из helper.
// ------------------------------------------------------------
function getMonthlyStats(month) {
  var m = month.match(/^(\d{2})\.(\d{4})$/);
  if (!m) throw new Error('Неверный формат месяца, ожидается "MM.YYYY"');
  var monthNum = Number(m[1]);
  var year = Number(m[2]);

  var sales = getSalesSheet(); // helper
  var lastRow = sales ? sales.getLastRow() : 1;
  if (!sales || lastRow < 2) return { month: month, total: 0, count: 0, byDay: {} };

  var data = sales.getRange(2, 1, lastRow - 1, COL_STATUS).getValues();
  var total = 0;
  var count = 0;
  var byDay = {};

  for (var i = 0; i < data.length; i++) {
    var rowDate = parseDate_(data[i][COL_DATE - 1]);
    if (rowDate.getMonth() + 1 !== monthNum || rowDate.getFullYear() !== year) continue;

    var amount = Number(data[i][COL_AMOUNT - 1]) || 0;
    var status = String(data[i][COL_STATUS - 1]);
    if (status !== STATUS_OK) continue;

    total += amount;
    count++;
    var key = formatDate(rowDate); // helper -> "DD.MM.YYYY"
    byDay[key] = (byDay[key] || 0) + amount;
  }

  Logger.log('Статистика за ' + month + ': сумма ' + total + ', продаж ' + count);
  return { month: month, total: total, count: count, byDay: byDay };
}

// ------------------------------------------------------------
// БОНУС 2: кнопка в интерфейсе Google таблицы (меню).
// Появляется при открытии таблицы (onOpen). Меню — только для
// удобного запуска проверки остатков и просмотра статистики;
// основная логика (задачи 1, 2, 5) работает автоматически через onEdit.
// ------------------------------------------------------------
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Тестовое задание')
    .addItem('Проверить низкие остатки', 'checkLowStock')
    .addItem('Статистика за день', 'askDailyStats')
    .addItem('Статистика за месяц', 'askMonthlyStats')
    .addToUi();
}

// Диалог для статистики за день (демонстрация работы getDailySales из меню)
function askDailyStats() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Статистика за день', 'Введите дату (ДД.ММ.ГГГГ):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var result = getDailySales(res.getResponseText().trim());
  ui.alert('Продажи за ' + res.getResponseText().trim() +
           '\nСумма: ' + result.total +
           '\nУспешных продаж: ' + result.count);
}

// Диалог для статистики за месяц
function askMonthlyStats() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Статистика за месяц', 'Введите месяц (ММ.ГГГГ):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var result = getMonthlyStats(res.getResponseText().trim());
  ui.alert('Статистика за ' + res.getResponseText().trim() +
           '\nСумма: ' + result.total +
           '\nПродаж: ' + result.count);
}

// ------------------------------------------------------------
// БОНУС 3: email-уведомление о низких остатках.
// Отправляет письмо на адрес владельца таблицы.
// ------------------------------------------------------------
function sendLowStockEmail() {
  var low = checkLowStock();
  if (low.length === 0) {
    Logger.log('Низких остатков нет, письмо не отправлено');
    return;
  }

  var email = Session.getActiveUser().getEmail();
  if (!email) {
    Logger.log('Не удалось получить email владельца, письмо не отправлено');
    return;
  }

  MailApp.sendEmail({
    to: email,
    subject: 'Низкий остаток товаров',
    body: 'Остаток товаров достиг минимального значения:\n\n' + low.join('\n')
  });
  Logger.log('Письмо отправлено на ' + email);
}

// ------------------------------------------------------------
// БОНУС 4: валидация данных при вводе (Data Validation).
// Запускать вручную (или в onOpen) один раз: ограничивает Артикул
// списком из базы и требует Количество >= 1.
// Использует getProductsSheet()/getSalesSheet() из helper.
// ------------------------------------------------------------
function setupValidations() {
  var products = getProductsSheet(); // helper
  var sales = getSalesSheet();       // helper
  if (!products || !sales) return;

  // Список артикулов для валидации в "Журнале продаж"
  var lastProd = products.getLastRow();
  var articles = [];
  if (lastProd >= 2) {
    articles = products.getRange(2, COL_ARTICLE, lastProd - 1).getValues()
      .map(function (r) { return String(r[0]).trim(); })
      .filter(function (a) { return a !== ''; });
  }

  if (articles.length > 0) {
    var ruleArticle = SpreadsheetApp.newDataValidation()
      .requireValueInList(articles, true)
      .setAllowInvalid(false)
      .build();
    var lastSale = Math.max(sales.getLastRow(), 2);
    sales.getRange(2, COL_ARTICLE_SALE, Math.max(lastSale - 1, 1), 1).setDataValidation(ruleArticle);

    // Количество: целое >= 1
    var ruleQty = SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(1)
      .setAllowInvalid(false)
      .build();
    sales.getRange(2, COL_QTY, Math.max(lastSale - 1, 1), 1).setDataValidation(ruleQty);
  }

  Logger.log('Валидация данных настроена');
}

// ------------------------------------------------------------
// Пересчёт всех строк журнала (полезно после ручного заполнения
// либо для "оживления" примеров из шаблона). Использует ту же
// логику processSaleRow_. Вызывается из редактора скриптов.
// ------------------------------------------------------------
function reprocessAllSales() {
  var sales = getSalesSheet(); // helper
  if (!sales) return;
  var lastRow = sales.getLastRow();
  for (var r = 2; r <= lastRow; r++) {
    processSaleRow_(r, sales);
  }
}
