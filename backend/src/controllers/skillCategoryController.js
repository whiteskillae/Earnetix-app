const SkillCategory = require('../models/SkillCategory');
const User = require('../models/User');

const skillsData = [
  {
    name: "Development",
    skills: ["Coding / Programming", "Web Development", "App Development", "Software Designing", "Game Development", "Cloud Computing", "DevOps", "QA Testing", "Automation"]
  },
  {
    name: "Design & Creative",
    skills: ["UI/UX Design", "Graphic Designing", "Video Editing", "Motion Graphics", "Animation", "Photography", "Cinematography", "Video Production", "Architectural Design", "Interior Design", "Music Production", "Choreography"]
  },
  {
    name: "Writing & Content",
    skills: ["Content Writing", "Copywriting", "Blogging", "Script Writing", "Voice Over"]
  },
  {
    name: "Marketing",
    skills: ["SEO", "Digital Marketing", "Social Media Management", "Influencer Marketing", "Content Creator", "Branding", "E-commerce"]
  },
  {
    name: "Data & AI",
    skills: ["Data Analysis", "Business Analytics", "AI Prompt Engineering", "Machine Learning", "Artificial Intelligence", "Cyber Security", "Networking"]
  },
  {
    name: "Finance & Business",
    skills: ["Trading Knowledge", "Financial Market Knowledge", "Cryptocurrency", "HR Management", "Project Management", "Entrepreneurship", "Sales"]
  },
  {
    name: "Education & Support",
    skills: ["Public Speaking", "Teaching", "Coaching", "Fitness Coaching", "Customer Support", "Virtual Assistance", "Technical Support", "Research"]
  }
];

const getSkillCategories = async (req, res, next) => {
  try {
    let categories = await SkillCategory.find().sort({ name: 1 });
    if (!categories || categories.length === 0) {
      try {
        categories = await SkillCategory.insertMany(skillsData);
      } catch (seedError) {
        categories = skillsData;
      }
    }
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
