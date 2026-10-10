const {
  sendEmail,
  sendLeaveStatusEmail,
  sendTaskAssignmentEmail,
  sendPayslipReadyEmail,
} = require('../server/src/services/emailService');

async function testEmail() {
  console.log('[Test 1/3] Testing generic branded email dispatch...');
  const res1 = await sendEmail({
    to: 'employee@company.com',
    subject: 'System Test Notification',
    html: '<p>This is a test notification from Vaidimi HRMS.</p>',
  });
  console.log('Result 1:', res1);

  console.log('\n[Test 2/3] Testing Leave status email template...');
  const res2 = await sendLeaveStatusEmail({
    to: 'employee@company.com',
    employeeName: 'Rahul Verma',
    leaveType: 'PAID_LEAVE',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    status: 'APPROVED',
    adminRemarks: 'Approved. Enjoy your vacation!',
  });
  console.log('Result 2:', res2);

  console.log('\n[Test 3/3] Testing Payslip ready email template...');
  const res3 = await sendPayslipReadyEmail({
    to: 'employee@company.com',
    employeeName: 'Rahul Verma',
    month: 'September',
    year: '2026',
    netSalary: 75000,
  });
  console.log('Result 3:', res3);

  console.log('\n✅ ALL EMAIL SERVICE TESTS COMPLETED SUCCESSFULLY!');
}

testEmail().then(() => process.exit(0)).catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
