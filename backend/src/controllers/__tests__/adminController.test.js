const { getAdminLogs } = require('../adminController');
const AdminLog = require('../../models/AdminLog');

jest.mock('../../models/AdminLog');

describe('Admin Controller - getAdminLogs', () => {
  let req, res, next;

  beforeEach(() => {
    req = { query: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should fetch admin logs successfully', async () => {
    const mockLogs = [{ _id: '1', action: 'approve' }];
    
    AdminLog.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockLogs)
    });
    AdminLog.countDocuments.mockResolvedValue(1);

    await getAdminLogs(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        logs: mockLogs,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 }
      }
    });
  });
});
