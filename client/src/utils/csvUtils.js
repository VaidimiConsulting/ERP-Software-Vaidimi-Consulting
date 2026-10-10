/**
 * CSV Export & Import Utilities for Vaidimi Consulting Portal
 */

/**
 * Escapes a cell value for standard RFC-4180 CSV compliance
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // If string contains comma, double quotes, or newline, enclose in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }
  return str;
}

/**
 * Export data to a downloadable CSV file
 * @param {string} filename - e.g. 'vaidimi_employees.csv'
 * @param {Array<Object>} rows - Array of data objects
 * @param {Array<{key: string, label: string, format?: Function}>} columns - Column mappings
 */
export function exportToCsv(filename, rows = [], columns = []) {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Header row
  const headers = columns.map((c) => escapeCsvValue(c.label)).join(',');

  // Data rows
  const dataRows = rows.map((row) => {
    return columns
      .map((c) => {
        let val = row[c.key];
        if (c.format && typeof c.format === 'function') {
          val = c.format(val, row);
        }
        return escapeCsvValue(val);
      })
      .join(',');
  });

  // Combine with UTF-8 BOM so Excel opens Hindi and special characters cleanly
  const csvContent = '\uFEFF' + [headers, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV Text Parser
 * Parses RFC-4180 CSV text into an array of objects
 */
export function parseCsv(csvText) {
  // Remove BOM if present
  if (csvText.charCodeAt(0) === 0xfeff) {
    csvText = csvText.slice(1);
  }

  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
        i++; // skip \n
      } else if (char === '\n' || char === '\r') {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.toLowerCase().replace(/[\s\-_]/g, ''));
  const parsedData = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    // Skip empty row
    if (row.length === 1 && row[0] === '') continue;

    const rowObj = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = row[c] !== undefined ? row[c] : '';
    }
    parsedData.push(rowObj);
  }

  return parsedData;
}

/**
 * Download sample CSV template for bulk employee onboarding
 */
export function downloadSampleEmployeeCsv() {
  const sampleColumns = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'designation', label: 'Designation' },
    { key: 'employment_type', label: 'Employment Type' },
    { key: 'joining_date', label: 'Joining Date' },
    { key: 'skills', label: 'Skills' },
  ];

  const sampleRows = [
    {
      first_name: 'Rahul',
      last_name: 'Verma',
      email: 'rahul.verma@vaidimi.com',
      phone: '9876543211',
      designation: 'Frontend Engineer',
      employment_type: 'EMPLOYEE',
      joining_date: '2026-09-01',
      skills: 'React, Tailwind, JavaScript',
    },
    {
      first_name: 'Sneha',
      last_name: 'Kapoor',
      email: 'sneha.kapoor@vaidimi.com',
      phone: '9876543212',
      designation: 'Business Analyst Intern',
      employment_type: 'INTERN',
      joining_date: '2026-09-15',
      skills: 'Data Analysis, Python, SQL',
    },
  ];

  exportToCsv('vaidimi_staff_onboarding_template.csv', sampleRows, sampleColumns);
}

/**
 * Download sample CSV template for company holidays
 */
export function downloadSampleHolidayCsv() {
  const sampleColumns = [
    { key: 'name', label: 'Holiday Name' },
    { key: 'date', label: 'Date' },
    { key: 'is_paid', label: 'Is Paid' },
    { key: 'applicable_to', label: 'Applicable To' },
    { key: 'description', label: 'Description' },
  ];

  const sampleRows = [
    {
      name: 'Diwali',
      date: '2026-11-08',
      is_paid: 'TRUE',
      applicable_to: 'ALL',
      description: 'Festival of Lights - Official Holiday',
    },
    {
      name: 'Republic Day',
      date: '2026-01-26',
      is_paid: 'TRUE',
      applicable_to: 'ALL',
      description: 'National Republic Day Celebration',
    },
  ];

  exportToCsv('vaidimi_holidays_template.csv', sampleRows, sampleColumns);
}
