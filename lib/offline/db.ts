import Dexie, { Table } from 'dexie';

export interface OfflinePatient {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  dob: string;
  carePlan: string;
  lastSynced: Date;
}

export interface OfflineNote {
  id: string;
  slug: string;
  patientId: string;
  rawText: string;
  mood: string;
  audioBlob?: Blob;
  synced: boolean;
  createdAt: Date;
}

export interface OfflineAction {
  id: string;
  slug: string;
  patientId: string;
  text: string;
  status: 'pending' | 'done';
  synced: boolean;
  createdAt: Date;
}

export interface SyncJob {
  id: string;
  type: 'note' | 'action' | 'audio';
  payload: any;
  retries: number;
  createdAt: Date;
}

class NurtivDB extends Dexie {
  patients!: Table<OfflinePatient>;
  notes!: Table<OfflineNote>;
  actions!: Table<OfflineAction>;
  syncQueue!: Table<SyncJob>;

  constructor() {
    super('NurtivDB');
    this.version(1).stores({
      patients: 'id, slug, lastName, lastSynced',
      notes: 'id, slug, patientId, synced, createdAt',
      actions: 'id, slug, patientId, status, synced, createdAt',
      syncQueue: 'id, type, retries, createdAt'
    });
  }
}

export const db = new NurtivDB();

export async function addToSyncQueue(type: SyncJob['type'], payload: any) {
  const job: SyncJob = {
    id: crypto.randomUUID(),
    type,
    payload,
    retries: 0,
    createdAt: new Date()
  };
  
  await db.syncQueue.add(job);
  return job.id;
}

export async function processSyncQueue() {
  const jobs = await db.syncQueue.orderBy('createdAt').limit(10).toArray();
  
  for (const job of jobs) {
    try {
      await processJob(job);
      await db.syncQueue.delete(job.id);
    } catch (error) {
      console.error('Sync job failed:', error);
      
      if (job.retries < 3) {
        await db.syncQueue.update(job.id, { retries: job.retries + 1 });
      } else {
        await db.syncQueue.delete(job.id);
      }
    }
  }
}

async function processJob(job: SyncJob) {
  const { type, payload } = job;
  
  switch (type) {
    case 'note':
      await fetch(`/api/org/${payload.slug}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      break;
      
    case 'action':
      await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      break;
      
    case 'audio':
      const formData = new FormData();
      formData.append('audio', payload.blob);
      formData.append('noteId', payload.noteId);
      
      await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      });
      break;
  }
}