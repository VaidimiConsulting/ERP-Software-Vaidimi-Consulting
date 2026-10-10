const { Project, ProjectMember, ProjectMilestone, Task } = require('../models');
const { testConnection } = require('../config/db');

async function cleanDummyProjects() {
  console.log('=== Purging All Dummy Projects, Milestones, and Tasks ===');
  const dbStatus = await testConnection();
  if (!dbStatus.connected) {
    console.error('Database connection failed:', dbStatus.error);
    process.exit(1);
  }

  // 1. Delete all tasks
  const deletedTasks = await Task.destroy({ where: {} });
  console.log(`✅ Deleted ${deletedTasks} dummy project tasks.`);

  // 2. Delete all project milestones
  const deletedMilestones = await ProjectMilestone.destroy({ where: {} });
  console.log(`✅ Deleted ${deletedMilestones} dummy project milestones.`);

  // 3. Delete all project members
  const deletedMembers = await ProjectMember.destroy({ where: {} });
  console.log(`✅ Deleted ${deletedMembers} dummy project memberships.`);

  // 4. Delete all projects
  const deletedProjects = await Project.destroy({ where: {} });
  console.log(`✅ Deleted ${deletedProjects} dummy projects.`);

  console.log('====================================================');
  console.log('🎉 Project Portfolio clean-up complete!');
  console.log('Total Projects remaining: 0. Ready for Admin to add real projects.');
  console.log('====================================================');
}

cleanDummyProjects()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error during project clean-up:', err);
    process.exit(1);
  });
