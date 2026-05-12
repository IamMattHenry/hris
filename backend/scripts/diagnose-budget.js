import * as db from '../src/config/db.js';

async function diagnoseBudget() {
  try {
    console.log('\n=== Budget Department Rows ===');
    const bdRows = await db.transactionQuery(
      `SELECT 
         bd.department_budget_id, 
         bd.department_id, 
         bd.allocated_amount, 
         bd.budget_id, 
         bd.is_active,
         b.budget_name, 
         b.description 
       FROM budget_department bd
       LEFT JOIN budget b ON b.budget_id = bd.budget_id
       ORDER BY bd.department_id, bd.department_budget_id`,
      []
    );
    
    if (bdRows && bdRows.length > 0) {
      console.table(bdRows);
    } else {
      console.log('No budget_department records found.');
    }
    
    console.log('\n=== All Budget Records ===');
    const bRows = await db.transactionQuery(
      `SELECT budget_id, budget_name, description FROM budget ORDER BY budget_id`,
      []
    );
    
    if (bRows && bRows.length > 0) {
      console.table(bRows);
    } else {
      console.log('No budget records found.');
    }
    
    console.log('\n=== Querying for department_id=1 with budget_name="Payroll" ===');
    const targetRow = await db.getOne(
      `SELECT
         bd.department_budget_id,
         bd.department_id,
         bd.allocated_amount,
         bd.budget_id,
         b.budget_name,
         b.description
       FROM budget_department bd
       LEFT JOIN budget b ON b.budget_id = bd.budget_id
       WHERE bd.department_id = ?
         AND bd.is_active = 1
         AND b.budget_name = ?
       ORDER BY bd.department_budget_id DESC
       LIMIT 1`,
      [1, 'Payroll']
    );
    
    if (targetRow) {
      console.log('Found:', targetRow);
    } else {
      console.log('No match found for department_id=1 and budget_name="Payroll"');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

diagnoseBudget();
