const calendarDays = document.getElementById('calendarDays');
const monthTitle = document.getElementById('monthTitle');
const selectedDateLabel = document.getElementById('selectedDate');
const bookingForm = document.getElementById('bookingForm');
const testMode = document.getElementById('testMode');
const guestName = document.getElementById('guestName');
const guestEmail = document.getElementById('guestEmail');
const dogCount = document.getElementById('dogCount');
const dogWeights = document.getElementById('dogWeights');
const dropOff = document.getElementById('dropOff');
const pickUp = document.getElementById('pickUp');
const availabilitySwitch = document.getElementById('availabilitySwitch');
const editAvailability = document.getElementById('editAvailability');
const adminHelp = document.getElementById('adminHelp');
const overviewText = document.getElementById('overviewText');
const toast = document.getElementById('toast');
const loginDialog = document.getElementById('loginDialog');
const loginForm = document.getElementById('loginForm');
const workspace = document.querySelector('.workspace');
const cancelDialog = document.getElementById('cancelDialog');
const cancelForm = document.getElementById('cancelForm');
const cancelEmail = document.getElementById('cancelEmail');
const cancelDate = document.getElementById('cancelDate');
const languageToggle = document.getElementById('languageToggle');

const appConfig = window.appConfig || {};
const isSupabaseConfigured = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey && !appConfig.supabaseUrl.includes('YOUR_PROJECT_ID'));
const supabase = isSupabaseConfigured && window.supabase ? window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey) : null;

function readLocalStorage(key, fallback = []) {
	try {
		const value = JSON.parse(localStorage.getItem(key) || 'null');
		return value ?? fallback;
	} catch (error) {
		return fallback;
	}
}

function normalizeReservation(reservation) {
	return {
		...reservation,
		reservationId: reservation.reservationId || reservation.reservationid || reservation.id,
		dogCount: reservation.dogCount ?? reservation.dogcount ?? 0,
		dropOff: reservation.dropOff || reservation.dropoff || '',
		pickUp: reservation.pickUp || reservation.pickup || ''
	};
}

async function loadInitialStore() {
	const localUnavailable = readLocalStorage('harborUnavailable', []);
	const localReservations = readLocalStorage('harborReservations', []);

	let fallbackUnavailable = localUnavailable;
	let fallbackReservations = localReservations;

	if (supabase) {
		try {
			const [unavailableResponse, reservationsResponse] = await Promise.all([
				supabase.from('unavailable_dates').select('date'),
				supabase.from('reservations').select('*')
			]);

			if (!unavailableResponse.error && Array.isArray(unavailableResponse.data)) {
				fallbackUnavailable = unavailableResponse.data.map((row) => row.date);
			}

			if (!reservationsResponse.error && Array.isArray(reservationsResponse.data)) {
				fallbackReservations = reservationsResponse.data.map(normalizeReservation);
			}
		} catch (error) {
			console.warn('Supabase read failed, falling back to browser storage.', error);
		}
	}

	storedUnavailable = new Set(fallbackUnavailable);
	storedReservations = fallbackReservations;
	localStorage.setItem('harborUnavailable', JSON.stringify([...storedUnavailable]));
	localStorage.setItem('harborReservations', JSON.stringify(storedReservations));
	buildReservationCounts();
}

async function persistStore() {
	localStorage.setItem('harborUnavailable', JSON.stringify([...unavailableDates]));
	localStorage.setItem('harborReservations', JSON.stringify(storedReservations));

	if (supabase) {
		try {
			const unavailableResponse = await supabase.from('unavailable_dates').upsert(
				[...unavailableDates].map((date) => ({ date })),
				{ onConflict: 'date' }
			);
			if (unavailableResponse.error) throw unavailableResponse.error;
			const reservationsResponse = await supabase.from('reservations').upsert(
				storedReservations.map((reservation) => ({
					id: `${reservation.reservationId || reservation.reservationid || reservation.id}-${reservation.date}`,
					reservationid: reservation.reservationId || reservation.reservationid || reservation.id,
					date: reservation.date,
					name: reservation.name || '',
					email: reservation.email || '',
					dogcount: Number(reservation.dogCount ?? reservation.dogcount) || 0,
					dogs: Array.isArray(reservation.dogs) ? reservation.dogs : [],
					dropoff: reservation.dropOff || reservation.dropoff || '',
					pickup: reservation.pickUp || reservation.pickup || ''
				})),
				{ onConflict: 'id' }
			);
			if (reservationsResponse.error) throw reservationsResponse.error;
		} catch (error) {
			console.error('Supabase write failed; browser storage remains as fallback.', error);
			showToast('Could not save to the shared database. Check Supabase settings.');
		}
	}
}

