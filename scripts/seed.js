const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nurtiv';

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create demo organization
    const orgResult = await db.collection('organisations').findOneAndUpdate(
      { slug: 'nurtiv-demo-care' },
      {
        $setOnInsert: {
          name: 'Nurtiv Demo Care',
          slug: 'nurtiv-demo-care',
          timezone: 'UTC',
          plan: 'PROFESSIONAL',
          dataResidency: 'EU',
          maxSeats: 10,
          maxSttMinutes: 1000,
          createdAt: new Date(),
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    const orgSlug = orgResult.value.slug;
    console.log('Demo organization created/found:', orgSlug);
    
    // Hash password for demo accounts
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Create admin user
    const adminResult = await db.collection('users').findOneAndUpdate(
      { email: 'admin@nurtiv.com' },
      {
        $setOnInsert: {
          email: 'admin@nurtiv.com',
          password: hashedPassword,
          name: 'Admin User',
          slug: 'nurtiv-demo-care',
          role: 'ADMIN',
          createdAt: new Date(),
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    const adminId = adminResult.value._id;
    console.log('Admin user created/found:', adminId);
    
    // Create carer user
    const carerResult = await db.collection('users').findOneAndUpdate(
      { email: 'carer@nurtiv.com' },
      {
        $setOnInsert: {
          email: 'carer@nurtiv.com',
          password: hashedPassword,
          name: 'Carer User',
          slug: 'nurtiv-demo-care',
          role: 'CARER',
          createdAt: new Date(),
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    const carerId = carerResult.value._id;
    console.log('Carer user created/found:', carerId);
    
    // Create memberships
    await db.collection('memberships').findOneAndUpdate(
      { userId: adminId, slug: orgSlug },
      {
        $setOnInsert: {
          userId: adminId,
          slug: orgSlug,
          role: 'ADMIN',
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    
    await db.collection('memberships').findOneAndUpdate(
      { userId: carerId, slug: orgSlug },
      {
        $setOnInsert: {
          userId: carerId,
          slug: orgSlug,
          role: 'CARER',
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    
    // Create demo patients
    const patients = [
      {
        firstName: 'Margaret',
        lastName: 'Johnson',
        dob: new Date('1935-03-15'),
        carePlan: 'Daily medication support (morning: 2x blood pressure tablets, evening: 1x heart medication). Mobility assistance for stairs and bathroom. Weekly social engagement activities. Monitor for signs of confusion or falls.',
        keyInfo: {
          allergies: 'Penicillin',
          emergencyContact: 'Daughter - Sarah Johnson (07123 456789)',
          gp: 'Dr. Williams, Riverside Practice',
          conditions: ['Hypertension', 'Mild cognitive impairment']
        },
        slug: orgSlug,
        createdAt: new Date()
      },
      {
        firstName: 'Robert',
        lastName: 'Smith',
        dob: new Date('1942-08-22'),
        carePlan: 'Meal preparation assistance, medication reminders (diabetes management), light housekeeping. Weekly grocery shopping support.',
        keyInfo: {
          allergies: 'None known',
          emergencyContact: 'Son - Michael Smith (07987 654321)',
          gp: 'Dr. Patel, Community Health Centre',
          conditions: ['Type 2 Diabetes', 'Arthritis']
        },
        slug: orgSlug,
        createdAt: new Date()
      },
      {
        firstName: 'Eleanor',
        lastName: 'Wilson',
        dob: new Date('1938-11-05'),
        carePlan: 'Companionship visits, medication support, appointment transport. Social activities and emotional support.',
        keyInfo: {
          allergies: 'Aspirin',
          emergencyContact: 'Niece - Emma Wilson (07456 123789)',
          gp: 'Dr. Brown, Oakfield Surgery',
          conditions: ['Depression', 'Osteoporosis']
        },
        slug: orgSlug,
        createdAt: new Date()
      },
      {
        firstName: 'Frank',
        lastName: 'Davis',
        dob: new Date('1940-07-18'),
        carePlan: 'Personal care assistance, physiotherapy support, dietary monitoring. Mobility aid maintenance.',
        keyInfo: {
          allergies: 'Shellfish',
          emergencyContact: 'Wife - Mary Davis (07321 987654)',
          gp: 'Dr. Taylor, Greenwood Practice',
          conditions: ['Stroke recovery', 'High blood pressure']
        },
        slug: orgSlug,
        createdAt: new Date()
      }
    ];

    // Insert patients
    const patientResults = [];
    for (const patient of patients) {
      const result = await db.collection('patients').findOneAndUpdate(
        { firstName: patient.firstName, lastName: patient.lastName, slug: orgSlug },
        { $setOnInsert: patient },
        { upsert: true, returnDocument: 'after' }
      );
      patientResults.push(result.value);
    }
    
    console.log('Demo patients created:', patientResults.length);

    // Create demo notes for each patient
    const notesData = [
      {
        patientId: patientResults[0]._id, // Margaret
        notes: [
          {
            rawText: 'Margaret was in good spirits today. She took her morning medications without any issues. We had a nice chat about her garden and she showed me the flowers she\'s been tending to. She seemed steady on her feet but I noticed she was holding onto furniture more than usual when walking around the living room.',
            aiSummary: {
              observations: 'Patient in positive mood, medication compliance good, engaging socially about personal interests.',
              risks: 'Increased dependence on furniture for mobility support noted - potential fall risk.',
              actions: 'Consider physiotherapy assessment for mobility. Monitor balance during future visits.'
            },
            mood: 'happy',
            createdAt: new Date('2025-01-14T10:30:00Z'),
            authorName: 'Sarah Wilson'
          },
          {
            rawText: 'Today Margaret seemed a bit confused about what day it was. She asked me twice if I was the morning or afternoon carer. Her medications were laid out correctly though. She was quieter than usual and spent most of the time sitting in her chair looking out the window.',
            aiSummary: {
              observations: 'Temporal disorientation noted, repeated questions about schedule, reduced social interaction.',
              risks: 'Cognitive symptoms may be progressing - requires monitoring and possible GP consultation.',
              actions: 'Document confusion episodes, consider GP review, implement orientation aids like calendar.'
            },
            mood: 'anxious',
            createdAt: new Date('2025-01-13T14:15:00Z'),
            authorName: 'John Thompson'
          }
        ]
      },
      {
        patientId: patientResults[1]._id, // Robert
        notes: [
          {
            rawText: 'Robert had his blood sugar checked this morning - levels were within normal range. He prepared his own breakfast with minimal assistance. We discussed his meal plan for the week and he seems motivated to stick to his diabetic diet.',
            aiSummary: {
              observations: 'Good diabetes management, independent with meal preparation, positive attitude towards diet compliance.',
              risks: 'None identified during this visit.',
              actions: 'Continue current diabetes management plan, encourage independence.'
            },
            mood: 'content',
            createdAt: new Date('2025-01-14T14:30:00Z'),
            authorName: 'Lisa Chen'
          }
        ]
      },
      {
        patientId: patientResults[2]._id, // Eleanor
        notes: [
          {
            rawText: 'Eleanor seemed quite lonely today. She mentioned missing her late husband and feeling isolated. We spent extra time chatting and looking through old photo albums. Her mood improved significantly during our conversation.',
            aiSummary: {
              observations: 'Expressing feelings of loneliness and grief, responsive to social interaction and reminiscence.',
              risks: 'Social isolation may impact mental health and overall wellbeing.',
              actions: 'Increase social visit frequency, consider community activities or support groups.'
            },
            mood: 'sad',
            createdAt: new Date('2025-01-13T16:00:00Z'),
            authorName: 'David Miller'
          }
        ]
      },
      {
        patientId: patientResults[3]._id, // Frank
        notes: [
          {
            rawText: 'Frank completed his physiotherapy exercises today with good effort. His mobility has improved since starting the program. He was able to walk to the kitchen independently using his walking frame.',
            aiSummary: {
              observations: 'Good compliance with physiotherapy, improved mobility and independence.',
              risks: 'None identified, recovery progressing well.',
              actions: 'Continue current physiotherapy program, monitor progress.'
            },
            mood: 'determined',
            createdAt: new Date('2025-01-13T11:00:00Z'),
            authorName: 'Rachel Green'
          }
        ]
      }
    ];

    // Insert notes
    let totalNotes = 0;
    for (const patientNotes of notesData) {
      for (const note of patientNotes.notes) {
        await db.collection('notes').findOneAndUpdate(
          { 
            patientId: patientNotes.patientId,
            rawText: note.rawText,
            slug: orgSlug
          },
          {
            $setOnInsert: {
              ...note,
              patientId: patientNotes.patientId,
              slug: orgSlug,
              userId: carerId
            }
          },
          { upsert: true }
        );
        totalNotes++;
      }
    }
    
    console.log('Demo notes created:', totalNotes);
    console.log('Demo accounts seeded successfully!');
    console.log('Admin: admin@nurtiv.com / demo123');
    console.log('Carer: carer@nurtiv.com / demo123');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();