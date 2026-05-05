const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  rewardPoints: z.number().int().min(1).max(10000),
  inputType: z.enum(['text', 'image', 'both']),
  allowedExtensions: z.array(z.string()).optional(),
  maxFileSize: z.number().int().min(1).max(10 * 1024 * 1024).optional(),
  maxSubmissionsPerUser: z.number().int().min(1).max(10).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  isActive: z.boolean().optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
