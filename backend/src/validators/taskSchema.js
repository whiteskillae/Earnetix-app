const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  rewardPoints: z.coerce.number().int().min(1).max(10000),
  submissionConfig: z.object({
    inputType: z.enum(['text', 'image', 'file', 'link', 'text_link', 'text_image', 'text_file', 'image_file', 'multiple_files', 'custom', 'all']).optional(),
    allowedExtensions: z.array(z.string()).optional(),
    maxFileSize: z.coerce.number().int().min(1).max(50 * 1024 * 1024).optional(),
    customFields: z.array(z.object({
      label: z.string(),
      fieldType: z.enum(['text', 'textarea', 'file', 'image', 'url']),
      placeholder: z.string().optional(),
      required: z.boolean().optional()
    })).optional()
  }).optional(),
  maxSubmissionsPerUser: z.coerce.number().int().min(1).max(20).optional(),
  taskType: z.string().optional(),
});




const updateTaskSchema = createTaskSchema.partial().extend({
  isActive: z.boolean().optional(),
});

module.exports = { createTaskSchema, updateTaskSchema };
