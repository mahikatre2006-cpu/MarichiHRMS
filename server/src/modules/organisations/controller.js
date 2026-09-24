import { OrganisationService } from './service.js';
import { sendSuccess } from '../../utils/response.js';

export class OrganisationController {
  static async getById(req, res, next) {
    try {
      const org = await OrganisationService.getById(req.params.id);
      return sendSuccess(res, org, 'Organisation retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const org = await OrganisationService.update(req.params.id, req.body);
      return sendSuccess(res, org, 'Organisation updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async list(req, res, next) {
    try {
      const orgs = await OrganisationService.list();
      return sendSuccess(res, orgs, 'Organisations retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const org = await OrganisationService.create({
        ...req.body,
        createdBy: req.user?._id
      });
      return sendSuccess(res, org, 'Organisation created successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}
