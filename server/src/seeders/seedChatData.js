require('dotenv').config();
const {
  User,
  Employee,
  Project,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
} = require('../models');
const { ROLES } = require('../config/constants');

async function seedChatData() {
  console.log('💬 Seeding Workplace Chat & Channel Data...');

  const users = await User.findAll({
    include: [{ model: Employee, as: 'employeeProfile' }],
  });

  if (users.length === 0) {
    console.log('No users found to seed chat data.');
    return;
  }

  const adminUser = users.find((u) => u.role === ROLES.ADMIN) || users[0];
  const hrUser = users.find((u) => u.role === ROLES.HR) || users[1] || users[0];
  const employeeUsers = users.filter((u) => u.role === ROLES.EMPLOYEE);
  const internUsers = users.filter(
    (u) => u.employeeProfile && u.employeeProfile.employment_type === 'INTERN'
  );

  const projects = await Project.findAll();
  const firstProject = projects[0] || null;

  // 1. General Company Lounge Channel
  let generalChannel = await ChatConversation.findOne({
    where: { category: 'GENERAL', title: '🏢 Vaidimi All-Hands & Announcements' },
  });

  if (!generalChannel) {
    generalChannel = await ChatConversation.create({
      type: 'GROUP',
      title: '🏢 Vaidimi All-Hands & Announcements',
      description: 'Company-wide corporate discussions, updates, and workplace collaboration.',
      category: 'GENERAL',
      created_by: adminUser.id,
      last_message_text: 'Welcome team to our official Vaidimi workplace collaboration hub!',
      last_message_at: new Date(),
    });

    for (const u of users) {
      await ChatParticipant.create({
        conversation_id: generalChannel.id,
        user_id: u.id,
        role: u.id === adminUser.id ? 'ADMIN' : 'MEMBER',
        last_read_at: new Date(),
      });
    }

    await ChatMessage.create({
      conversation_id: generalChannel.id,
      sender_id: adminUser.id,
      message: '👋 Welcome team to our official Vaidimi workplace collaboration hub! Let’s keep high momentum for our deliverables.',
      message_type: 'TEXT',
    });

    if (hrUser && hrUser.id !== adminUser.id) {
      await ChatMessage.create({
        conversation_id: generalChannel.id,
        sender_id: hrUser.id,
        message: 'Great initiative! Reminder: Shift timings are 10:30 AM to 5:30 PM with 1-2 PM lunch break. Please maintain on-time logins.',
        message_type: 'TEXT',
      });
    }
  }

  // 2. Project Group Channel
  if (firstProject) {
    let projectChannel = await ChatConversation.findOne({
      where: { category: 'PROJECT', project_id: firstProject.id },
    });

    if (!projectChannel) {
      projectChannel = await ChatConversation.create({
        type: 'GROUP',
        title: `💼 ${firstProject.name} — Project Squad`,
        description: `Delivering milestones, sprint tasks, and client requirements for ${firstProject.name}.`,
        category: 'PROJECT',
        project_id: firstProject.id,
        created_by: adminUser.id,
        last_message_text: 'Sprint sync: All API endpoints are ready for integration.',
        last_message_at: new Date(),
      });

      const projectSquad = [adminUser, hrUser, ...employeeUsers.slice(0, 3)].filter(Boolean);
      for (const u of projectSquad) {
        await ChatParticipant.findOrCreate({
          where: { conversation_id: projectChannel.id, user_id: u.id },
          defaults: {
            conversation_id: projectChannel.id,
            user_id: u.id,
            role: u.id === adminUser.id ? 'ADMIN' : 'MEMBER',
            last_read_at: new Date(),
          },
        });
      }

      await ChatMessage.create({
        conversation_id: projectChannel.id,
        sender_id: adminUser.id,
        message: `Project channel initialized for "${firstProject.name}". Let's track sprint deliverables here.`,
        message_type: 'SYSTEM',
      });

      if (employeeUsers.length > 0) {
        await ChatMessage.create({
          conversation_id: projectChannel.id,
          sender_id: employeeUsers[0].id,
          message: 'Sprint sync: All API endpoints are ready for integration and testing.',
          message_type: 'TEXT',
        });
      }
    }
  }

  // 3. Interns Hub Group Channel
  let internChannel = await ChatConversation.findOne({
    where: { category: 'INTERN', title: '🎓 Internship Program 2026 — Cohort Hub' },
  });

  if (!internChannel) {
    internChannel = await ChatConversation.create({
      type: 'GROUP',
      title: '🎓 Internship Program 2026 — Cohort Hub',
      description: 'Mentorship guidance, daily intern standups, assignments, and learning resources.',
      category: 'INTERN',
      created_by: hrUser.id,
      last_message_text: 'Standup update: Interns please share your daily task summary by 4:30 PM.',
      last_message_at: new Date(),
    });

    const internSquad = [adminUser, hrUser, ...internUsers, ...employeeUsers.slice(0, 2)].filter(Boolean);
    for (const u of internSquad) {
      await ChatParticipant.findOrCreate({
        where: { conversation_id: internChannel.id, user_id: u.id },
        defaults: {
          conversation_id: internChannel.id,
          user_id: u.id,
          role: u.id === hrUser.id ? 'ADMIN' : 'MEMBER',
          last_read_at: new Date(),
        },
      });
    }

    await ChatMessage.create({
      conversation_id: internChannel.id,
      sender_id: hrUser.id,
      message: '🎓 Welcome to the 2026 Internship Cohort Hub! Mentors will post guidance here.',
      message_type: 'TEXT',
    });

    await ChatMessage.create({
      conversation_id: internChannel.id,
      sender_id: hrUser.id,
      message: 'Standup update: Interns please share your daily task summary by 4:30 PM.',
      message_type: 'TEXT',
    });
  }

  console.log('✅ Chat channels seeded successfully.');
}

if (require.main === module) {
  seedChatData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Chat seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedChatData };
