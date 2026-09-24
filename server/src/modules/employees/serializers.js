import { RBAC_SCOPES } from '../../constants/scopes.js';

/**
 * Field-level security response serializer for Employee records
 * Omits confidential fields based on user role and scope
 */
export function serializeEmployee(employee, { isHrAdmin = false, isSelf = false } = {}) {
  if (!employee) return null;
  const doc = employee.toObject ? employee.toObject() : { ...employee };

  // If HR/Admin, allow full access
  if (isHrAdmin) {
    return doc;
  }

  // If self, allow personal fields but omit restricted internal HR notes
  if (isSelf) {
    delete doc.metadata;
    return doc;
  }

  // If manager or peer (TEAM or DEPARTMENT scope):
  // Omit private emergency contacts and sensitive personal data
  delete doc.dateOfBirth;
  delete doc.emergencyContact;
  delete doc.address;
  delete doc.metadata;

  return doc;
}
