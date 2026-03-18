export const REGULAR_HOLIDAY = 'regular';
export const SPECIAL_HOLIDAY = 'special';

const FIXED_HOLIDAYS = [
  { monthDay: '01-01', name: "New Year's Day", type: REGULAR_HOLIDAY },
  { monthDay: '04-09', name: 'Araw ng Kagitingan', type: REGULAR_HOLIDAY },
  { monthDay: '05-01', name: 'Labor Day', type: REGULAR_HOLIDAY },
  { monthDay: '06-12', name: 'Independence Day', type: REGULAR_HOLIDAY },
  { monthDay: '11-30', name: 'Bonifacio Day', type: REGULAR_HOLIDAY },
  { monthDay: '12-25', name: 'Christmas Day', type: REGULAR_HOLIDAY },
  { monthDay: '12-30', name: 'Rizal Day', type: REGULAR_HOLIDAY },

  { monthDay: '02-25', name: 'EDSA People Power Revolution Anniversary', type: SPECIAL_HOLIDAY },
  { monthDay: '08-21', name: 'Ninoy Aquino Day', type: SPECIAL_HOLIDAY },
  { monthDay: '11-01', name: "All Saints' Day", type: SPECIAL_HOLIDAY },
  { monthDay: '12-08', name: 'Feast of the Immaculate Conception', type: SPECIAL_HOLIDAY },
  { monthDay: '12-31', name: 'Last Day of the Year', type: SPECIAL_HOLIDAY },
];

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastMondayOfAugust = (year) => {
  const date = new Date(year, 7, 31);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

const computeEasterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getMovableHolyWeekDates = (year) => {
  const easterSunday = computeEasterSunday(year);
  return [
    { date: formatDate(addDays(easterSunday, -3)), name: 'Maundy Thursday', type: REGULAR_HOLIDAY },
    { date: formatDate(addDays(easterSunday, -2)), name: 'Good Friday', type: REGULAR_HOLIDAY },
    { date: formatDate(addDays(easterSunday, -1)), name: 'Black Saturday', type: SPECIAL_HOLIDAY },
  ];
};

const normalizeHoliday = (holiday) => ({
  date: holiday.date,
  name: holiday.name,
  type: holiday.type === REGULAR_HOLIDAY ? REGULAR_HOLIDAY : SPECIAL_HOLIDAY,
});

export const getPhilippineHolidayCalendar = (year, overrides = []) => {
  const fixed = FIXED_HOLIDAYS.map((item) => ({
    date: `${year}-${item.monthDay}`,
    name: item.name,
    type: item.type,
  }));

  const movable = getMovableHolyWeekDates(year);
  const heroesDay = {
    date: formatDate(getLastMondayOfAugust(year)),
    name: 'National Heroes Day',
    type: REGULAR_HOLIDAY,
  };

  const merged = [...fixed, ...movable, heroesDay, ...overrides]
    .map((item) => normalizeHoliday(item))
    .reduce((acc, item) => {
      acc.set(item.date, item);
      return acc;
    }, new Map());

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const buildHolidayLookup = ({
  startDate,
  endDate,
  overrides = [],
}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = new Set([start.getFullYear(), end.getFullYear()]);

  const holidays = [];
  for (const year of years) {
    holidays.push(...getPhilippineHolidayCalendar(year, overrides));
  }

  const holidayMap = new Map();
  holidays.forEach((holiday) => {
    if (holiday.date >= startDate && holiday.date <= endDate) {
      holidayMap.set(holiday.date, holiday);
    }
  });

  return holidayMap;
};

export const getHolidayForDate = (date, holidayLookup) => {
  if (!date) return null;
  return holidayLookup.get(date) || null;
};

export default {
  REGULAR_HOLIDAY,
  SPECIAL_HOLIDAY,
  getPhilippineHolidayCalendar,
  buildHolidayLookup,
  getHolidayForDate,
};
