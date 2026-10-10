const { Holiday, CompanyEvent, Employee } = require('../models');
const { testConnection } = require('../config/db');

async function seedCorporateCalendar() {
  console.log('--- Seeding Corporate Office Holidays and Events ---');
  const dbStatus = await testConnection();
  if (!dbStatus.connected) {
    console.error('Database connection failed:', dbStatus.error);
    process.exit(1);
  }

  // 1. Corporate Office Holidays for 2026
  const corporateHolidays = [
    { name: "New Year's Day", date: '2026-01-01', is_paid: true, applicable_to: 'ALL', description: 'Global New Year Corporate Holiday', year: 2026 },
    { name: 'Republic Day', date: '2026-01-26', is_paid: true, applicable_to: 'ALL', description: 'National Republic Day Celebration', year: 2026 },
    { name: 'Maha Shivratri', date: '2026-02-15', is_paid: true, applicable_to: 'ALL', description: 'Festival of Lord Shiva', year: 2026 },
    { name: 'Holi (Festival of Colors)', date: '2026-03-04', is_paid: true, applicable_to: 'ALL', description: 'Spring Festival Celebration', year: 2026 },
    { name: 'Eid-ul-Fitr', date: '2026-03-20', is_paid: true, applicable_to: 'ALL', description: 'Islamic Festival of Celebration', year: 2026 },
    { name: 'Good Friday', date: '2026-04-03', is_paid: true, applicable_to: 'ALL', description: 'Christian Observance Day', year: 2026 },
    { name: 'Independence Day', date: '2026-08-15', is_paid: true, applicable_to: 'ALL', description: 'National Independence Day Observance', year: 2026 },
    { name: 'Raksha Bandhan', date: '2026-08-28', is_paid: true, applicable_to: 'ALL', description: 'Festival of Sibling Bonds', year: 2026 },
    { name: 'Janmashtami', date: '2026-09-04', is_paid: true, applicable_to: 'ALL', description: 'Lord Krishna Janmotsav', year: 2026 },
    { name: 'Gandhi Jayanti', date: '2026-10-02', is_paid: true, applicable_to: 'ALL', description: 'Father of the Nation Birthday', year: 2026 },
    { name: 'Dussehra (Vijayadashami)', date: '2026-10-20', is_paid: true, applicable_to: 'ALL', description: 'Triumph of Light over Darkness', year: 2026 },
    { name: 'Diwali (Deepavali)', date: '2026-11-08', is_paid: true, applicable_to: 'ALL', description: 'Corporate Festival of Lights Celebration', year: 2026 },
    { name: 'Govardhan Puja', date: '2026-11-09', is_paid: true, applicable_to: 'ALL', description: 'Post-Diwali Festivity', year: 2026 },
    { name: 'Guru Nanak Jayanti', date: '2026-11-24', is_paid: true, applicable_to: 'ALL', description: 'Sikh Guru Observance Day', year: 2026 },
    { name: 'Christmas Day', date: '2026-12-25', is_paid: true, applicable_to: 'ALL', description: 'Corporate Winter Christmas Holiday', year: 2026 },
  ];

  let addedHolidays = 0;
  for (const h of corporateHolidays) {
    const [item, created] = await Holiday.findOrCreate({
      where: { name: h.name, date: h.date },
      defaults: h,
    });
    if (created) addedHolidays++;
  }
  console.log(`✅ Seeded ${addedHolidays} Corporate Holidays into database.`);

  // 2. Corporate Office Events
  const adminEmp = await Employee.findOne({ where: { employee_code: 'EMP-001' } });
  const adminId = adminEmp ? adminEmp.id : null;

  const corporateEvents = [
    {
      title: 'Corporate Q3 Strategic Business Review & All-Hands',
      description: 'Review of enterprise portfolio performance, client achievements, and Q4 organizational roadmaps.',
      event_type: 'MEETING',
      start_date: new Date('2026-09-22T10:00:00'),
      end_date: new Date('2026-09-22T13:00:00'),
      is_all_day: false,
      location: 'Corporate HQ Main Boardroom & Virtual Stream',
      created_by: adminId,
    },
    {
      title: 'Corporate Innovation & Cloud Architecture Workshop',
      description: 'Hands-on technical upskilling on microservices scalability and security compliance.',
      event_type: 'TRAINING',
      start_date: new Date('2026-09-28T14:00:00'),
      end_date: new Date('2026-09-28T17:30:00'),
      is_all_day: false,
      location: 'Tech Training Lab A, Corporate Office',
      created_by: adminId,
    },
    {
      title: 'Corporate Townhall & Monthly Star Performer Awards',
      description: 'Monthly recognition of outstanding contributors across Engineering, HR, and Operations.',
      event_type: 'ANNOUNCEMENT',
      start_date: new Date('2026-09-30T16:00:00'),
      end_date: new Date('2026-09-30T18:00:00'),
      is_all_day: false,
      location: 'Corporate Office Amphitheater',
      created_by: adminId,
    },
    {
      title: 'Vaidimi Client Showcase & Networking Gala',
      description: 'Hosting key strategic enterprise partners and executive stakeholders.',
      event_type: 'EVENT',
      start_date: new Date('2026-10-14T17:00:00'),
      end_date: new Date('2026-10-14T21:00:00'),
      is_all_day: false,
      location: 'Taj Corporate Banquet Hall',
      created_by: adminId,
    },
    {
      title: 'Corporate Annual Gala & Vaidimi Excellence Awards 2026',
      description: 'Annual corporate celebration honoring company growth, team milestones, and leadership success.',
      event_type: 'EVENT',
      start_date: new Date('2026-12-18T18:00:00'),
      end_date: new Date('2026-12-18T23:00:00'),
      is_all_day: false,
      location: 'Grand Ballroom, Corporate Convention Center',
      created_by: adminId,
    },
  ];

  let addedEvents = 0;
  for (const ev of corporateEvents) {
    const [item, created] = await CompanyEvent.findOrCreate({
      where: { title: ev.title },
      defaults: ev,
    });
    if (created) addedEvents++;
  }
  console.log(`✅ Seeded ${addedEvents} Corporate Office Events into database.`);
  console.log('--- Corporate Calendar Seed Complete ---');
}

seedCorporateCalendar()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error seeding corporate calendar:', err);
    process.exit(1);
  });
