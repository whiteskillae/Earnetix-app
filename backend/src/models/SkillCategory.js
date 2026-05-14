const mongoose = require('mongoose');

const skillCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  skills: [{
    type: String,
    required: true,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('SkillCategory', skillCategorySchema);
