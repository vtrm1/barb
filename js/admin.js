// admin.js controla o painel do barbeiro

const appointmentsListEl = document.getElementById('appointments-list');
const filterButtons = document.querySelectorAll('.btn.filter');
let appointmentsUnsubscribe = null;
let currentFilter = 'all';

initAdmin();

function initAdmin() {
  if (!appointmentsListEl) return;
  subscribeToAppointments();
  setupFilters();
}

function setupFilters() {
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAppointments();
    });
  });
}

function subscribeToAppointments() {
  const today = new Date().toISOString().split('T')[0];
  if (appointmentsUnsubscribe) appointmentsUnsubscribe();

  appointmentsUnsubscribe = db
    .collection('appointments')
    .where('date', '==', today)
    .orderBy('time', 'asc')
    .onSnapshot((snapshot) => {
      window.__appointmentsCache = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAppointments();
    });
}

function renderAppointments() {
  const data = (window.__appointmentsCache || []).filter((appt) => {
    if (currentFilter === 'all') return true;
    return appt.status === currentFilter;
  });

  if (data.length === 0) {
    appointmentsListEl.innerHTML = '<p>Nenhum agendamento para o filtro selecionado.</p>';
    return;
  }

  appointmentsListEl.innerHTML = data
    .map(
      (appt) => `
      <article class="appointment-card">
        <header>
          <strong>${appt.time} — ${appt.serviceName}</strong>
          <span class="status ${appt.status}">${statusLabel(appt.status)}</span>
        </header>
        <p class="meta">Cliente: ${appt.customerName} — Tel: ${appt.customerPhone}</p>
        <div class="actions">
          <button class="btn btn-success" data-action="done" data-id="${appt.id}" ${appt.status === 'done' ? 'disabled' : ''}>Concluir</button>
          <button class="btn btn-danger" data-action="cancel" data-id="${appt.id}" ${appt.status === 'canceled' ? 'disabled' : ''}>Cancelar</button>
        </div>
      </article>`
    )
    .join('');

  appointmentsListEl.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.action));
  });
}

function statusLabel(status) {
  const map = {
    pending: 'Pendente',
    done: 'Concluído',
    canceled: 'Cancelado',
  };
  return map[status] || status;
}

async function updateStatus(id, action) {
  const newStatus = action === 'done' ? 'done' : 'canceled';
  try {
    await db.collection('appointments').doc(id).update({ status: newStatus });
  } catch (error) {
    console.error('Erro ao atualizar status', error);
    alert('Não foi possível atualizar este agendamento.');
  }
}
