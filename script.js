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

document.addEventListener("DOMContentLoaded", function () {
  const addButton = document.getElementById("add-meal-button");
  const textarea = document.querySelector(".add-form textarea");
  const historyContainer = document.querySelector(".history");

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

      const prompt = "I will send you the name of a dish/product/supplement/vitamin in a freeform text. If no specific quantity is indicated (e.g., grams or pieces), assume:\n- For a dish, count as 1 serving (порции).\n- For a product, count as 1 piece (штуки - шт) (e.g., apple, banana).\n- For supplements or vitamins, count as 1 unit (штуки - шт) (e.g., 1 tablet, capsule, etc.).\n\nYour task:\n1. Return a short product name (1-3 words).\n2. Provide the calorie content (in kilocalories).\n3. Provide the composition: the amount of proteins, fats, and carbohydrates (in grams).\n4. Rate the product's healthiness (from 0.0 to 10.0, where 0 is highly harmful and 10 is highly beneficial). The rating should have one decimal place.\n\nIf the text contains additional information (e.g., composition or quantity), use it. For example, if the input says 'Two bananas,' assume it means 2 pieces and calculate the composition and calories for two bananas.\n\nImportant:\n- If the input text is not a product, supplement, vitamin, or dish, return an error in the following format: {'status': false, 'comment': 'Не является пищей'}\n\nResponse format must be strict JSON. \nReturn exclusively in Russian. Example:\nInput: '2 Банана'\nOutput:\n{\n    'status': true,\n    'name': 'Банан 2 шт',\n    'rate': 6.2,\n    'kcal': 192,\n    'proteins': 3,\n    'fats': 1,\n    'carbohydrates': 42\n}\n\nInput: 'Ручка'\nOutput:\n{\n    'status': false,\n    'comment': 'Не является пищей'\n}";
      const requestData = {
        "password": getPassword(),
        "prompt": prompt,
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
            kcal: parsed.kcal
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

  function renderMealHistory() {
    historyContainer.innerHTML = "";

    const records = JSON.parse(localStorage.getItem("mealRecords")) || [];

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

        let detailsHTML = `
          <div class="modal-detail">
            <h3>${title}</h3>
            <div class="detail-line"><b>Название:</b> ${record.name || (recordType==="sport"?"Занятие спортом":"—")}</div>
            <div class="detail-line"><b>Ккал:</b> ${record.kcal || "—"}</div>
        `;

        if (recordType !== "sport") {
          detailsHTML += `<div class="detail-line"><b>Белки:</b> ${record.structure.proteins} г | <b>Жиры:</b> ${record.structure.fats} г | <b>Углеводы:</b> ${record.structure.carbohydrates} г</div>`;
          detailsHTML += `<div class="detail-line"><b>Оценка:</b> ${record.rate!==null?record.rate:"—"}</div>`;
        }

        detailsHTML += `</div>`;

        showModal(
          detailsHTML,
          `<button class="modal-button cancel" id="cancel-detail">Отмена</button>
           <button class="modal-button" id="delete-detail">Удалить</button>
           <button class="modal-button" id="duplicate-detail">Дублировать</button>`
        );

        document.getElementById("cancel-detail").addEventListener("click", closeModal);

        document.getElementById("delete-detail").addEventListener("click", () => {
          const updatedRecords = records.filter(r => r.timestamp !== timestamp);
          localStorage.setItem("mealRecords", JSON.stringify(updatedRecords));
          closeModal();
          location.reload();
        });

        // Добавляем обработчик для дублирования
        document.getElementById("duplicate-detail").addEventListener("click", () => {
          const duplicatedRecord = {
            ...record,
            timestamp: Math.floor(Date.now() / 1000) // Новый timestamp
          };
          const updatedRecords = [...records, duplicatedRecord];
          localStorage.setItem("mealRecords", JSON.stringify(updatedRecords));
          closeModal();
          location.reload();
        });
      });
    });
  }

  renderMealHistory();
});



