const Announcement = require('../models/Announcement');

const getAnnouncements = async (req, res, next) => {
  try {
    let filter = { isActive: true };
    
    // If not admin, only show global (targetUsers is empty) OR those targeted at this specific user
    if (req.user.role !== 'admin') {
      filter.$or = [
        { targetUsers: { $size: 0 } },
        { targetUsers: { $exists: false } },
        { targetUsers: req.user._id }
      ];
    } else {
      // Admin sees everything
      filter = {};
    }

    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) { next(error); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, targetEmails, targetCountry, targetSkill } = req.body;
    
    // Parse targetEmails string from frontend and convert to user IDs
    let targetUsers = [];
    if (targetEmails && typeof targetEmails === 'string') {
      const emailList = targetEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
      if (emailList.length > 0) {
        const User = require('../models/User');
        const users = await User.find({ email: { $in: emailList } }).select('_id');
        targetUsers = users.map(u => u._id);
      }
    }

    // Filter by Country and/or Skill if provided
    if (targetCountry || targetSkill) {
      const User = require('../models/User');
      let query = { role: 'user' };
      if (targetCountry) query.country = targetCountry;
      if (targetSkill) query.skills = targetSkill;
      
      const filteredUsers = await User.find(query).select('_id');
      const filteredUserIds = filteredUsers.map(u => u._id);
      
      // Merge with existing targetUsers and make unique
      targetUsers = [...new Set([...targetUsers.map(id => id.toString()), ...filteredUserIds.map(id => id.toString())])];
    }

    const announcement = await Announcement.create({
      title, content, priority, targetUsers, createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) { next(error); }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) { next(error); }
};

const toggleAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
    announcement.isActive = !announcement.isActive;
    await announcement.save();
    res.json({ success: true, data: announcement });
  } catch (error) { next(error); }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement };
