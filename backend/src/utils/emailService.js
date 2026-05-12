import nodemailer from 'nodemailer';
import logger from './logger.js';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  SMTP_FROM,
} = process.env;

let transporter;

const ensureTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    logger.warn('SMTP configuration missing. Falling back to console logs for email delivery.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatCurrency = (value) => `₱${Number(value || 0).toFixed(2)}`;

export const sendOtpEmail = async ({ to, code, name, expiresInMinutes }) => {
  const subject = 'Your One-Time Password (OTP)';
  const text = `Hi ${name || 'there'},\n\n` +
    `Use the following one-time password to proceed: ${code}.\n` +
    `It will expire in ${expiresInMinutes} minutes.\n\n` +
    'If you did not request this code, you can ignore this email.\n\n' +
    'Regards,\nHRIS Support Team';

  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>Use the following one-time password to proceed:</p>
    <p style="font-size:20px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>If you did not request this code, you can ignore this email.</p>
    <p>Regards,<br/>HRIS Support Team</p>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject, code });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${to}`);
  } catch (error) {
    logger.error('Failed to send OTP email', error);
    throw error;
  }
};

export const sendTicketResolutionEmail = async ({ to, ticketCode, title, resolutionDescription, resolverName }) => {
  const subject = `Ticket Resolved: ${ticketCode}`;
  const text = `Hi,\n\n` +
    `Your ticket "${ticketCode} - ${title}" has been resolved.\n\n` +
    `Resolution Details:\n${resolutionDescription}\n\n` +
    `Resolved by: ${resolverName}\n\n` +
    'If you have any questions, please feel free to contact us.\n\n' +
    'Regards,\nHRIS Support Team';

  const html = `
    <p>Hi,</p>
    <p>Your ticket <strong>${ticketCode} - ${title}</strong> has been resolved.</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0;">
      <h4 style="margin-top: 0;">Resolution Details:</h4>
      <p>${resolutionDescription.replace(/\n/g, '<br>')}</p>
    </div>
    <p><strong>Resolved by:</strong> ${resolverName}</p>
    <p>If you have any questions, please feel free to contact us.</p>
    <p>Regards,<br/>HRIS Support Team</p>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject, ticketCode });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`Ticket resolution email sent to ${to} for ticket ${ticketCode}`);
  } catch (error) {
    logger.error('Failed to send ticket resolution email', error);
    throw error;
  }
};

export const sendAccountCreatedEmail = async ({ to, name, username, loginUrl, password }) => {
  const subject = 'Your HRIS account has been created';
  const text = `Hi ${name || 'there'},\n\n` +
    `Your account has been created. You can log in with the username: ${username}\n` +
    `${password ? `Your temporary password is: ${password}\n` : ''}` +
    `\nLogin here: ${loginUrl}\n\n` +
    'If you did not expect this email, please contact your administrator.\n\n' +
    'Regards,\nHRIS Support Team';

  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>Your account has been created. You can log in with the username: <strong>${username}</strong></p>
    ${password ? `<p>Your temporary password is: <strong style="font-family:monospace">${password}</strong></p>` : ''}
    <p><a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:8px 12px;text-decoration:none;border-radius:4px;">Log in to HRIS</a></p>
    <p>If you did not expect this email, please contact your administrator.</p>
    <p>Regards,<br/>HRIS Support Team</p>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`Account creation email sent to ${to}`);
  } catch (error) {
    logger.error('Failed to send account creation email', error);
    throw error;
  }
};

