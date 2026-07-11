import { z } from 'zod';

export const createCustomerSchema = z.object({
  email: z.string().email().max(255),
  displayName: z.string().min(1).max(100),
  phoneNumber: z.string().max(20).optional(),
  password: z.string().min(6).max(128).optional(),
});

export const updateCustomerSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'At least one field required' });