const translations = {
		en: {
		brandSmall: 'Reservation desk', workspace: 'WORKSPACE', calendar: 'Calendar', signedIn: 'Signed in as', garden: 'THE GARDEN ROOM', title: 'Make a reservation', subtitle: 'Choose an available day to reserve your visit.', adminLogin: 'Admin login', adminMode: 'Admin mode', available: 'Available', reserved: 'Reserved', unavailable: 'Unavailable', today: 'Today', past: 'Past', closed: 'Closed', full: 'Full', left: 'left', reserveStay: 'Reserve your stay', selectDays: 'Select connected available days', testMode: 'Test mode: skip guest details', name: 'Your name', email: 'Email address', dogs: 'How many dogs?', weight: 'Weight for each dog (kg)', dropOff: 'Drop-off time', pickUp: 'Pick-up time', chooseTime: 'Choose time', confirm: 'Confirm reservation', cancelReservation: 'Cancel a reservation', bookingNote: 'You can change your reservation by contacting the desk.', staff: 'Staff access', loginHelp: 'Sign in to manage which days can be reserved.', password: 'Password', enterPassword: 'Enter password', continue: 'Continue', demoPassword: 'Demo password:', reservationChanges: 'Reservation changes', cancelHelp: 'Enter the email used for the reservation, then choose the booking to cancel.', reservation: 'Reservation', chooseReservation: 'Choose reservation', noReservations: 'No reservations found', cancel: 'Cancel reservation', adminHelp: 'Turn editing on, then click days to cycle them open or closed.', editingHelp: 'Click days to cycle them between available and unavailable.', editAvailability: 'Edit availability', editingOn: 'Editing on', availabilityLegend: 'Availability legend', availabilityInfo: 'Grey days can be reserved. Red days are closed or already reserved.', clickEdit: 'Click-to-edit availability', quickOverview: 'Quick overview', localStorage: 'Reservations are stored locally', reset: 'Reset all reservations', nowSelected: (count) => `${count} connected day${count === 1 ? '' : 's'} selected`, chooseEnd: 'Choose a day next to your current selection.'
	},
		th: {
		brandSmall: 'โต๊ะจองบริการ', workspace: 'พื้นที่ทำงาน', calendar: 'ปฏิทิน', signedIn: 'เข้าสู่ระบบในชื่อ', garden: 'ห้องสวน', title: 'จองเข้าพัก', subtitle: 'เลือกวันที่ว่างสำหรับการเข้าพักของคุณ', adminLogin: 'เข้าสู่ระบบผู้ดูแล', adminMode: 'โหมดผู้ดูแล', available: 'ว่าง', reserved: 'มีการจอง', unavailable: 'ไม่ว่าง', today: 'วันนี้', past: 'ผ่านไปแล้ว', closed: 'ปิด', full: 'เต็ม', left: 'ที่ว่าง', reserveStay: 'จองเข้าพัก', selectDays: 'เลือกวันที่ว่างที่ต่อเนื่องกัน', testMode: 'โหมดทดสอบ: ข้ามข้อมูลผู้จอง', name: 'ชื่อผู้จอง', email: 'อีเมล', dogs: 'มีสุนัขกี่ตัว?', weight: 'น้ำหนักสุนัขแต่ละตัว (กก.)', dropOff: 'เวลาส่งสุนัข', pickUp: 'เวลารับสุนัข', chooseTime: 'เลือกเวลา', confirm: 'ยืนยันการจอง', cancelReservation: 'ยกเลิกการจอง', bookingNote: 'หากต้องการเปลี่ยนการจอง กรุณาติดต่อเจ้าหน้าที่', staff: 'สำหรับเจ้าหน้าที่', loginHelp: 'เข้าสู่ระบบเพื่อจัดการวันที่เปิดให้จอง', password: 'รหัสผ่าน', enterPassword: 'กรอกรหัสผ่าน', continue: 'ดำเนินการต่อ', demoPassword: 'รหัสผ่านตัวอย่าง:', reservationChanges: 'แก้ไขการจอง', cancelHelp: 'กรอกอีเมลที่ใช้จอง แล้วเลือกการจองที่ต้องการยกเลิก', reservation: 'การจอง', chooseReservation: 'เลือกการจอง', noReservations: 'ไม่พบการจอง', cancel: 'ยกเลิกการจอง', adminHelp: 'เปิดการแก้ไข แล้วคลิกวันที่เพื่อสลับสถานะว่างหรือไม่ว่าง', editingHelp: 'คลิกวันที่เพื่อสลับระหว่างว่างและไม่ว่าง', editAvailability: 'แก้ไขวันว่าง', editingOn: 'กำลังแก้ไข', availabilityLegend: 'คำอธิบายสถานะวันว่าง', availabilityInfo: 'วันสีเทาสามารถจองได้ วันสีแดงปิดหรือมีการจองแล้ว', clickEdit: 'คลิกเพื่อแก้ไขวันว่าง', quickOverview: 'ภาพรวม', localStorage: 'ข้อมูลการจองจัดเก็บไว้ในเครื่องนี้', reset: 'รีเซ็ตการจองทั้งหมด', nowSelected: (count) => `เลือกแล้ว ${count} วันต่อเนื่อง`, chooseEnd: 'เลือกวันที่ติดกับวันที่เลือกไว้'
	}
};
let currentLanguage = localStorage.getItem('harborLanguage') || 'en';
const t = (key) => translations[currentLanguage][key];

