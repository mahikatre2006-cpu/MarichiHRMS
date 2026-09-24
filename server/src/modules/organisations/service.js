import { Organisation } from './model.js';
import { Entity } from '../entities/model.js';
import { Department } from '../departments/model.js';
import { Location } from '../locations/model.js';
import { Role } from '../roles/model.js';
import { ShiftTemplate } from '../attendance/shift.model.js';
import { LeaveType } from '../leave/type.model.js';
import { LeavePolicy } from '../leave/policy.model.js';
import { DEFAULT_ROLE_DEFINITIONS } from '../../constants/roles.js';
import { LEAVE_CATEGORY } from '../../constants/enums.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export class OrganisationService {
  static async getById(id) {
    const org = await Organisation.findById(id);
    if (!org) {
      throw new NotFoundError('Organisation');
    }
    return org;
  }

  static async create(data) {
    const existing = await Organisation.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Organisation with code '${data.code}' already exists.`);
    }
    return Organisation.create({
      ...data,
      code: data.code.toUpperCase()
    });
  }

  static async update(id, data) {
    const org = await Organisation.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!org) {
      throw new NotFoundError('Organisation');
    }
    return org;
  }

  static async list() {
    return Organisation.find().sort({ createdAt: -1 });
  }

  /**
   * Enterprise Auto-Bootstrap: Initializes roles, legal entity, department, location,
   * standard shifts, and leave policies for a new or uninitialized organisation.
   */
  static async bootstrapOrganisation(tenantId) {
    const org = await Organisation.findById(tenantId);
    if (!org) {
      throw new NotFoundError('Organisation');
    }

    // 1. Initialize Standard Roles from DEFAULT_ROLE_DEFINITIONS
    const roles = {};
    for (const [roleName, roleDef] of Object.entries(DEFAULT_ROLE_DEFINITIONS)) {
      let role = await Role.findOne({ tenantId, name: roleName });
      if (!role) {
        role = await Role.create({
          tenantId,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          permissions: roleDef.permissions
        });
      }
      roles[roleName] = role;
    }

    // 2. Primary Legal Entity
    let entity = await Entity.findOne({ tenantId });
    if (!entity) {
      entity = await Entity.create({
        tenantId,
        organisationId: tenantId,
        name: `${org.name} Operations`,
        code: `${org.code}-OPS`.slice(0, 10),
        country: 'IND',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE'
      });
    }

    // 3. Default Department
    let department = await Department.findOne({ tenantId, entityId: entity._id });
    if (!department) {
      department = await Department.create({
        tenantId,
        entityId: entity._id,
        name: 'Executive Management',
        code: 'EXEC'
      });
    }

    // 4. Default Location
    let location = await Location.findOne({ tenantId, entityId: entity._id });
    if (!location) {
      location = await Location.create({
        tenantId,
        entityId: entity._id,
        name: 'Headquarters',
        code: 'HQ',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        timezone: 'Asia/Kolkata'
      });
    }

    // 5. Default Shift Template (Mon - Fri, 09:00 - 18:00)
    let shift = await ShiftTemplate.findOne({ tenantId, entityId: entity._id });
    if (!shift) {
      shift = await ShiftTemplate.create({
        tenantId,
        entityId: entity._id,
        name: 'Standard Operational Shift',
        code: 'STD-OPS',
        shiftType: 'FIXED',
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        lateGraceMinutes: 15,
        earlyExitGraceMinutes: 15,
        halfDayThresholdMinutes: 240,
        fullDayThresholdMinutes: 480,
        workingDays: [1, 2, 3, 4, 5],
        isActive: true
      });
    }

    // 6. Standard Leave Types & Policies
    const defaultTypes = [
      { name: 'Casual Leave', code: 'CL', category: LEAVE_CATEGORY.CASUAL, entitlement: 12 },
      { name: 'Sick Leave', code: 'SL', category: LEAVE_CATEGORY.SICK, entitlement: 10 },
      { name: 'Privilege Leave', code: 'PL', category: LEAVE_CATEGORY.ANNUAL, entitlement: 15 },
      { name: 'Loss of Pay', code: 'LWP', category: LEAVE_CATEGORY.UNPAID, entitlement: 0, isPaid: false }
    ];

    for (const dt of defaultTypes) {
      let lt = await LeaveType.findOne({ tenantId, code: dt.code });
      if (!lt) {
        lt = await LeaveType.create({
          tenantId,
          name: dt.name,
          code: dt.code,
          category: dt.category,
          isPaid: dt.isPaid !== false,
          supportsHalfDay: true
        });
      }
      if (dt.entitlement > 0) {
        let policy = await LeavePolicy.findOne({ tenantId, entityId: entity._id, leaveTypeId: lt._id });
        if (!policy) {
          await LeavePolicy.create({
            tenantId,
            entityId: entity._id,
            leaveTypeId: lt._id,
            accrualModel: 'MONTHLY_PRO_RATA',
            annualEntitlement: dt.entitlement,
            maxCarryForwardDays: 5,
            isActive: true
          });
        }
      }
    }

    return { org, entity, department, location, roles, shift };
  }
}
