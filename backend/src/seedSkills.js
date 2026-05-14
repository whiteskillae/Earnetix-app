const mongoose = require('mongoose');
const SkillCategory = require('./models/SkillCategory');
require('dotenv').config();

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

const seedSkills = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await SkillCategory.deleteMany({});
    await SkillCategory.insertMany(skillsData);

    console.log('Skills seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding skills:', error);
    process.exit(1);
  }
};

seedSkills();
