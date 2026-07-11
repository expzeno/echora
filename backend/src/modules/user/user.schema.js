import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  role: z.enum(['admin', 'manager', 'staff', 'viewer']).optional(),
  displayName: z.string().max(100).optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(['admin', 'manager', 'staff', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  displayName: z.string().max(100).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' });
