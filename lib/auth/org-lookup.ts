import mongoose from 'mongoose';
import connectDB from '../mongodb';
import Organisation from '../models/Organisation';

// Simple organization lookup to avoid circular dependencies
export async function findOrgBySlug(slug: string): Promise<string | null> {
  await connectDB();
  
  const organisation = await Organisation.findOne({ slug });
  return organisation ? organisation._id.toString() : null;
}