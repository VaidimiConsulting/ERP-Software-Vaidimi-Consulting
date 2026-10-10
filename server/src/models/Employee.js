const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const { EMPLOYMENT_TYPES, EMPLOYEE_STATUS } = require('../config/constants');

class Employee extends Model {
  // Virtual helper for full name
  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}

Employee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    employee_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Employee code must be unique.',
      },
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'First name is required.' },
      },
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Last name is required.' },
      },
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: {
        msg: 'Employee email must be unique.',
      },
      validate: {
        isEmail: { msg: 'Please provide a valid email.' },
      },
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    profile_photo: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
      allowNull: true,
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Associate',
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    employment_type: {
      type: DataTypes.ENUM(EMPLOYMENT_TYPES.EMPLOYEE, EMPLOYMENT_TYPES.INTERN),
      allowNull: false,
      defaultValue: EMPLOYMENT_TYPES.EMPLOYEE,
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    internship_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    internship_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reporting_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        EMPLOYEE_STATUS.ACTIVE,
        EMPLOYEE_STATUS.ON_LEAVE,
        EMPLOYEE_STATUS.INACTIVE,
        EMPLOYEE_STATUS.RESIGNED,
        EMPLOYEE_STATUS.COMPLETED_INTERNSHIP
      ),
      allowNull: false,
      defaultValue: EMPLOYEE_STATUS.ACTIVE,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emergency_contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    college: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    course: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    highest_qualification: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    education_field: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    passing_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    percentage_cgpa: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    education_details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mentor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    base_salary: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 30000.00,
      allowNull: false,
    },
    father_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    mother_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    blood_group: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    aadhar_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    permanent_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    religion: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    marital_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Health & Medical Details
    medical_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergies: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    insurance_policy_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    insurance_provider: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    emergency_doctor_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    emergency_doctor_phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    health_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'FIT_FOR_DUTY',
    },
  },
  {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Employee;
