const Announcement = require('../models/Announcement');

const getAnnouncements = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) { next(error); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority } = req.body;
    const announcement = await Announcement.create({
      title, content, priority, createdBy: req.user._id
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