export const sendPayrollRunFinalizedEmail = async ({
  to,
  recipientLabel = null,
  departmentName,
  runId,
  payPeriodStart,
  payPeriodEnd,
  payrollSchedule,
  budgetUsed,
  employees = [],
}) => {
  const employeeRows = employees.map((employee, index) => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(employee.employee_code || '')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(employee.employee_name || '')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(employee.gross_pay)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(employee.total_deductions)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(employee.net_pay)}</td>
    </tr>
  `).join('');

  const title = `Payroll Run Finalized - Run #${runId}`;
  const subject = departmentName ? `${title} (${departmentName})` : title;
  const recipientText = recipientLabel ? `Hello ${recipientLabel},` : 'Hello,';
  const budgetText = formatCurrency(budgetUsed);
  const periodText = payPeriodStart && payPeriodEnd ? `${payPeriodStart} to ${payPeriodEnd}` : 'N/A';

  const text = [
    recipientText,
    '',
    `Payroll run #${runId} has been finalized${departmentName ? ` for ${departmentName}` : ''}.`,
    `Pay period: ${periodText}.`,
    `Pay schedule: ${payrollSchedule || 'N/A'}.`,
    `Budget used: ${budgetText}.`,
    '',
    'Included employees:',
    ...employees.map((employee, index) => `${index + 1}. ${employee.employee_name || 'Unknown'} (${employee.employee_code || 'N/A'}) - Gross: ${formatCurrency(employee.gross_pay)}, Deductions: ${formatCurrency(employee.total_deductions)}, Net: ${formatCurrency(employee.net_pay)}`),
    '',
    'Regards,',
    'HRIS Payroll System',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
      <p>${escapeHtml(recipientText)}</p>
      <p>
        Payroll run <strong>#${escapeHtml(runId)}</strong> has been finalized
        ${departmentName ? `for <strong>${escapeHtml(departmentName)}</strong>` : ''}.
      </p>
      <ul>
        <li><strong>Pay period:</strong> ${escapeHtml(periodText)}</li>
        <li><strong>Pay schedule:</strong> ${escapeHtml(payrollSchedule || 'N/A')}</li>
        <li><strong>Budget used:</strong> ${escapeHtml(budgetText)}</li>
      </ul>
      <p>The employees included in this payroll run and their payslip summaries are listed below.</p>
      <table style="border-collapse:collapse;width:100%;max-width:100%;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">#</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Employee Code</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Employee</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Gross Pay</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Deductions</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Net Pay</th>
          </tr>
        </thead>
        <tbody>
          ${employeeRows || '<tr><td colspan="6" style="padding:8px;border:1px solid #e5e7eb;">No employees found.</td></tr>'}
        </tbody>
      </table>
      <p style="margin-top:16px;">Regards,<br/>HRIS Payroll System</p>
    </div>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject, runId, departmentName });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`Payroll finalization email sent to ${to} for run ${runId}`);
  } catch (error) {
    logger.error('Failed to send payroll finalization email', error);
    throw error;
  }
};

export const sendEmployeePayslipEmail = async ({
  to,
  employeeName,
  employeeCode,
  runId,
  payPeriodStart,
  payPeriodEnd,
  payrollSchedule,
  grossPay,
  totalDeductions,
  withholdingTax,
  netPay,
}) => {
  const periodText = payPeriodStart && payPeriodEnd
    ? `${payPeriodStart} to ${payPeriodEnd}`
    : 'this pay period';

  const subject = `Payslip available — ${periodText}`;

  const text = [
    `Hi ${employeeName || 'there'},`,
    '',
    `Your payslip for the pay period ${periodText} is now available.`,
    '',
    `Pay schedule: ${payrollSchedule || 'N/A'}`,
    `Gross Pay: ${formatCurrency(grossPay)}`,
    `Total Deductions: ${formatCurrency(totalDeductions)}`,
    `Withholding Tax: ${formatCurrency(withholdingTax)}`,
    `Net Pay: ${formatCurrency(netPay)}`,
    '',
    'You can view the full breakdown in the HRIS employee dashboard under "Payslips".',
    '',
    'Regards,',
    'HRIS Payroll System',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
      <p>Hi <strong>${escapeHtml(employeeName || 'there')}</strong>,</p>
      <p>Your payslip for the pay period <strong>${escapeHtml(periodText)}</strong> is now available.</p>
      <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
        <tbody>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Employee Code</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${escapeHtml(employeeCode || '')}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Payroll Run</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">#${escapeHtml(runId)}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Pay Schedule</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${escapeHtml(payrollSchedule || 'N/A')}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Gross Pay</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(grossPay)}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Total Deductions</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(totalDeductions)}</td></tr>
          <tr><td style="padding:6px 12px;border:1px solid #e5e7eb;">Withholding Tax</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(withholdingTax)}</td></tr>
          <tr style="background:#f3f4f6;"><td style="padding:6px 12px;border:1px solid #e5e7eb;"><strong>Net Pay</strong></td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:right;"><strong>${formatCurrency(netPay)}</strong></td></tr>
        </tbody>
      </table>
      <p>You can view the full breakdown in the HRIS employee dashboard under <strong>Payslips</strong>.</p>
      <p>Regards,<br/>HRIS Payroll System</p>
    </div>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject, runId });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`Employee payslip email sent to ${to} for run ${runId}`);
  } catch (error) {
    logger.error('Failed to send employee payslip email', error);
    throw error;
  }
};

export default {
  sendOtpEmail,
  sendTicketResolutionEmail,
  sendAccountCreatedEmail,
  sendPayrollRunFinalizedEmail,
  sendEmployeePayslipEmail,
};
