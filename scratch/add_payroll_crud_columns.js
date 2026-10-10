require('d:/company website/server/node_modules/dotenv').config({ path: 'd:/company website/server/.env' });
const { sequelize } = require('../server/src/config/db');

async function addColumns() {
  console.log('Connecting to database to add payroll CRUD and publication columns...');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    const [columns] = await sequelize.query(`SHOW COLUMNS FROM payrolls;`);
    const columnNames = columns.map((c) => c.Field);

    if (!columnNames.includes('is_sent_to_employee')) {
      await sequelize.query(`ALTER TABLE payrolls ADD COLUMN is_sent_to_employee BOOLEAN DEFAULT FALSE;`);
      console.log('✅ Added column is_sent_to_employee');
    } else {
      console.log('ℹ️ Column is_sent_to_employee already exists.');
    }

    if (!columnNames.includes('sent_at')) {
      await sequelize.query(`ALTER TABLE payrolls ADD COLUMN sent_at DATETIME NULL;`);
      console.log('✅ Added column sent_at');
    } else {
      console.log('ℹ️ Column sent_at already exists.');
    }

    if (!columnNames.includes('bonus')) {
      await sequelize.query(`ALTER TABLE payrolls ADD COLUMN bonus DECIMAL(10, 2) DEFAULT 0.00;`);
      console.log('✅ Added column bonus');
    } else {
      console.log('ℹ️ Column bonus already exists.');
    }

    if (!columnNames.includes('allowances')) {
      await sequelize.query(`ALTER TABLE payrolls ADD COLUMN allowances DECIMAL(10, 2) DEFAULT 0.00;`);
      console.log('✅ Added column allowances');
    } else {
      console.log('ℹ️ Column allowances already exists.');
    }

    console.log('🎉 Payroll schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update schema:', error);
    process.exit(1);
  }
}

addColumns();
