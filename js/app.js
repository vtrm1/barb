// app.js controla o fluxo público de agendamentos

const servicesListEl = document.getElementById('services-list');
const servicesSelectEl = document.getElementById('service-select');
const dateInputEl = document.getElementById('date-input');
const timeSelectEl = document.getElementById('time-select');
const bookingForm = document.getElementById('booking-form');
const confirmationBox = document.getElementById('confirmation');

const state = {
  services: [],
  selectedService: null,
  settings: null,
};

init();

async function init() {
  if (!bookingForm) return; // evita execução em outras páginas

  setCurrentYear();
  setMinDate();

  try {
    await loadSettings();
    await loadServices();
    attachFormListeners();
  } catch (error) {
    console.error('Erro ao iniciar aplicação', error);
    alert('Falha ao carregar dados iniciais. Tente novamente mais tarde.');
  }
}

function setCurrentYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  dateInputEl.min = today;
  dateInputEl.value = today;
}

async function loadSettings() {
  const snapshot = await db.collection('settings').limit(1).get();
  if (snapshot.empty) {
    throw new Error('Coleção /settings não possui dados.');
  }
  state.settings = snapshot.docs[0].data();
}

async function loadServices() {
  const snapshot = await db.collection('services').where('active', '==', true).get();
  state.services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderServices();
  populateServiceSelect();
}

function renderServices() {
  servicesListEl.innerHTML = state.services
    .map(
      (service) => `
        <article class="service-card">
          <h3>${service.name}</h3>
          <p>Duração: ${service.duration} min</p>
          <p class="price">R$ ${Number(service.price).toFixed(2)}</p>
          <button class="btn secondary" data-service="${service.id}">Escolher</button>
        </article>`
    )
    .join('');

  servicesListEl.querySelectorAll('button[data-service]').forEach((btn) => {
    btn.addEventListener('click', () => {
      servicesSelectEl.value = btn.dataset.service;
      servicesSelectEl.dispatchEvent(new Event('change'));
      btn.textContent = 'Selecionado';
      setTimeout(() => (btn.textContent = 'Escolher'), 1500);
    });
  });
}

function populateServiceSelect() {
  state.services.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} — R$ ${Number(service.price).toFixed(2)}`;
    servicesSelectEl.appendChild(option);
  });
}

function attachFormListeners() {
  servicesSelectEl.addEventListener('change', () => {
    state.selectedService = state.services.find((s) => s.id === servicesSelectEl.value) || null;
    refreshAvailableTimes();
  });

  dateInputEl.addEventListener('change', refreshAvailableTimes);

  bookingForm.addEventListener('submit', handleBookingSubmit);
}

async function refreshAvailableTimes() {
  if (!state.selectedService || !dateInputEl.value) return;

  const availableTimes = await generateAvailableTimes(dateInputEl.value, state.selectedService.duration);
  timeSelectEl.innerHTML = '<option value="" disabled selected>Escolha um horário</option>';
  availableTimes.forEach((time) => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = time;
    timeSelectEl.appendChild(option);
  });

  if (availableTimes.length === 0) {
    const option = document.createElement('option');
    option.disabled = true;
    option.textContent = 'Sem horários disponíveis';
    timeSelectEl.appendChild(option);
  }
}

async function generateAvailableTimes(date, duration) {
  const { openHour, closeHour, breakStart, breakEnd, daysOpen } = state.settings;

  const dayName = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).toLowerCase();
  if (!daysOpen.includes(dayName.substring(0, 3))) return [];

  const existingAppointments = await db
    .collection('appointments')
    .where('date', '==', date)
    .get();

  const takenTimes = existingAppointments.docs
    .map((doc) => doc.data())
    .filter((appt) => appt.status !== 'canceled')
    .map((appt) => appt.time);

  const slots = [];
  for (let minutes = timeToMinutes(openHour); minutes <= timeToMinutes(closeHour) - duration; minutes += duration) {
    const currentTime = minutesToTime(minutes);
    if (isDuringBreak(currentTime, duration, breakStart, breakEnd)) continue;
    if (takenTimes.includes(currentTime)) continue;
    slots.push(currentTime);
  }
  return slots;
}

function isDuringBreak(time, duration, breakStart, breakEnd) {
  const start = timeToMinutes(time);
  const end = start + duration;
  return start < timeToMinutes(breakEnd) && end > timeToMinutes(breakStart);
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  if (!state.selectedService) {
    alert('Selecione um serviço.');
    return;
  }

  const payload = {
    serviceId: state.selectedService.id,
    serviceName: state.selectedService.name,
    date: dateInputEl.value,
    time: timeSelectEl.value,
    customerName: document.getElementById('customer-name').value.trim(),
    customerPhone: document.getElementById('customer-phone').value.trim(),
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (!payload.time) {
    alert('Escolha um horário válido.');
    return;
  }

  try {
    await db.collection('appointments').add(payload);
    bookingForm.reset();
    confirmationBox.classList.remove('hidden');
    setTimeout(() => confirmationBox.scrollIntoView({ behavior: 'smooth' }), 200);
  } catch (error) {
    console.error('Erro ao criar agendamento', error);
    alert('Não foi possível criar o agendamento. Tente novamente.');
  }
}
