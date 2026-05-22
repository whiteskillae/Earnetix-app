const Analytics = require('../models/Analytics');

const getAnalytics = async (req, res, next) => {
  try {
    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStringLimit = thirtyDaysAgo.toISOString().split('T')[0];

    const dailyStats = await Analytics.find({ dateString: { $gte: dateStringLimit } })
      .sort({ dateString: 1 });

    // Aggregate totals
    let totalApiHits = 0;
    let totalPageViews = 0;
    let totalUniqueVisitors = 0;

    dailyStats.forEach(stat => {
      totalApiHits += stat.apiHits;
      totalPageViews += stat.pageViews;
      totalUniqueVisitors += stat.uniqueVisitors;
    });

    res.json({
      success: true,
      data: {
        totals: {
          apiHits: totalApiHits,
          pageViews: totalPageViews,
          uniqueVisitors: totalUniqueVisitors
        },
        timeSeries: dailyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
