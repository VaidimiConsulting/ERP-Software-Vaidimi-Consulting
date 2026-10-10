# 🗄️ Database Backup & Hostinger Import Guide

Is folder me Vaidimi Consulting ERP Software ke MySQL database ki 2 files organized hain:

---

## 📁 Files Structure:

```text
database/
├── hostinger_import_tables_data.sql   <-- 🌟 HOSTINGER KE LIYE YE USE KAREIN
├── full_backup_company_management_db.sql
└── README.md
```

---

## 1. `hostinger_import_tables_data.sql` (🌟 Recommended for Hostinger)

### Kyun use karein?
Hostinger par jab aap database banate hain, toh database ka naam prefixed hota hai (jaise `u123456789_erp`).
Is file me koi `CREATE DATABASE` query nahi hai, isliye Hostinger phpMyAdmin me **bina kisi permission error** ke directly 1-click me import ho jati hai.

### Hostinger me Import karne ka Tarika:
1. Hostinger **hPanel** open karein.
2. Left menu me **Databases** > **MySQL Databases** par jayein.
3. Apna database banayein (agar pehle se bana hai toh theek hai).
4. Database ke aage **"Enter phpMyAdmin"** button par click karein.
5. Upar header menu me **"Import"** tab par click karein.
6. **"Choose File"** par click karein aur `hostinger_import_tables_data.sql` select karein.
7. Niche scroll karke **"Go" / "Import"** button daba dein.
8. ✅ Saare 13 Tables, Indexes, Triggers aur Data live database me aa jayenge.

---

## 2. `full_backup_company_management_db.sql` (Full Server Backup)

### Kyun use karein?
Is file me database create karne ki command (`CREATE DATABASE company_management_db; USE company_management_db;`) included hai.
Ise aap:
- Local computer me pura database restore karne ke liye
- Ya VPS (Ubuntu Linux) terminal me restore karne ke liye use kar sakte hain:
  ```bash
  mysql -u root -p < full_backup_company_management_db.sql
  ```

---

## 📊 Database Content Summary:
- **Total Tables:** 13 Normalized Relational Tables
  1. `users` (Admin, HR, Employee profiles with bcrypt hashes)
  2. `employees` (Staff records, designations, salaries)
  3. `departments` (IT, Operations, HR, Sales, etc.)
  4. `branches` (HQ Varanasi, Noida, Lucknow, Delhi)
  5. `attendances` (Clock in/out, break tracking, auto timers)
  6. `leave_types` (Annual, Sick, Casual, Menstrual, etc.)
  7. `leave_requests` (Approval workflow records)
  8. `leave_balances` (Employee annual leave allocations)
  9. `projects` & `project_members` & `project_milestones`
  10. `tasks` (Priority, assignees, deadlines)
  11. `payrolls` (Salary slips, allowances, deductions)
  12. `chat_conversations`, `chat_participants`, `chat_messages`
  13. `notifications`, `holidays`, `company_events`, `company_settings`
