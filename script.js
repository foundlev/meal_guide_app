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

// Загружаем текст из prompt_1.txt в переменную prompt_1
let prompt_1 = null;
fetch('assets/prompt_1.txt')
 .then(response => response.text())
 .then(text => {
    prompt_1 = text;
  })
 .catch(error => {
    console.error('Error fetching prompt_1.txt:', error);
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


// script.js

// script.js

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

  // Функция рендера истории с фильтрацией
  function renderMealHistory(filter = "") {
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
          mealName.textContent = "Занятие спортом";
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
        const localDatetime = dateObj.toISOString().slice(0,16); // Формат YYYY-MM-DDTHH:MM

        let detailsHTML = `
          <div class="modal-detail">
            <h3>${title}</h3>
            <div class="detail-line"><b>Название:</b> ${record.name || (recordType==="sport"?"Занятие спортом":"—")}</div>
            <div class="detail-line"><b>Дата и время:</b> <input type="datetime-local" id="edit-datetime" value="${localDatetime}"></div>
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
          </div>
          <div class="modal-actions-bottom">
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
});
