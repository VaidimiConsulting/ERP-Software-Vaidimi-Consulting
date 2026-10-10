const { sequelize } = require('../config/db');
const User = require('./User');
const Employee = require('./Employee');
const Department = require('./Department');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const ProjectMilestone = require('./ProjectMilestone');
const Task = require('./Task');
const Attendance = require('./Attendance');
const LeaveType = require('./LeaveType');
const LeaveBalance = require('./LeaveBalance');
const LeaveRequest = require('./LeaveRequest');
const Holiday = require('./Holiday');
const CompanyEvent = require('./CompanyEvent');
const Notification = require('./Notification');
const CompanySetting = require('./CompanySetting');
const Payroll = require('./Payroll');
const Branch = require('./Branch');

// Relationships

// User <-> Employee (1:1)
User.hasOne(Employee, {
  foreignKey: 'user_id',
  as: 'employeeProfile',
  onDelete: 'CASCADE',
});
Employee.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Department <-> Employee (1:N)
Department.hasMany(Employee, {
  foreignKey: 'department_id',
  as: 'employees',
  onDelete: 'SET NULL',
});
Employee.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department',
});

// Branch <-> Employee (1:N)
Branch.hasMany(Employee, {
  foreignKey: 'branch_id',
  as: 'employees',
  onDelete: 'SET NULL',
});
Employee.belongsTo(Branch, {
  foreignKey: 'branch_id',
  as: 'branch',
});

// Branch <-> Project (1:N)
Branch.hasMany(Project, {
  foreignKey: 'branch_id',
  as: 'projects',
  onDelete: 'SET NULL',
});
Project.belongsTo(Branch, {
  foreignKey: 'branch_id',
  as: 'branch',
});

// Branch <-> Branch Head (Employee)
Branch.belongsTo(Employee, {
  foreignKey: 'branch_head_id',
  as: 'branchHead',
});

// Reporting Manager (Self-reference)
Employee.belongsTo(Employee, {
  foreignKey: 'reporting_manager_id',
  as: 'reportingManager',
});

// Intern Mentor (Self-reference)
Employee.belongsTo(Employee, {
  foreignKey: 'mentor_id',
  as: 'mentor',
});

// Project <-> Project Manager (Employee)
Project.belongsTo(Employee, {
  foreignKey: 'project_manager_id',
  as: 'manager',
});
Employee.hasMany(Project, {
  foreignKey: 'project_manager_id',
  as: 'managedProjects',
});

// Project <-> Employee (Many-to-Many via ProjectMember)
Project.belongsToMany(Employee, {
  through: ProjectMember,
  foreignKey: 'project_id',
  otherKey: 'employee_id',
  as: 'members',
});
Employee.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: 'employee_id',
  otherKey: 'project_id',
  as: 'assignedProjects',
});

// Direct ProjectMember associations for detailed queries
Project.hasMany(ProjectMember, {
  foreignKey: 'project_id',
  as: 'projectMembers',
  onDelete: 'CASCADE',
});
ProjectMember.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});
ProjectMember.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});

// Project <-> ProjectMilestone (1:N)
Project.hasMany(ProjectMilestone, {
  foreignKey: 'project_id',
  as: 'milestones',
  onDelete: 'CASCADE',
});
ProjectMilestone.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

// Project <-> Task (1:N)
Project.hasMany(Task, {
  foreignKey: 'project_id',
  as: 'tasks',
  onDelete: 'CASCADE',
});
Task.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

// Task <-> Assignee (Employee)
Task.belongsTo(Employee, {
  foreignKey: 'assigned_to',
  as: 'assignee',
});
Employee.hasMany(Task, {
  foreignKey: 'assigned_to',
  as: 'assignedTasks',
});

// Attendance <-> Employee
Attendance.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});
Employee.hasMany(Attendance, {
  foreignKey: 'employee_id',
  as: 'attendances',
});

// LeaveBalance <-> Employee
LeaveBalance.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});
Employee.hasMany(LeaveBalance, {
  foreignKey: 'employee_id',
  as: 'leaveBalances',
});

// LeaveRequest <-> Employee (Applicant & Reviewer)
LeaveRequest.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});
Employee.hasMany(LeaveRequest, {
  foreignKey: 'employee_id',
  as: 'leaveRequests',
});
LeaveRequest.belongsTo(Employee, {
  foreignKey: 'reviewed_by',
  as: 'reviewer',
});

// CompanyEvent <-> Employee (Creator)
CompanyEvent.belongsTo(Employee, {
  foreignKey: 'created_by',
  as: 'creator',
});

// User <-> Notification
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Employee <-> Payroll (1:N)
Employee.hasMany(Payroll, {
  foreignKey: 'employee_id',
  as: 'payrolls',
  onDelete: 'CASCADE',
});
Payroll.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee',
});
const ChatConversation = require('./ChatConversation');
const ChatParticipant = require('./ChatParticipant');
const ChatMessage = require('./ChatMessage');

// Chat Associations
ChatConversation.hasMany(ChatParticipant, {
  foreignKey: 'conversation_id',
  as: 'participants',
  onDelete: 'CASCADE',
});
ChatParticipant.belongsTo(ChatConversation, {
  foreignKey: 'conversation_id',
  as: 'conversation',
});
ChatParticipant.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(ChatParticipant, {
  foreignKey: 'user_id',
  as: 'chatParticipations',
});

ChatConversation.hasMany(ChatMessage, {
  foreignKey: 'conversation_id',
  as: 'messages',
  onDelete: 'CASCADE',
});
ChatMessage.belongsTo(ChatConversation, {
  foreignKey: 'conversation_id',
  as: 'conversation',
});
ChatMessage.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender',
});
ChatConversation.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});
ChatConversation.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project',
});

module.exports = {
  sequelize,
  User,
  Employee,
  Department,
  Project,
  ProjectMember,
  ProjectMilestone,
  Task,
  Attendance,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  Holiday,
  CompanyEvent,
  Notification,
  CompanySetting,
  Payroll,
  Branch,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
};
