import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255).optional(),
  username: z.string().max(255).optional(),
  password: z.string().min(1).max(128),
}).refine(d => d.email || d.username, { message: 'Email or username is required' });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
