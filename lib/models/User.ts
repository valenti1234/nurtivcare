import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  password?: string;
  name: string;
  slug: string;
  role: string;
  image?: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: String,
  name: { type: String, required: true },
  slug: { type: String, required: true },
  role: { type: String, required: true },
  image: String,
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  // Generate slug from name if not provided or name changed
  if (this.isNew || this.isModified('name')) {
    if (!this.slug || this.isModified('name')) {
      let baseSlug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      
      // Ensure slug uniqueness
      while (await mongoose.models.User.findOne({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      this.slug = slug;
    }
  }
  
  // Hash password if modified
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ slug: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);