// Replaced by Cloudinary — kept as stub to avoid import errors
export type ObjectAclPolicy = Record<string, unknown>;
export type ObjectAccessGroup = Record<string, unknown>;
export type ObjectAccessGroupType = string;
export type ObjectAclRule = Record<string, unknown>;
export const ObjectPermission = { READ: "read", WRITE: "write" } as const;
export type ObjectPermission = typeof ObjectPermission[keyof typeof ObjectPermission];
export const canAccessObject = async () => true;
export const getObjectAclPolicy = async () => null;
export const setObjectAclPolicy = async () => {};
