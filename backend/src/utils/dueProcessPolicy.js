import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(__dirname, '../config/dueProcessPolicy.json');

const isPlainObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export const validateDueProcessPolicy = (policy) => {
  const errors = [];

  if (!isPlainObject(policy)) {
    return ['Policy payload must be a JSON object.'];
  }

  if (!isPlainObject(policy.schedules)) {
    errors.push('schedules must be an object.');
  }

  if (!isPlainObject(policy.violation_rules)) {
    errors.push('violation_rules must be an object.');
  }

  if (!isPlainObject(policy.notice_templates)) {
    errors.push('notice_templates must be an object.');
  }

  return errors;
};

export const loadDueProcessPolicy = async () => {
  try {
    const raw = await fs.readFile(POLICY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    logger.error('Failed to load due process policy:', error);
    return {
      version: 1,
      schedules: {},
      violation_rules: {},
      notice_templates: {},
    };
  }
};

export const saveDueProcessPolicy = async (policy) => {
  const errors = validateDueProcessPolicy(policy);
  if (errors.length > 0) {
    const error = new Error('Invalid due process policy payload.');
    error.details = errors;
    throw error;
  }

  const normalized = {
    ...policy,
    version: Number(policy.version) || 1,
  };

  await fs.writeFile(POLICY_PATH, JSON.stringify(normalized, null, 2));
  return normalized;
};

export const getScheduleFromPolicy = (policy, scheduleKey = 'default') => {
  const schedules = isPlainObject(policy?.schedules) ? policy.schedules : {};
  return schedules[scheduleKey] || schedules.default || null;
};

export const renderTemplate = (template, replacements) => {
  const safeTemplate = String(template || '');
  return Object.entries(replacements || {}).reduce((acc, [key, value]) => {
    const token = `{{${key}}}`;
    return acc.split(token).join(String(value ?? ''));
  }, safeTemplate);
};

export const formatViolationDates = (dates) => {
  if (!Array.isArray(dates) || dates.length === 0) return 'N/A';
  return dates.join(', ');
};
