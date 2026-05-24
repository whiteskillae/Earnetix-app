const { createAnnouncement } = require('../announcementController');
const Announcement = require('../../models/Announcement');
const User = require('../../models/User');

jest.mock('../../models/Announcement');
jest.mock('../../models/User');

describe('Announcement Controller - createAnnouncement (Country/Skill Targeting)', () => {
  let req, res, next;

  beforeEach(() => {
    req = { 
      body: {},
      user: { _id: 'admin_123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should filter users by country and skill and merge targetUsers', async () => {
    req.body = {
      title: 'Targeted Broadcast',
      content: 'Hello India and Devs',
      priority: 'high',
      targetEmails: 'test@test.com',
      targetCountry: 'IN',
      targetSkill: 'developer'
    };

    User.find.mockImplementation((query) => {
      return {
        select: jest.fn().mockResolvedValue(
          query.email ? [{ _id: 'email_user_id' }] : [{ _id: 'filtered_user_id' }]
        )
      };
    });

    Announcement.create.mockResolvedValue({ _id: 'announcement_1' });

    await createAnnouncement(req, res, next);

    expect(User.find).toHaveBeenCalledTimes(2); // Once for emails, once for filter
    expect(User.find).toHaveBeenCalledWith({ email: { $in: ['test@test.com'] } });
    expect(User.find).toHaveBeenCalledWith({ role: 'user', country: 'IN', skills: 'developer' });
    
    expect(Announcement.create).toHaveBeenCalledWith({
      title: 'Targeted Broadcast',
      content: 'Hello India and Devs',
      priority: 'high',
      targetUsers: ['email_user_id', 'filtered_user_id'],
      createdBy: 'admin_123'
    });

    expect(res.status).toHaveBeenCalledWith(201);
  });
});
