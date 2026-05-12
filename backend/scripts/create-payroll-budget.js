import * as db from '../src/config/db.js';

async function createPayrollBudget() {
  const client = await db.pool.getConnection();
  try {
    console.log('Creating Payroll budget record...');
    
    // Insert Payroll budget if it doesn't exist
    const [budgetResult] = await client.execute(
      `INSERT IGNORE INTO budget (budget_name, description) 
       VALUES (?, ?)`,
      ['Payroll', 'Payroll budget for staff salaries and related expenses']
    );
    
    const budgetId = budgetResult.insertId || (await db.getOne(
      `SELECT budget_id FROM budget WHERE budget_name = ?`,
      ['Payroll']
    ))?.budget_id;
    
    if (!budgetId) {
      throw new Error('Failed to create or find Payroll budget');
    }
    
    console.log(`Payroll budget created/found with budget_id=${budgetId}`);
    
    // Link to HRIS department (department_id=1) with the existing amount
    const [bdResult] = await client.execute(
      `INSERT INTO budget_department (department_id, budget_id, allocated_amount, is_active)
       VALUES (?, ?, ?, 1)`,
      [1, budgetId, 2000000.00] // Use the existing amount from April Budget
    );
    
    console.log(`Budget linked to department_id=1 with amount ₱2,000,000.00`);
    console.log(`department_budget_id=${bdResult.insertId}`);
    console.log('\n✓ Payroll budget successfully configured!');
    
  } catch (error) {
    console.error('Error creating budget:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

createPayrollBudget();
