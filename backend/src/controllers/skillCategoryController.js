const SkillCategory = require('../models/SkillCategory');
const User = require('../models/User');

const getSkillCategories = async (req, res, next) => {
  try {
    const categories = await SkillCategory.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const createSkillCategory = async (req, res, next) => {
  try {
    const { name, skills } = req.body;
    const category = await SkillCategory.create({ name, skills });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateSkillCategory = async (req, res, next) => {
  try {
    const category = await SkillCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const deleteSkillCategory = async (req, res, next) => {
  try {
    const category = await SkillCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

const getUsersBySkill = async (req, res, next) => {
  try {
    const { skill } = req.query;
    const query = skill ? { skills: skill, role: 'user' } : { role: 'user' };
    const users = await User.find(query).select('name email skills country');
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkillCategories,
  createSkillCategory,
  updateSkillCategory,
  deleteSkillCategory,
  getUsersBySkill
};
