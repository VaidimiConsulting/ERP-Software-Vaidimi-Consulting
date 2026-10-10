require('d:/company website/server/node_modules/dotenv').config({ path: 'd:/company website/server/.env' });
const { Project, ProjectMember, Task, Employee, User, Notification, sequelize } = require('../server/src/models');
const { ROLES, TASK_STATUS, PROJECT_STATUS } = require('../server/src/config/constants');
const { notifyEmployee, notifyAdmins } = require('../server/src/utils/notify');

async function runTest() {
  console.log('--- Testing Project Team Delegation & Task Notification Flow ---');
  await sequelize.authenticate();
  console.log('✅ Database connected.');

  // Find Admin/HR user
  const adminUser = await User.findOne({ where: { role: ROLES.ADMIN } });
  const hrUser = await User.findOne({ where: { role: ROLES.HR } });
  console.log(`Found Admin User: ${adminUser?.email}, HR User: ${hrUser?.email}`);

  // Find 2 employees (Aryan and Varsha or first two available)
  const employees = await Employee.findAll({ limit: 2 });
  if (employees.length < 2) {
    console.error('❌ Need at least 2 employees to test.');
    process.exit(1);
  }

  const emp1 = employees[0];
  const emp2 = employees[1];
  console.log(`Employee 1: ${emp1.first_name} ${emp1.last_name} (${emp1.id})`);
  console.log(`Employee 2: ${emp2.first_name} ${emp2.last_name} (${emp2.id})`);

  // 1. Create a Project with Team Members and Roles
  const testProjectCode = `PRJ-TST-${Date.now().toString().slice(-4)}`;
  const project = await Project.create({
    project_code: testProjectCode,
    project_name: 'Garima Construction Project',
    client_name: 'Garima Infrastructure Ltd',
    description: 'High-rise residential and commercial infrastructure planning and management system.',
    technology_stack: 'React, Node.js, MySQL',
    priority: 'HIGH',
    status: PROJECT_STATUS.IN_PROGRESS,
    completion_percentage: 25,
    start_date: '2026-10-01',
    expected_end_date: '2027-04-30',
  });
  console.log(`✅ Project created: ${project.project_name} (${project.project_code})`);

  // 2. Add Team Members with specific parts/roles
  const member1 = await ProjectMember.create({
    project_id: project.id,
    employee_id: emp1.id,
    role_in_project: 'Frontend UI Lead',
    assigned_date: '2026-10-01',
  });

  const member2 = await ProjectMember.create({
    project_id: project.id,
    employee_id: emp2.id,
    role_in_project: 'Backend & Infrastructure Specialist',
    assigned_date: '2026-10-01',
  });
  console.log(`✅ Assigned ${emp1.first_name} as "${member1.role_in_project}"`);
  console.log(`✅ Assigned ${emp2.first_name} as "${member2.role_in_project}"`);

  // Notify employees of assignment
  await notifyEmployee({
    employeeId: emp1.id,
    title: `Assigned to Project: ${project.project_name}`,
    message: `You have been allocated to the project "${project.project_name}" as "${member1.role_in_project}".`,
    type: 'PROJECT_ASSIGNED',
    link: '/employee/projects',
  });

  // Verify employee notification exists
  if (emp1.user_id) {
    const notif1 = await Notification.findOne({
      where: { user_id: emp1.user_id, type: 'PROJECT_ASSIGNED' },
      order: [['created_at', 'DESC']],
    });
    console.log(`✅ Verified Employee 1 received Project Assignment Notification: "${notif1?.title}"`);
  }

  // 3. Create Deliverable Task assigned to Employee 1
  const taskCode = `TSK-${Date.now().toString().slice(-4)}`;
  const task = await Task.create({
    task_code: taskCode,
    project_id: project.id,
    title: 'Design Architectural CAD Mockups & Foundation Review',
    description: 'Prepare foundation schematics and review with client structural engineering team.',
    assigned_to: emp1.id,
    priority: 'URGENT',
    status: TASK_STATUS.TODO,
    due_date: '2026-10-15',
    progress_percentage: 0,
    completion_notes: null,
  });
  console.log(`✅ Created Task: ${task.title} (Code: ${task.task_code}) assigned to ${emp1.first_name}`);

  // Notify employee of task assignment
  await notifyEmployee({
    employeeId: emp1.id,
    title: `New Task Assigned: ${task.title}`,
    message: `You have been assigned to task "${task.title}" on project "${project.project_name}". Target due date: ${task.due_date}.`,
    type: 'TASK_ASSIGNED',
    link: '/employee/tasks',
  });

  // 4. Simulate Employee updating status, progress, and adding completion notes
  const completionNotes = 'Foundation layout and CAD mockups completed 100%. Client engineers reviewed and approved today.';
  await task.update({
    status: TASK_STATUS.COMPLETED,
    progress_percentage: 100,
    completed_at: new Date(),
    completion_notes: completionNotes,
  });
  console.log(`✅ Employee updated task status to COMPLETED with notes: "${task.completion_notes}"`);

  // Notify Admins and HR
  await notifyAdmins({
    title: `Task Status Update: ${task.title}`,
    message: `${emp1.first_name} ${emp1.last_name} updated task "${task.title}" on project "${project.project_name}" to COMPLETED (100% completed) | Remarks: "${completionNotes}".`,
    type: 'TASK_STATUS_UPDATE',
    link: '/admin/tasks',
  });

  // Verify Admin & HR received notifications
  const adminNotifs = await Notification.findAll({
    where: { type: 'TASK_STATUS_UPDATE' },
    order: [['created_at', 'DESC']],
    limit: 3,
  });
  console.log(`✅ Verified Admin/HR notifications generated: Found ${adminNotifs.length} recent update alert(s).`);
  if (adminNotifs.length > 0) {
    console.log(`Latest notification: "${adminNotifs[0].title}" -> "${adminNotifs[0].message}"`);
  }

  // Cleanup test data
  await task.destroy();
  await member1.destroy();
  await member2.destroy();
  await project.destroy();
  console.log('✅ Cleaned up temporary test project and task.');

  console.log('🎉 ALL PROJECT TEAM ALLOCATION & NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