let displayedMonth = new Date();
const selectedDates = new Set();
let adminMode = false;
let editingAvailability = false;
const MAX_RESERVATIONS_PER_DAY = 5;
let storedUnavailable = [];
let storedReservations = [];
const unavailableDates = new Set();
const reservationCounts = new Map();

function buildReservationCounts() {
	reservationCounts.clear();
	storedReservations.forEach((reservation) => {
		const dogsInReservation = dogsIn(reservation);
		reservationCounts.set(reservation.date, (reservationCounts.get(reservation.date) || 0) + dogsInReservation);
	});
}

function dogsIn(reservation) {
	return Array.isArray(reservation.dogs) ? reservation.dogs.length : Math.max(1, Number(reservation.dogCount) || 1);
}

function dateKey(year, month, day) {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDate(key) {
	return new Date(`${key}T12:00:00`).toLocaleDateString(currentLanguage === 'th' ? 'th-TH' : undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function renderDogWeights() {
	const count = Math.max(0, Math.min(10, Number(dogCount.value) || 0));
	dogCount.value = count;
	dogWeights.innerHTML = '';
	for (let index = 1; index <= count; index += 1) {
		const weightInput = document.createElement('input');
		weightInput.type = 'number';
		weightInput.min = '1';
		weightInput.step = '0.1';
		weightInput.required = true;
		weightInput.placeholder = `Dog ${index}`;
		weightInput.setAttribute('aria-label', `Weight for dog ${index}`);
		dogWeights.appendChild(weightInput);
	}
}

function populateTimeOptions() {
	[dropOff, pickUp].forEach((select) => {
		select.innerHTML = `<option value="">${t('chooseTime')}</option>`;
		for (let hour = 8; hour <= 17; hour += 1) {
			for (const minute of hour === 17 ? [0] : [0, 30]) {
				const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
				const option = document.createElement('option');
				option.value = value;
				option.textContent = new Date(`2000-01-01T${value}`).toLocaleTimeString(currentLanguage === 'th' ? 'th-TH' : [], { hour: 'numeric', minute: '2-digit' });
				select.appendChild(option);
			}
		}
	});
}

function applyLanguage() {
	document.documentElement.lang = currentLanguage === 'th' ? 'th' : 'en';
	languageToggle.textContent = currentLanguage === 'th' ? 'English' : 'ไทย';
	document.querySelector('.brand small').textContent = t('brandSmall');
	document.querySelector('.nav-label').textContent = t('workspace');
	document.querySelector('.nav-item span').textContent = t('calendar');
	document.querySelector('.sidebar-foot').firstChild.textContent = `${t('signedIn')} `;
	document.querySelector('.topbar .eyebrow').textContent = t('garden');
	document.querySelector('h1').textContent = t('title');
	document.querySelector('.subtitle').textContent = t('subtitle');
	document.getElementById('adminButton').innerHTML = `<i class="${adminMode ? 'icon-unlock-keyhole' : 'icon-lock-keyhole'}"></i> ${adminMode ? t('adminMode') : t('adminLogin')}`;
	['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day, index) => { document.querySelectorAll('.weekday')[index].textContent = currentLanguage === 'th' ? ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][index] : day; });
	const legendLabels = [t('available'), t('reserved'), t('unavailable'), t('today')];
	document.querySelectorAll('.legend span').forEach((item, index) => { item.lastChild.textContent = ` ${legendLabels[index]}`; });
	document.querySelector('.booking-panel h2').textContent = t('reserveStay');
	document.querySelector('.check-row label').textContent = t('testMode');
	const labels = { guestName: t('name'), guestEmail: t('email'), dogCount: t('dogs'), dropOff: t('dropOff'), pickUp: t('pickUp') };
	Object.entries(labels).forEach(([id, label]) => { document.querySelector(`label[for="${id}"]`).textContent = label; });
	document.querySelector('.booking-panel .form-row:nth-of-type(4) label').textContent = t('weight');
	guestName.placeholder = currentLanguage === 'th' ? 'เช่น อเล็กซ์ มอร์แกน' : 'e.g. Alex Morgan';
	guestEmail.placeholder = currentLanguage === 'th' ? 'you@example.com' : 'you@example.com';
	document.querySelector('#bookingForm .primary-btn').textContent = t('confirm');
	document.getElementById('cancelButton').textContent = t('cancelReservation');
	document.querySelector('.booking-note').textContent = t('bookingNote');
	document.querySelector('.admin-banner strong').textContent = t('adminMode');
	document.querySelector('.tool-card h3').textContent = t('availabilityLegend');
	document.querySelector('.tool-card p').textContent = t('availabilityInfo');
	document.querySelector('.availability-toggle span').textContent = t('clickEdit');
	document.querySelectorAll('.tool-card h3')[1].textContent = t('quickOverview');
	document.querySelectorAll('.availability-toggle span')[1].textContent = t('localStorage');
	document.getElementById('resetReservations').textContent = t('reset');
	document.querySelector('.login-dialog .eyebrow').textContent = t('staff');
	document.querySelector('.login-dialog h2').textContent = t('adminLogin');
	document.querySelector('.login-dialog p:not(.eyebrow)').textContent = t('loginHelp');
	document.querySelector('.login-dialog label').textContent = t('password');
	document.getElementById('adminPassword').placeholder = t('enterPassword');
	document.querySelector('.login-dialog .primary-btn').textContent = t('continue');
	document.querySelector('.login-dialog small').firstChild.textContent = `${t('demoPassword')} `;
	document.querySelector('.cancel-dialog .eyebrow').textContent = t('reservationChanges');
	document.querySelector('.cancel-dialog h2').textContent = t('cancelReservation');
	document.querySelector('.cancel-dialog p:not(.eyebrow)').textContent = t('cancelHelp');
	document.querySelector('.cancel-dialog label[for="cancelEmail"]').textContent = t('email');
	document.querySelector('.cancel-dialog label[for="cancelDate"]').textContent = t('reservation');
	document.getElementById('cancelEmail').placeholder = currentLanguage === 'th' ? 'you@example.com' : 'you@example.com';
	document.querySelector('.cancel-dialog .primary-btn').textContent = t('cancel');
	populateTimeOptions();
	selectedDateLabel.textContent = selectedDates.size ? t('nowSelected')(selectedDates.size) : t('selectDays');
	adminHelp.textContent = editingAvailability ? t('editingHelp') : t('adminHelp');
	editAvailability.textContent = editingAvailability ? t('editingOn') : t('editAvailability');
	updateCancellationDates();
	renderCalendar();
}

dogCount.addEventListener('focus', () => dogCount.select());

function renderCalendar() {
	const year = displayedMonth.getFullYear();
	const month = displayedMonth.getMonth();
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
	monthTitle.textContent = displayedMonth.toLocaleDateString(currentLanguage === 'th' ? 'th-TH' : undefined, { month: 'long', year: 'numeric' });
	calendarDays.innerHTML = '';
	for (let index = 0; index < firstDay; index += 1) calendarDays.appendChild(document.createElement('div')).className = 'day empty';
	for (let day = 1; day <= daysInMonth; day += 1) {
		const key = dateKey(year, month, day);
		const reservationCount = reservationCounts.get(key) || 0;
		const isClosed = unavailableDates.has(key);
		const isFull = reservationCount >= MAX_RESERVATIONS_PER_DAY;
		const isPast = key < todayKey;
		const isUnavailable = isClosed || isFull;
		const spotsLeft = Math.max(0, MAX_RESERVATIONS_PER_DAY - reservationCount);
		const dayButton = document.createElement('button');
		dayButton.type = 'button';
		dayButton.className = `day${isUnavailable ? ' booked' : ''}${reservationCount > 0 && !isFull && !isClosed ? ' reserved' : ''}${reservationCount >= 3 && !isUnavailable ? ' busy' : ''}${isFull ? ' full' : ''}${isPast ? ' past' : ''}${key === todayKey ? ' today' : ''}${selectedDates.has(key) ? ' selected' : ''}`;
		dayButton.dataset.date = key;
		dayButton.innerHTML = `<span class="day-number">${day}</span><span class="day-status">${isPast ? t('past') : isClosed ? t('closed') : isFull ? t('full') : `${spotsLeft} ${t('left')}`}</span>`;
		dayButton.addEventListener('click', () => selectDate(key));
		calendarDays.appendChild(dayButton);
	}
	updateAdminPanel();
}

function selectDate(key) {
	if (adminMode) {
		if (!editingAvailability) return showToast(currentLanguage === 'th' ? 'กรุณาเปิดแก้ไขวันว่างก่อนเปลี่ยนวันที่' : 'Enable Edit availability before changing days.');
		if ((reservationCounts.get(key) || 0) > 0) return showToast(currentLanguage === 'th' ? 'ไม่สามารถเปลี่ยนวันที่มีการจองแล้ว' : 'Reserved days cannot be changed.');
		if (unavailableDates.has(key)) unavailableDates.delete(key); else unavailableDates.add(key);
		persistStore();
		renderCalendar();
		return;
	}
	if (!adminMode && (unavailableDates.has(key) || (reservationCounts.get(key) || 0) >= MAX_RESERVATIONS_PER_DAY)) {
		showToast(currentLanguage === 'th' ? 'วันที่นี้ไม่ว่าง กรุณาเลือกวันอื่น' : 'That day is unavailable. Please choose another.');
		return;
	}
	if (!adminMode && key < dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) {
		showToast(currentLanguage === 'th' ? 'ไม่สามารถจองวันที่ผ่านมาแล้ว' : 'Past days cannot be reserved.');
		return;
	}
	if (selectedDates.has(key)) {
		if (selectedDates.size > 1) {
			const remainingDates = [...selectedDates].filter((date) => date !== key);
			if (!areDatesConnected(remainingDates)) return showToast(currentLanguage === 'th' ? 'ลบได้เฉพาะวันแรกหรือวันสุดท้าย' : 'Only the first or last day can be removed.');
		}
		selectedDates.delete(key);
	} else {
		const touchesSelection = [...selectedDates].some((date) => datesBetween(date, key).length === 2 || datesBetween(key, date).length === 2);
		if (selectedDates.size && !touchesSelection) return showToast(t('chooseEnd'));
		selectedDates.add(key);
	}
	selectedDateLabel.textContent = selectedDates.size ? t('nowSelected')(selectedDates.size) : t('selectDays');
	renderCalendar();
}

function areDatesConnected(dates) {
	const sortedDates = [...dates].sort();
	return sortedDates.every((date, index) => index === 0 || datesBetween(sortedDates[index - 1], date).length === 2);
}

function datesBetween(startKey, endKey) {
	const dates = [];
	const current = new Date(`${startKey}T12:00:00`);
	const end = new Date(`${endKey}T12:00:00`);
	while (current <= end) {
		dates.push(dateKey(current.getFullYear(), current.getMonth(), current.getDate()));
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

function updateAdminPanel() {
	if (!adminMode) return;
	availabilitySwitch.classList.toggle('on', editingAvailability);
	availabilitySwitch.disabled = false;
	const unavailableCount = [...unavailableDates].filter((key) => key.startsWith(`${displayedMonth.getFullYear()}-${String(displayedMonth.getMonth() + 1).padStart(2, '0')}`)).length;
	const totalReservations = [...reservationCounts.values()].reduce((total, count) => total + count, 0);
	overviewText.textContent = currentLanguage === 'th' ? `เดือนนี้ปิด ${unavailableCount} วัน มีการจองทั้งหมด ${totalReservations} รายการ` : `${unavailableCount} closed day${unavailableCount === 1 ? '' : 's'} this month. ${totalReservations} reservation${totalReservations === 1 ? '' : 's'} in total.`;
}

function showToast(message) {
	const toastTranslations = {
		'Admin mode enabled': 'เปิดโหมดผู้ดูแลแล้ว',
		'Incorrect password': 'รหัสผ่านไม่ถูกต้อง',
		'All reservations reset': 'รีเซ็ตการจองทั้งหมดแล้ว',
		'No matching reservation found.': 'ไม่พบการจองที่ตรงกัน',
		'Reservation cancelled': 'ยกเลิกการจองแล้ว',
		'Choose at least one available day first.': 'กรุณาเลือกวันที่ว่างอย่างน้อยหนึ่งวัน',
		'Enter a weight for every dog.': 'กรุณากรอกน้ำหนักของสุนัขทุกตัว'
	};
	if (currentLanguage === 'th' && toastTranslations[message]) message = toastTranslations[message];
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 2800);
}

document.getElementById('previousMonth').addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderCalendar(); });
function enableAdminMode() {
	adminMode = true;
	editingAvailability = false;
	selectedDates.clear();
	workspace.classList.add('admin-active');
	document.getElementById('adminButton').innerHTML = `<i class="icon-unlock-keyhole"></i> ${t('adminMode')}`;
	showToast('Admin mode enabled');
	renderCalendar();
}
document.getElementById('adminButton').addEventListener('click', () => {
	if (adminMode) return;
	loginDialog.showModal();
	document.getElementById('adminPassword').focus();
});
loginForm.addEventListener('submit', (event) => {
	event.preventDefault();
	if (document.getElementById('adminPassword').value !== 'admin123') return showToast('Incorrect password');
	loginDialog.close();
	loginForm.reset();
	enableAdminMode();
});
document.getElementById('closeLogin').addEventListener('click', () => loginDialog.close());
document.getElementById('closeAdmin').addEventListener('click', () => {
	adminMode = false;
	editingAvailability = false;
	workspace.classList.remove('admin-active');
	document.getElementById('adminButton').innerHTML = `<i class="icon-lock-keyhole"></i> ${t('adminLogin')}`;
	renderCalendar();
});
availabilitySwitch.addEventListener('click', () => {
	editAvailability.click();
});
editAvailability.addEventListener('click', () => {
	editingAvailability = !editingAvailability;
	editAvailability.classList.toggle('active', editingAvailability);
	editAvailability.textContent = editingAvailability ? 'Editing on' : 'Edit availability';
	adminHelp.textContent = editingAvailability ? t('editingHelp') : t('adminHelp');
	editAvailability.textContent = editingAvailability ? t('editingOn') : t('editAvailability');
	updateAdminPanel();
});
document.getElementById('resetReservations').addEventListener('click', async () => {
	if (!confirm('Reset all reservations? This cannot be undone.')) return;
	storedReservations = [];
	unavailableDates.clear();
	reservationCounts.clear();
	localStorage.removeItem('harborReservations');
	localStorage.removeItem('harborUnavailable');
	await persistStore();
	renderCalendar();
	showToast('All reservations reset');
});
document.getElementById('cancelButton').addEventListener('click', () => {
	cancelDialog.showModal();
	cancelEmail.focus();
});
function updateCancellationDates() {
	const email = cancelEmail.value.trim().toLowerCase();
	const matchingReservations = new Map();
	storedReservations.filter((reservation) => reservation.email?.toLowerCase() === email).forEach((reservation) => {
		const reservationId = reservation.reservationId || `legacy-${reservation.date}`;
		if (!matchingReservations.has(reservationId)) matchingReservations.set(reservationId, []);
		matchingReservations.get(reservationId).push(reservation);
	});
	cancelDate.innerHTML = matchingReservations.size ? `<option value="">${t('chooseReservation')}</option>` : `<option value="">${t('noReservations')}</option>`;
	matchingReservations.forEach((reservations, reservationId) => {
		const option = document.createElement('option');
		const dates = reservations.map((reservation) => reservation.date).sort();
		option.value = reservationId;
		option.textContent = dates.length === 1 ? formatDate(dates[0]) : `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])} (${dates.length} days)`;
		cancelDate.appendChild(option);
	});
	cancelDate.disabled = matchingReservations.size === 0;
}
cancelEmail.addEventListener('input', updateCancellationDates);
cancelForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const matchingIndexes = [];
	storedReservations.forEach((reservation, index) => {
		const reservationId = reservation.reservationId || `legacy-${reservation.date}`;
		if (reservationId === cancelDate.value && reservation.email?.toLowerCase() === cancelEmail.value.trim().toLowerCase()) matchingIndexes.push(index);
	});
	if (!matchingIndexes.length) return showToast('No matching reservation found.');
	matchingIndexes.reverse().forEach((index) => {
		const [reservation] = storedReservations.splice(index, 1);
		const remainingDogs = (reservationCounts.get(reservation.date) || 0) - dogsIn(reservation);
		if (remainingDogs > 0) reservationCounts.set(reservation.date, remainingDogs); else reservationCounts.delete(reservation.date);
	});
	await persistStore();
	cancelForm.reset();
	updateCancellationDates();
	cancelDialog.close();
	renderCalendar();
	showToast('Reservation cancelled');
});
document.getElementById('closeCancel').addEventListener('click', () => cancelDialog.close());
testMode.addEventListener('change', () => {
	guestName.required = !testMode.checked;
	guestEmail.required = !testMode.checked;
	guestName.disabled = testMode.checked;
	guestEmail.disabled = testMode.checked;
	if (testMode.checked) {
		guestName.value = 'Test reservation';
		guestEmail.value = 'test@example.com';
	} else {
		guestName.value = '';
		guestEmail.value = '';
	}
});
dogCount.addEventListener('input', renderDogWeights);
bookingForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!selectedDates.size) return showToast('Choose at least one available day first.');
	const dates = [...selectedDates];
	const weights = [...dogWeights.querySelectorAll('input')].map((input) => Number(input.value));
	if (weights.some((weight) => !weight || weight <= 0)) return showToast('Enter a weight for every dog.');
	const reservationDetails = { reservationId: `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: guestName.value, email: guestEmail.value, dogCount: weights.length, dogs: weights.map((weight, index) => ({ number: index + 1, weight })), dropOff: dropOff.value, pickUp: pickUp.value };
	dates.forEach((date) => {
		storedReservations.push({ date, ...reservationDetails });
		reservationCounts.set(date, (reservationCounts.get(date) || 0) + weights.length);
	});
	await persistStore();
	selectedDates.clear();
	selectedDateLabel.textContent = t('selectDays');
	bookingForm.reset();
	showToast(currentLanguage === 'th' ? `จองแล้ว ${dates.length} วัน` : `${dates.length} day${dates.length === 1 ? '' : 's'} reserved`);
	renderCalendar();
});

renderDogWeights();
languageToggle.addEventListener('click', () => {
	currentLanguage = currentLanguage === 'en' ? 'th' : 'en';
	localStorage.setItem('harborLanguage', currentLanguage);
	applyLanguage();
});

loadInitialStore().then(() => {
	storedUnavailable.forEach((date) => unavailableDates.add(date));
	applyLanguage();
});
