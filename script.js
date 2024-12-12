if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

function formatMinutes(minutes) {
    // Если minutes не число, возвращаем пустую строку
    if (typeof minutes !== 'number' || minutes < 0) {
        return '-';
    }

    const hours = Math.floor(minutes / 60); // Вычисляем количество часов
    const remainingMinutes = minutes % 60; // Остаток - это минуты
    if (hours > 0) {
        return `${hours} ч ${remainingMinutes} мин`;
    } else {
        return `${remainingMinutes} мин`;
    }
}


function renderRecommendations() {
    const recommendationsBox = document.getElementById("recommendations-box");
    const indicatorPointer = document.getElementById("indicator-pointer");
    const indicatorStatus = document.getElementById("indicator-status");

    const mealRecShort = localStorage.getItem("mealRecShort") || '...';
    const mealRecBrief = localStorage.getItem("mealRecBrief") || '...';
    const mealRecRateNumber = localStorage.getItem("mealRecRateNumber") || 0;
    const mealRecRateText = localStorage.getItem("mealRecRateText") || '...';

    recommendationsBox.textContent = mealRecShort;
    indicatorPointer.style.left = `${mealRecRateNumber}%`;
    indicatorStatus.textContent = mealRecRateText;
}


  // Функция рендера истории с фильтрацией
  function renderMealHistory(filter = "") {
    const historyContainer = document.querySelector(".history");
    historyContainer.innerHTML = "";

    let records = JSON.parse(localStorage.getItem("mealRecords")) || [];

    // Фильтрация по имени (регистронезависимый поиск)
    if (filter.trim() !== "") {
      const lowerFilter = filter.toLowerCase();
      records = records.filter(r => (r.name && r.name.toLowerCase().includes(lowerFilter)));
    }

    if (records.length === 0) {
      historyContainer.innerHTML = "<p>Пока нет записей</p>";
      return;
    }

    records.sort((a, b) => b.timestamp - a.timestamp);

    const grouped = {};
    records.forEach(record => {
      const dateObj = new Date(record.timestamp * 1000);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dateStr = dateObj.toLocaleDateString('ru-RU', options);

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(record);
    });

    const now = new Date();
    const todayStr = now.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

    for (const dateStr in grouped) {
      const daySection = document.createElement("div");
      daySection.classList.add("day-section");

      let headerText = dateStr;
      if (dateStr === todayStr) {
        headerText = "Сегодня, " + dateStr;
      } else if (dateStr === yesterdayStr) {
        headerText = "Вчера, " + dateStr;
      }

      const dayHeader = document.createElement("div");
      dayHeader.classList.add("day-header");
      dayHeader.textContent = headerText;
      daySection.appendChild(dayHeader);

      grouped[dateStr].sort((a, b) => b.timestamp - a.timestamp);

      grouped[dateStr].forEach(record => {
        const mealItem = document.createElement("div");
        mealItem.classList.add("meal-item");
        mealItem.dataset.timestamp = record.timestamp; // Сохраняем timestamp для идентификации

        const mealInfo = document.createElement("div");
        mealInfo.classList.add("meal-info");

        const timeStr = new Date(record.timestamp * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        let mealName = document.createElement("div");
        mealName.classList.add("meal-name");

        let mealDetails = document.createElement("div");
        mealDetails.classList.add("meal-details");

        const recordType = record.type || "meal";
        if (recordType === "sport") {
          mealName.textContent = record.name || "Занятие спортом";
          const kcalValue = record.kcal ? `<i class="fa-solid fa-fire"></i> ${record.kcal} ккал` : `<i class="fa-solid fa-fire"></i> — ккал`;
          mealDetails.innerHTML = `${kcalValue}`;
          const mealScore = document.createElement("div");
          mealScore.classList.add("meal-score");
          mealScore.textContent = "";
          mealInfo.appendChild(mealName);
          mealInfo.appendChild(mealDetails);
          mealItem.appendChild(mealInfo);
          mealItem.appendChild(mealScore);
        } else {
          mealName.textContent = record.name || "Приём пищи";
          const kcalValue = record.kcal ? `<i class="fa-solid fa-utensils"></i> ${record.kcal} ккал` : `<i class="fa-solid fa-utensils"></i> — ккал`;
          let pfcStr = "";
          if (record.structure && record.structure.proteins !== undefined && record.structure.fats !== undefined && record.structure.carbohydrates !== undefined) {
            pfcStr = ` | p ${record.structure.proteins} г | f ${record.structure.fats} г | c ${record.structure.carbohydrates} г`;
          }
          mealDetails.innerHTML = `${kcalValue}${pfcStr}`;
          const mealScore = document.createElement("div");
          mealScore.classList.add("meal-score");
          mealScore.textContent = record.rate !== null ? formatToOneDecimalPlace(record.rate) : "—";
          mealInfo.appendChild(mealName);
          mealInfo.appendChild(mealDetails);
          mealItem.appendChild(mealInfo);
          mealItem.appendChild(mealScore);
        }

        daySection.appendChild(mealItem);
      });

      historyContainer.appendChild(daySection);
    }

    // Добавляем обработчик на клик по meal-item для детализации
    historyContainer.querySelectorAll(".meal-item").forEach(item => {
      item.addEventListener("click", () => {
        const timestamp = parseInt(item.dataset.timestamp, 10);
        const records = JSON.parse(localStorage.getItem("mealRecords")) || [];
        const record = records.find(r => r.timestamp === timestamp);
        if (!record) return;

        let recordType = record.type || "meal";
        let title = recordType === "sport" ? "Информация о тренировке" : "Информация о приёме пищи";

        // Форматируем текущую дату и время для input
        const dateObj = new Date(record.timestamp * 1000);
        // Получаем компоненты локальной даты и времени
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        // Формируем строку в формате YYYY-MM-DDTHH:MM
        const localDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;

        const durationText = record.duration ? '<div class="detail-line"><b>Длительность:</b> ' + formatMinutes(record.duration) + '</div>' : '';

        let detailsHTML = `
          <div class="modal-detail">
            <h3>${title}</h3>
            <div class="detail-line"><b>Название:</b> ${record.name || (recordType==="sport"?"Занятие спортом":"—")}</div>
            <div class="detail-line"><b>Дата и время:</b> <input type="datetime-local" id="edit-datetime" value="${localDatetime}"></div>
            ${durationText}
            <div class="detail-line"><b>Ккал:</b> ${record.kcal || "—"}</div>
        `;

        if (recordType !== "sport") {
          detailsHTML += `<div class="detail-line"><b>Белки:</b> ${record.structure.proteins} г | <b>Жиры:</b> ${record.structure.fats} г | <b>Углеводы:</b> ${record.structure.carbohydrates} г</div>`;
          detailsHTML += `<div class="detail-line"><b>Оценка:</b> ${record.rate!==null?record.rate:"—"}</div>`;
        }

        detailsHTML += `</div>`;

        // Внутри функции, которая отображает модальное окно с деталями
        showModal(
          detailsHTML,
          `
          <div class="modal-actions-top">
            <button class="modal-button" id="save-detail">Сохранить</button>
            <button class="modal-button" id="delete-detail">Удалить</button>
            <button class="modal-button" id="duplicate-detail">Дублировать</button>
            <button class="modal-button cancel" id="cancel-detail">Отмена</button>
          </div>
          `
        );

        // Закрытие модалки
        document.getElementById("cancel-detail").addEventListener("click", closeModal);

        // Удаление записи
        document.getElementById("delete-detail").addEventListener("click", () => {
          const updatedRecords = records.filter(r => r.timestamp !== timestamp);
          localStorage.setItem("mealRecords", JSON.stringify(updatedRecords));
          closeModal();
          renderMealHistory();
        });

        // Дублирование записи
        document.getElementById("duplicate-detail").addEventListener("click", () => {
          const duplicatedRecord = {
            ...record,
            timestamp: Math.floor(Date.now() / 1000) // Новый timestamp
          };
          const updatedRecords = [...records, duplicatedRecord];
          localStorage.setItem("mealRecords", JSON.stringify(updatedRecords));
          closeModal();
          renderMealHistory();
        });

        // Сохранение измененной даты и времени
        document.getElementById("save-detail").addEventListener("click", () => {
          const newDatetimeInput = document.getElementById("edit-datetime").value;
          if (!newDatetimeInput) {
            alert("Пожалуйста, укажите дату и время.");
            return;
          }

          const newTimestamp = Math.floor(new Date(newDatetimeInput).getTime() / 1000);
          if (isNaN(newTimestamp)) {
            alert("Некорректная дата и время.");
            return;
          }

          // Проверяем, не пересекается ли новый timestamp с существующими
          if (records.some(r => r.timestamp === newTimestamp && r !== record)) {
            alert("Другая запись уже использует эту дату и время. Пожалуйста, выберите другое время.");
            return;
          }

          // Обновляем запись
          record.timestamp = newTimestamp;
          localStorage.setItem("mealRecords", JSON.stringify(records));
          closeModal();
          renderMealHistory();
        });
      });
    });
  }


// Отключаем зумирование жестами
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

document.addEventListener('gesturechange', function (e) {
  e.preventDefault();
});

document.addEventListener('gestureend', function (e) {
  e.preventDefault();
});


// Загружаем текст из prompt_....txt в переменные
let prompt_1 = null;
fetch('assets/prompt_1.txt')
 .then(response => response.text())
 .then(text => {
    prompt_1 = text;
  })
 .catch(error => {
    console.error('Error fetching prompt_1.txt:', error);
  });

let prompt_2 = null;
fetch('assets/prompt_2.txt')
 .then(response => response.text())
 .then(text => {
    prompt_2 = text;
  })
 .catch(error => {
    console.error('Error fetching prompt_2.txt:', error);
  });

let prompt_3 = null;
fetch('assets/prompt_3.txt')
 .then(response => response.text())
 .then(text => {
    prompt_3 = text;
  })
 .catch(error => {
    console.error('Error fetching prompt_3.txt:', error);
  });

function getPassword() {
    // Получаем пароль из localStorage
    return localStorage.getItem('mealGuidePassword');
}

function savePassword(newPassword) {
    // Сохраняем новый пароль в localStorage
    localStorage.setItem('mealGuidePassword', newPassword);
}

function formatToOneDecimalPlace(number) {
    if (number === undefined) {
        return number;
    }
    return number.toFixed(1); // Возвращаем строку, чтобы сохранить ".0"
}

document.addEventListener('DOMContentLoaded', function() {
    // Если пароль не сохранен, то требуем ввести его.
    if (!getPassword()) {
        // Запрашиваем пароль через окно
        const passwordInput = prompt('Введите пароль для запрета выключения приложения:', '');
        if (passwordInput) {
            // Сохраняем пароль
            savePassword(passwordInput);
            // Обновляем страницу
            location.reload();
        } else {
            // Если пароль не введен, то выходим из приложения
            alert('Пароль не введен!');
            window.close();
        }
    }
});

function formatTimestampToDate(timestamp_sec) {
  // Создаём объект Date из timestamp_sec (умножаем на 1000, чтобы перевести секунды в миллисекунды)
  const date = new Date(timestamp_sec * 1000);

  // Извлекаем день, месяц и год
  const day = String(date.getDate()).padStart(2, '0'); // Добавляем ведущий ноль, если нужно
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0, поэтому добавляем 1
  const year = date.getFullYear();

  // Формируем строку в формате dd.mm.yyyy
  return `${day}.${month}.${year}`;
}

function getMealRecords(){
    // Получаем массив записей из localStorage
    const records = JSON.parse(localStorage.getItem("mealRecords")) || [];

    // Сортируем записи по дате в обратном порядке (новые вверху)
    records.sort((a, b) => b.timestamp - a.timestamp);

    return records;
}

const modalOverlay = document.getElementById("modal-overlay");
const modalBody = document.getElementById("modal-body");
const modalActions = document.getElementById("modal-actions");


function showModal(contentHTML, actionsHTML) {
    modalBody.innerHTML = contentHTML;
    modalActions.innerHTML = actionsHTML || "";
    modalOverlay.style.display = "flex";
}

function closeModal() {
    modalOverlay.style.display = "none";
    modalBody.innerHTML = "";
    modalActions.innerHTML = "";
}


document.addEventListener("DOMContentLoaded", function () {
  const addButton = document.getElementById("add-meal-button");
  const textarea = document.querySelector(".add-form textarea");
  const historyContainer = document.querySelector(".history");

  const modalOverlay = document.getElementById("modal-overlay");
  const modalBody = document.getElementById("modal-body");
  const modalActions = document.getElementById("modal-actions");

  const searchButton = document.getElementById("search-button");
  let searchInput = null; // Ссылка на поле ввода поиска
  let searchVisible = false; // Отслеживаем, показано ли поле поиска
  let searchQuery = ""; // Текущая строка поиска

  addButton.addEventListener("click", function () {
    const mealName = textarea.value.trim();

    if (!mealName) {
      alert("Введите название еды!");
      return;
    }

    showModal(
      `<p>Вы уверены, что хотите добавить: <b>${mealName}</b>?</p>`,
      `<button class="modal-button cancel" id="cancel-button">Отмена</button>
       <button class="modal-button" id="confirm-button">Добавить</button>`
    );

    document.getElementById("cancel-button").addEventListener("click", closeModal);

    document.getElementById("confirm-button").addEventListener("click", function() {
      // Показываем загрузку
      showModal(
        `<div class="modal-loading">
          <div class="modal-loading-spinner"></div>
          <div>Загрузка...</div>
        </div>`, ``
      );

      const requestData = {
        "password": getPassword(),
        "prompt": prompt_1,
        "text": mealName
      };

      fetch('https://myapihelper.na4u.ru/meal_guide/api.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestData)
      })
      .then(response => response.json())
      .then(data => {
        const content = data.choices[0].message.content
                         .replace('```json', '')
                         .replace('```', '');
        let fixedContent = content.replace(/'/g, '"');

        let parsed;
        try {
          parsed = JSON.parse(fixedContent);
        } catch(e) {
          showModal(`<p>Ошибка в формате ответа от сервера</p>`, `<button class="modal-button" onclick="location.reload()">Ок</button>`);
          return;
        }

        if(parsed.status === false) {
          showModal(
            `<p><b>Ошибка:</b> ${parsed.comment}</p>`,
            `<button class="modal-button" onclick="location.reload()">Ок</button>`
          );
        } else {
          // Создаём запись
          const newRecord = {
            name: parsed.name,
            timestamp: Math.floor(Date.now() / 1000),
            rate: parsed.rate,
            structure: {
              proteins: parsed.proteins,
              fats: parsed.fats,
              carbohydrates: parsed.carbohydrates
            },
            kcal: parsed.kcal,
            type: "meal" // Добавляем тип записи
          };

          const existingRecords = JSON.parse(localStorage.getItem("mealRecords")) || [];
          existingRecords.push(newRecord);
          localStorage.setItem("mealRecords", JSON.stringify(existingRecords));
          textarea.value = "";

          // Стильный успех
          showModal(
            `<div class="modal-success">
               <h3>Успешно добавлено!</h3>
               <div class="meal-info-block"><b>${parsed.name}</b></div>
               <div class="meal-info-block">Ккал: ${parsed.kcal}</div>
               <div class="meal-info-block">Б: ${parsed.proteins} г | Ж: ${parsed.fats} г | У: ${parsed.carbohydrates} г</div>
               <div class="meal-info-block">Оценка полезности: ${parsed.rate}</div>
             </div>`,
            `<button class="modal-button" id="ok-success">Ок</button>`
          );

          document.getElementById("ok-success").addEventListener("click", function(){
            closeModal();
            renderMealHistory();
          });
        }
      })
      .catch(err => {
        showModal(`<p>Ошибка при запросе: ${err.message}</p>`, `<button class="modal-button" onclick="location.reload()">Ок</button>`);
      });
    });
  });

  // Обработчик на кнопку поиска
  searchButton.addEventListener("click", function () {
    searchVisible = !searchVisible;

    // Находим контейнер кнопок
    const buttonsRow = document.querySelector(".buttons-row");

    // Если нужно показать поле поиска
    if (searchVisible) {
      // Создаем поле, если его нет
    if (!searchInput) {
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Поиск по названию...";
      searchInput.classList.add("search-input"); // Добавляем класс вместо инлайн-стилей

      // Добавляем обработчик ввода
      searchInput.addEventListener("input", function () {
        searchQuery = searchInput.value;
        renderMealHistory(searchQuery);
      });
    }

      // Добавляем поле ввода под кнопками
      buttonsRow.insertAdjacentElement("afterend", searchInput);
      searchInput.focus();
    } else {
      // Удаляем поле поиска
      if (searchInput && searchInput.parentNode) {
        searchInput.value = "";
        searchQuery = "";
        searchInput.parentNode.removeChild(searchInput);
      }
      // Обновляем историю без фильтра
      renderMealHistory();
    }
  });

  renderMealHistory();
  renderRecommendations();
});

// script.js

document.addEventListener("DOMContentLoaded", function () {
  let touchStartY = 0;
  let touchEndY = 0;
  const swipeThreshold = 50; // Минимальное расстояние для распознавания свайпа вниз (в пикселях)
  let refreshButtonVisible = false;
  let hideButtonTimeout = null;

  // Создаем кнопку обновления
  const refreshButton = document.createElement('button');
  refreshButton.classList.add('refresh-button');
  refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>'; // Иконка обновления из Font Awesome
  document.body.appendChild(refreshButton);

  // Функция для отображения кнопки обновления
  function showRefreshButton() {
    if (refreshButtonVisible) return; // Если кнопка уже видна, ничего не делаем

    refreshButton.classList.add('show');
    refreshButtonVisible = true;

    // Устанавливаем таймер на скрытие кнопки через 3 секунды
    hideButtonTimeout = setTimeout(() => {
      hideRefreshButton();
    }, 3000);
  }

  // Функция для скрытия кнопки обновления
  function hideRefreshButton() {
    refreshButton.classList.remove('show');
    refreshButtonVisible = false;
    if (hideButtonTimeout) {
      clearTimeout(hideButtonTimeout);
      hideButtonTimeout = null;
    }
  }

  // Обработчик клика на кнопку обновления
  refreshButton.addEventListener('click', function () {
    location.reload(); // Перезагружаем страницу
  });

  // Обработчики касаний для обнаружения свайпа вниз
  document.addEventListener('touchstart', function (e) {
    // Игнорируем свайпы внутри элемента с классом "history"
    if (e.target.closest('.history')) return;

    if (e.touches.length > 1) return; // Игнорируем многократные касания

    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    // Игнорируем свайпы внутри элемента с классом "history"
    if (e.target.closest('.history')) return;

    touchEndY = e.changedTouches[0].clientY;
    handleGesture();
  }, { passive: true });

  function handleGesture() {
    if (touchEndY - touchStartY > swipeThreshold) {
      showRefreshButton();
    }
  }

  // Предотвращаем появление кнопки, если она уже видна
  refreshButton.addEventListener('transitionend', function () {
    if (!refreshButton.classList.contains('show')) {
      refreshButton.style.display = 'none';
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
    const clipButton = document.getElementById("clip-button");
    const imageInput = document.getElementById("imageInput");

    const modalOverlay = document.getElementById("modal-overlay");
    const modalBody = document.getElementById("modal-body");
    const modalActions = document.getElementById("modal-actions");

    // URL и пароль для API (аналоги из вашего кода)
    const imageApiUrl = "https://myapihelper.na4u.ru/meal_guide/picture_meal_recognize.php";
    const password = "meal-guide-password-0d29313s2hf";

    function showModal(contentHTML, actionsHTML) {
        modalBody.innerHTML = contentHTML;
        modalActions.innerHTML = actionsHTML || "";
        modalOverlay.style.display = "flex";
    }

    function closeModal() {
        modalOverlay.style.display = "none";
        modalBody.innerHTML = "";
        modalActions.innerHTML = "";
    }

    // Обработчик нажатия на кнопку-скрепку
    clipButton.addEventListener("click", function() {
        // Программно нажимаем на скрытый input
        imageInput.click();
    });

    imageInput.addEventListener('change', function() {
        const file = imageInput.files[0];
        if (!file) return;

        // Спрашиваем подтверждение перед отправкой, например
        showModal(
          `<p>Отправить выбранное изображение для анализа?</p>`,
          `<button class="modal-button" id="confirm-image-button">Отправить</button>
           <button class="modal-button cancel" id="cancel-image-button">Отмена</button>`
        );

        document.getElementById("cancel-image-button").addEventListener("click", function() {
            closeModal();
            imageInput.value = ""; // Сброс выбора
        });

        document.getElementById("confirm-image-button").addEventListener("click", function() {
            // Показываем экран загрузки
            showModal(
              `<div class="modal-loading">
                <div class="modal-loading-spinner"></div>
                <div>Загрузка...</div>
              </div>`, ``
            );

            // Читаем файл в base64
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result.split(',')[1];

                // Формируем payload для запроса
                const requestData = {
                    "password": password,
                    "prompt": prompt_2,
                    "image": base64Image
                };

                fetch(imageApiUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(requestData)
                })
                .then(response => response.json())
                .then(data => {
                    const content = data.choices[0].message.content
                         .replace('```json', '')
                         .replace('```', '');
                    let fixedContent = content.replace(/'/g, '"');

                    let parsed;
                    try {
                      parsed = JSON.parse(fixedContent);
                    } catch(e) {
                      showModal(`<p>Ошибка в формате ответа от сервера</p>`, `<button class="modal-button" onclick="location.reload()">Ок</button>`);
                      return;
                    }

                    if (parsed.status === false) {
                        // Значит не является пищей
                        showModal(
                            `<p><b>Ошибка:</b> ${parsed.comment}</p>`,
                            `<button class="modal-button" onclick="location.reload()">Ок</button>`
                        );
                        return;
                    }

                    // Если всё нормально
                    console.log(parsed);

                    // Создаём новую запись
                    const newRecord = {
                        name: parsed.name,
                        timestamp: Math.floor(Date.now() / 1000),
                        rate: parsed.rate,
                        structure: {
                          proteins: parsed.proteins,
                          fats: parsed.fats,
                          carbohydrates: parsed.carbohydrates
                        },
                        kcal: parsed.kcal,
                        type: "meal" // Добавляем тип записи
                    };

                    const existingRecords = JSON.parse(localStorage.getItem("mealRecords")) || [];
                    existingRecords.push(newRecord);
                    localStorage.setItem("mealRecords", JSON.stringify(existingRecords));

                    // Очищаем input
                    imageInput.value = "";

                    // Показываем успех
                    showModal(
                      `<div class="modal-success">
                         <h3>Успешно добавлено!</h3>
                         <div class="meal-info-block"><b>${parsed.name}</b></div>
                         <div class="meal-info-block">Ккал: ${parsed.kcal}</div>
                         <div class="meal-info-block">Б: ${parsed.proteins} г | Ж: ${parsed.fats} г | У: ${parsed.carbohydrates} г</div>
                         <div class="meal-info-block">Оценка полезности: ${parsed.rate}</div>
                       </div>`,
                      `<button class="modal-button" id="ok-image-success">Ок</button>`
                    );

                    document.getElementById("ok-image-success").addEventListener("click", function(){
                        closeModal();
                        renderMealHistory(); // Предполагается, что renderMealHistory доступна глобально
                    });

                })
                .catch(err => {
                    showModal(`<p>Ошибка при запросе: ${err.message}</p>`, `<button class="modal-button" onclick="location.reload()">Ок</button>`);
                });
            };

            reader.readAsDataURL(file);
        });
    });
});


// Функция парсинга тренировки, аналогичная Python-коду
function parseWorkout(text) {
    // Регулярные выражения
    const workoutInfoPattern = /^(.*?)\n(\d{1,2} \w+ \d{4} at \d{2}:\d{2})\n\s*Duration:\s*(.*?)\n\s*Volume:\s*(.*?)\n\s*Calories:\s*(.*?)\n\s*Exercises:\s*(\d+)/m;

    const workoutInfoMatch = workoutInfoPattern.exec(text);
    if (!workoutInfoMatch) {
        throw new Error("Неверный формат тренировки");
    }

    const name = workoutInfoMatch[1].trim();
    const dateStr = workoutInfoMatch[2].trim();
    const durationText = workoutInfoMatch[3].trim();
    const volume = workoutInfoMatch[4].trim();
    const caloriesText = workoutInfoMatch[5].trim();
    const exercisesCount = parseInt(workoutInfoMatch[6], 10);

    // Вычисляем длительность в минутах
    let durationMinutes = 0;
    const hoursMatch = /(\d+)h/.exec(durationText);
    const minutesMatch = /(\d+)m/.exec(durationText);
    if (hoursMatch) {
        durationMinutes += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minutesMatch) {
        durationMinutes += parseInt(minutesMatch[1], 10);
    }

    const kcal = parseInt(caloriesText.split(" ")[0], 10);

    const workout = {
        name,
        date: dateStr,
        duration: durationMinutes,
        volume,
        kcal,
        exercises_count: exercisesCount,
        exercises: []
    };

    // Парсим упражнения
    const exercisesPattern = /(.*?)\n((?:Set \d+: \d+ Reps x [\dBW]+(?: Kg)?\n?)+)/gm;
    let exerciseMatch;
    while ((exerciseMatch = exercisesPattern.exec(text)) !== null) {
        const exerciseName = exerciseMatch[1].trim();
        const setsText = exerciseMatch[2].trim();

        const setsPattern = /Set (\d+): (\d+) Reps x ([\dBW]+(?: Kg)?)/g;
        let setMatch;
        const sets = [];
        while ((setMatch = setsPattern.exec(setsText)) !== null) {
            sets.push({
                set_number: parseInt(setMatch[1], 10),
                reps: parseInt(setMatch[2], 10),
                weight: setMatch[3]
            });
        }

        workout.exercises.push({
            name: exerciseName,
            sets: sets
        });
    }

    return workout;
}


document.addEventListener("DOMContentLoaded", function () {
    const addSportButton = document.getElementById("add-sport-button");

    addSportButton.addEventListener("click", async function () {
        // Читаем из буфера обмена
        let text = "";
        try {
            text = await navigator.clipboard.readText();
        } catch (e) {
            showModal(
                `<p>Не удалось прочитать буфер обмена. Разрешите доступ к буферу или скопируйте текст еще раз.</p>`,
                `<button class="modal-button" onclick="closeModal()">Ок</button>`
            );
            return;
        }

        if (!text.trim()) {
            showModal(
                `<p>Буфер обмена пуст или не содержит текст.</p>`,
                `<button class="modal-button" onclick="closeModal()">Ок</button>`
            );
            return;
        }

        // Пытаемся распарсить тренировку
        let workout;
        try {
            workout = parseWorkout(text);
        } catch (err) {
            showModal(
                `<p><b>Ошибка:</b> ${err.message}</p>`,
                `<button class="modal-button" onclick="closeModal()">Ок</button>`
            );
            return;
        }

        // Формируем HTML для отображения тренировки
        let exercisesHTML = "";
        for (const ex of workout.exercises) {
            exercisesHTML += `<div style="margin-bottom:10px;"><b>${ex.name}</b><br>`;
            for (const s of ex.sets) {
                exercisesHTML += `Set ${s.set_number}: ${s.reps} Reps x ${s.weight}<br>`;
            }
            exercisesHTML += `</div>`;
        }

        const workoutHTML = `
            <div class="modal-detail">
                <h3>Информация о тренировке</h3>
                <div class="detail-line"><b>Название:</b> ${workout.name}</div>
                <div class="detail-line"><b>Дата:</b> ${workout.date}</div>
                <div class="detail-line"><b>Длительность:</b> ${formatMinutes(workout.duration)}</div>
                <div class="detail-line"><b>Объем:</b> ${workout.volume}</div>
                <div class="detail-line"><b>Ккал:</b> ${workout.kcal}</div>
                <div class="detail-line"><b>Упражнений:</b> ${workout.exercises_count}</div>
                <div class="exercises-list">
                    ${exercisesHTML}
                </div>
            </div>
        `;

        showModal(
            workoutHTML,
            `
            <button class="modal-button" id="save-workout-button">Сохранить</button>
            <button class="modal-button cancel" id="cancel-workout-button">Отмена</button>
            `
        );

        document.getElementById("cancel-workout-button").addEventListener("click", closeModal);

        document.getElementById("save-workout-button").addEventListener("click", function() {
            // Сохраняем только time и type
            let newRecord = {
                timestamp: Math.floor(Date.now() / 1000),
                type: "sport"
            };
            const mergedRecord = {
              ...newRecord,
              ...workout
            };

            const existingRecords = JSON.parse(localStorage.getItem("mealRecords")) || [];
            existingRecords.push(mergedRecord);
            localStorage.setItem("mealRecords", JSON.stringify(existingRecords));

            closeModal();
            renderMealHistory();
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
         const openAiHelpButton = document.getElementById("open-ai-help");

         openAiHelpButton.addEventListener("click", function () {
            showModal(
               `<p>Запросить новые рекомендации у ИИ?</p>`,
               `<button class="modal-button" id="ai-yes-button">Да</button>
             <button class="modal-button cancel" id="ai-no-button">Нет</button>`
            );

            document.getElementById("ai-no-button").addEventListener("click", closeModal);

            document.getElementById("ai-yes-button").addEventListener("click", function () {
               // Формируем текст отчета
               const reportText = generateReportForLast60Days();
               // Показываем загрузку
               showModal(
                  `<div class="modal-loading">
                    <div class="modal-loading-spinner"></div>
                    <div>Загрузка...</div>
                </div>`, ``
               );

               const requestData = {
                  "password": getPassword(),
                  "prompt": prompt_3,
                  "text": reportText
               };

               fetch('https://myapihelper.na4u.ru/meal_guide/api.php', {
                     method: 'POST',
                     headers: {
                        'Content-Type': 'application/json'
                     },
                     body: JSON.stringify(requestData)
                  })
                  .then(response => response.json())
                  .then(data => {
                     const content = data.choices[0].message.content
                        .replace('```json', '')
                        .replace('```', '');
                     let fixedContent = content.replace(/'/g, '"');

                     let parsed;
                     try {
                        parsed = JSON.parse(fixedContent);
                     } catch (e) {
                        showModal(`<p>Ошибка в формате ответа от сервера</p>`, `<button class="modal-button" onclick="location.reload()">Ок</button>`);
                        return;
                     }

                     if (parsed.status === false) {
                        showModal(
                           `<p><b>Ошибка:</b> ${parsed.comment}</p>`,
                           `<button class="modal-button" onclick="location.reload()">Ок</button>`
                        );
                     } else {
                        // short brief rate.number rate.text
                        localStorage.setItem("mealRecShort", parsed.short);
                        localStorage.setItem("mealRecBrief", parsed.brief);
                        localStorage.setItem("mealRecRateNumber", parsed.rate.number);
                        localStorage.setItem("mealRecRateText", parsed.rate.text);

                        showModal(
                           `<div class="modal-success">
                                <h2>Рекомендации обновлены</h2>
                            </div>`,
                           `<button class="modal-button" id="ok-success">Ок</button>`
                        );

                        renderRecommendations();

                     }

                  });
            });
         });
});

function generateReportForLast60Days() {
    const allRecords = JSON.parse(localStorage.getItem("mealRecords")) || [];
    const now = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    // Фильтруем записи за последние 60 дней
    const filteredRecords = allRecords.filter(record => {
        const recordDate = new Date(record.timestamp * 1000);
        return recordDate >= sixtyDaysAgo && recordDate <= now;
    });

    // Группируем записи по дате (dd.mm.yyyy)
    const grouped = {};
    filteredRecords.forEach(record => {
        const dateStr = formatTimestampToDate(record.timestamp);
        if (!grouped[dateStr]) {
            grouped[dateStr] = [];
        }
        grouped[dateStr].push(record);
    });

    // Сортируем даты по убыванию
    const sortedDates = Object.keys(grouped).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('.').map(Number);
        const [dayB, monthB, yearB] = b.split('.').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB - dateA;
    });

    // Формируем текст
    const currentDateStr = formatTimestampToDate(Math.floor(Date.now() / 1000));
    let report = "Приемы пищи [пп] и тренировки [тр] (за последние 60 дней, в граммах: б - белки, ж - жиры, у - углеводы):\n";

    for (const dateStr of sortedDates) {
        report += `${dateStr}:\n`;
        // Сортируем записи по времени в убывающем порядке
        grouped[dateStr].sort((a, b) => b.timestamp - a.timestamp);

        for (const record of grouped[dateStr]) {
            if (record.type === "sport") {
                // Формируем строку для тренировки
                const durationStr = record.duration ? formatMinutes(record.duration) : "-";
                // Список упражнений
                let exercisesList = "";
                if (record.exercises && record.exercises.length > 0) {
                    exercisesList = record.exercises.map(e => e.name).join(", ");
                }
                report += `[тр] ${record.name || "Занятие спортом"} | ${record.kcal || "-"} ккал | ${durationStr} | упражнения: ${exercisesList}\n`;
            } else {
                // Формируем строку для приема пищи
                const proteins = record.structure?.proteins ?? "-";
                const fats = record.structure?.fats ?? "-";
                const carbs = record.structure?.carbohydrates ?? "-";
                report += `[пп] ${record.name || "Прием пищи"} | ${record.kcal || "-"} ккал | б ${proteins} | ж ${fats} | у ${carbs}\n`;
            }
        }
    }

    return report;
}
