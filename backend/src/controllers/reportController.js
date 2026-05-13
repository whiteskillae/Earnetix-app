const Report = require('../models/Report');

exports.submitReport = async (req, res) => {
  try {
    const { subject, description, type, deviceInfo } = req.body;

    // Check if user has already reported in the last 24 hours
    const lastReport = await Report.findOne({ 
      userId: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (lastReport) {
      return res.status(429).json({ 
        message: 'You have already submitted a report today. Please wait 24 hours.' 
      });
    }

    const report = new Report({
      userId: req.user._id,
      subject,
      description,
      type,
      deviceInfo
    });

    await report.save();

    res.status(201).json({ 
      success: true,
      message: 'Report submitted successfully. Our team will look into it shortly.',
      data: report 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('userId', 'name email mobileNumber country')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ success: true, message: 'Report updated', data: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
