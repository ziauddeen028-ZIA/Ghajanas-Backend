import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
    directUrl: process.env.DIRECT_URL || '',
  },
  adminEmails: (process.env.ADMIN_EMAILS || 'admin@ghajanas.com,owner@ghajanas.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  ownerPhoneNumber: process.env.OWNER_PHONE_NUMBER || '916382240715',
};

