import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Role, RolePermission, PERMISSION_CONFIG, PermissionKey, User, Feature } from '../../types';
import * as api from '../../services/api';
import Modal from '../../components/ui/Modal';
import { ICONS } from '../../constants';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';

const permissionTypes = ['view', 'create', 'update', 'delete'] as const;
type PermissionType = typeof permissionTypes[number];

// A reusable component for the permissions table
const PermissionsTable: React.FC<{
    permissions: RolePermission;
    onPermissionChange: (key: PermissionKey, checked: boolean) => void;
    featureFilter?: string;
    disabled?: boolean;
}> = ({ permissions, onPermissionChange, featureFilter = '', disabled = false }) => {

    const handleCheckboxChange = (baseKey: string, permType: PermissionType, isChecked: boolean) => {
        const key = `${baseKey}.${permType}` as PermissionKey;
        onPermissionChange(key, isChecked);
    };

    return (
        <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto border rounded-lg hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Feature / Component</th>
                            {permissionTypes.map(p => (
                                <th key={p} className="px-6 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider capitalize">{p}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {Object.entries(PERMISSION_CONFIG)
                            .filter(([featureKey]) => !featureFilter || featureKey === featureFilter)
                            .map(([featureKey, featureConfig]) => (
                                <React.Fragment key={featureKey}>
                                    <tr className="bg-secondary-light">
                                        <th colSpan={5} className="px-4 py-2 text-left text-sm font-semibold text-secondary-dark">{featureConfig.label}</th>
                                    </tr>
                                    {Object.entries(featureConfig.functionalities).map(([funcKey, funcConfig]) => {
                                        const baseKey = `${featureKey}.${funcKey}`;
                                        return (
                                            <tr key={baseKey} className="divide-x divide-gray-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-dark">{funcConfig.label}</div>
                                                    {funcConfig.description && <div className="text-xs text-muted">{funcConfig.description}</div>}
                                                </td>
                                                {permissionTypes.map(pType => (
                                                    <td key={pType} className="px-6 py-4 text-center">
                                                        {funcConfig.permissions.includes(pType) ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={permissions[`${baseKey}.${pType}` as PermissionKey] || false}
                                                                onChange={(e) => handleCheckboxChange(baseKey, pType, e.target.checked)}
                                                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                                                                disabled={disabled}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {Object.entries(PERMISSION_CONFIG)
                    .filter(([featureKey]) => !featureFilter || featureKey === featureFilter)
                    .map(([featureKey, featureConfig]) => (
                        <Card key={featureKey} className="!p-4">
                            <h3 className="text-lg font-semibold text-on-surface mb-2">{featureConfig.label}</h3>
                            <div className="space-y-3">
                                {Object.entries(featureConfig.functionalities).map(([funcKey, funcConfig]) => {
                                    const baseKey = `${featureKey}.${funcKey}`;
                                    return (
                                        <div key={baseKey} className="py-2 border-b border-border-color last:border-b-0">
                                            <p className="font-medium text-dark">{funcConfig.label}</p>
                                            {funcConfig.description && <p className="text-xs text-muted mb-2">{funcConfig.description}</p>}
                                            <div className="flex items-center gap-x-6 gap-y-2 flex-wrap">
                                                {permissionTypes.map(pType => (
                                                    funcConfig.permissions.includes(pType) ? (
                                                        <label key={pType} className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={permissions[`${baseKey}.${pType}` as PermissionKey] || false}
                                                                onChange={(e) => handleCheckboxChange(baseKey, pType, e.target.checked)}
                                                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                                                                disabled={disabled}
                                                            />
                                                            <span className="capitalize">{pType}</span>
                                                        </label>
                                                    ) : null
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    ))}
            </div>
        </>
    );
};


const RolesList: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState({ page: true, action: false });
    const [error, setError] = useState<string | null>(null);

    // State for the main page editor
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [roleInEdit, setRoleInEdit] = useState<Role | null>(null);
    const [featureFilter, setFeatureFilter] = useState('');

    // State for the "Create Role" modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoleState, setNewRoleState] = useState<{ name: string; permissions: RolePermission }>({ name: '', permissions: {} });

    // State for the "Delete Role" modal
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; role: Role | null; userCount: number }>({ isOpen: false, role: null, userCount: 0 });

    const { user } = useAuth();

    const originalSelectedRole = useMemo(() => {
        return roles.find(r => r.id === selectedRoleId);
    }, [roles, selectedRoleId]);

    const hasChanges = useMemo(() => {
        if (!roleInEdit || !originalSelectedRole) return false;
        return JSON.stringify(roleInEdit.permissions) !== JSON.stringify(originalSelectedRole.permissions);
    }, [roleInEdit, originalSelectedRole]);


    const loadData = useCallback(async () => {
        setLoading(prev => ({ ...prev, page: true }));
        try {
            const [rolesData, usersData] = await Promise.all([
                api.fetchRoles(),
                api.fetchUsers()
            ]);
            setRoles(rolesData);
            setUsers(usersData);
            if (rolesData.length > 0) {
                const currentRoleExists = rolesData.some(r => r.id === selectedRoleId);
                if (!selectedRoleId || !currentRoleExists) {
                    setSelectedRoleId(rolesData[0].id);
                }
            } else {
                setSelectedRoleId(null);
            }
        } catch (err) {
            setError("Failed to load roles and users.");
        } finally {
            setLoading(prev => ({ ...prev, page: false }));
        }
    }, [selectedRoleId]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const role = roles.find(r => r.id === selectedRoleId);
        setRoleInEdit(role ? JSON.parse(JSON.stringify(role)) : null);
    }, [selectedRoleId, roles]);

    const handleResetChanges = () => {
        const role = roles.find(r => r.id === selectedRoleId);
        if (role) {
            setRoleInEdit(JSON.parse(JSON.stringify(role)));
        }
    };

    const handlePermissionChange = (key: PermissionKey, checked: boolean) => {
        if (!roleInEdit) return;

        setRoleInEdit(prev => {
            if (!prev) return null;
            const newPermissions = { ...prev.permissions };
            const [feature, func, action] = key.split('.');
            const baseKey = `${feature}.${func}`;

            // Set the changed permission
            newPermissions[key] = checked;

            if (checked && action !== 'view') {
                // If checking create/update/delete, ensure view is also checked
                newPermissions[`${baseKey}.view` as PermissionKey] = true;
            } else if (!checked && action === 'view') {
                // If unchecking view, uncheck all others for that functionality
                newPermissions[`${baseKey}.create` as PermissionKey] = false;
                newPermissions[`${baseKey}.update` as PermissionKey] = false;
                newPermissions[`${baseKey}.delete` as PermissionKey] = false;
            }

            return { ...prev, permissions: newPermissions };
        });
    };

    const handleUpdateRole = async () => {
        if (!user || !roleInEdit) return;
        setLoading(prev => ({ ...prev, action: true }));
        try {
            await api.updateRole(roleInEdit, user);
            await loadData();
        } catch (err) {
            setError("Failed to save changes.");
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleOpenDeleteDialog = () => {
        if (!roleInEdit) return;
        if (roleInEdit.name === 'Admin') {
            alert('The Admin role cannot be deleted.');
            return;
        }
        const userCount = users.filter(u => u.roleId === roleInEdit.id).length;
        setDeleteDialog({ isOpen: true, role: roleInEdit, userCount });
    };

    const handleConfirmDelete = async () => {
        if (!user || !deleteDialog.role) return;

        setLoading(prev => ({ ...prev, action: true }));
        try {
            await api.deleteRole(deleteDialog.role.id, user);
            setSelectedRoleId(null); // Reset selection to trigger re-selection
            await loadData();
            setDeleteDialog({ isOpen: false, role: null, userCount: 0 });
        } catch (err) {
            setError("Failed to delete role.");
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleCreateModalPermissionChange = (key: PermissionKey, checked: boolean) => {
        setNewRoleState(prev => {
            const newPermissions = { ...prev.permissions };
            const [feature, func, action] = key.split('.');
            const baseKey = `${feature}.${func}`;

            newPermissions[key] = checked;

            if (checked && action !== 'view') {
                newPermissions[`${baseKey}.view` as PermissionKey] = true;
            } else if (!checked && action === 'view') {
                newPermissions[`${baseKey}.create` as PermissionKey] = false;
                newPermissions[`${baseKey}.update` as PermissionKey] = false;
                newPermissions[`${baseKey}.delete` as PermissionKey] = false;
            }
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!newRoleState.name) {
            alert('Role Name is required.');
            return;
        }
        setLoading(prev => ({ ...prev, action: true }));
        try {
            const newRole = await api.addRole(newRoleState, user);
            await loadData();
            setSelectedRoleId(newRole.id);
            setIsCreateModalOpen(false);
            setNewRoleState({ name: '', permissions: {} });
        } catch (err) {
            setError("Failed to create role.");
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Roles & Permissions">
                <Button onClick={() => setIsCreateModalOpen(true)} icon={ICONS.plus}>Create Role</Button>
            </PageHeader>

            {error && <Alert message={error} onClose={() => setError(null)} />}

            <Card className="relative min-h-[500px]">
                {loading.page && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                        <Spinner size="lg" />
                    </div>
                )}
                {roleInEdit ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 border rounded-lg">
                            <div className="flex-grow min-w-[200px]">
                                <label className="block text-sm font-medium text-muted mb-1">Editing Role</label>
                                <SearchableSelect
                                    options={roles.map(r => ({ value: r.id, label: r.name }))}
                                    value={selectedRoleId}
                                    onChange={(val) => setSelectedRoleId(val)}
                                />
                            </div>
                            <div className="flex-grow min-w-[200px]">
                                <label className="block text-sm font-medium text-muted mb-1">Filter by Page/Feature</label>
                                <select
                                    value={featureFilter}
                                    onChange={e => setFeatureFilter(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white h-[42px] focus:outline-none focus:ring-primary focus:border-primary"
                                >
                                    <option value="">All Features</option>
                                    {Object.entries(PERMISSION_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-shrink-0">
                                <Button variant='danger' onClick={handleOpenDeleteDialog} disabled={roleInEdit.name === 'Admin' || loading.action}>
                                    Delete Role
                                </Button>
                            </div>
                        </div>

                        <PermissionsTable
                            permissions={roleInEdit.permissions}
                            onPermissionChange={handlePermissionChange}
                            featureFilter={featureFilter}
                            disabled={roleInEdit.name === 'Admin' || loading.action}
                        />

                        {roleInEdit.name !== 'Admin' && (
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="secondary" onClick={handleResetChanges} disabled={!hasChanges || loading.action}>Reset</Button>
                                <Button onClick={handleUpdateRole} disabled={!hasChanges || loading.action} isLoading={loading.action}>Save Changes</Button>
                            </div>
                        )}
                    </div>
                ) : !loading.page && (
                    <p className="text-muted text-center p-8">No roles found. Please create a role to begin.</p>
                )}
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Role" size="6xl">
                <form onSubmit={handleCreateRole} className="space-y-6">
                    <Input
                        label="Role Name"
                        id="roleName"
                        value={newRoleState.name}
                        onChange={(e) => setNewRoleState(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />
                    <div>
                        <h3 className="text-lg font-medium text-dark">Permissions</h3>
                        <div className="mt-2 max-h-[50vh] overflow-y-auto">
                            <PermissionsTable permissions={newRoleState.permissions} onPermissionChange={handleCreateModalPermissionChange} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={loading.action}>Create and Save Role</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={deleteDialog.isOpen} onClose={() => setDeleteDialog({ isOpen: false, role: null, userCount: 0 })} title="Delete Role">
                {deleteDialog.role && (
                    <div className="space-y-4">
                        {deleteDialog.userCount > 0 ? (
                            <div>
                                <h3 className="text-lg font-medium text-on-surface">Cannot Delete Role</h3>
                                <p className="mt-2 text-muted">
                                    The role "{deleteDialog.role.name}" cannot be deleted because it is currently assigned to {deleteDialog.userCount} user(s).
                                    Please reassign these users to another role before deleting.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-medium text-on-surface">Confirm Deletion</h3>
                                <p className="mt-2 text-muted">
                                    Are you sure you want to permanently delete the role "{deleteDialog.role.name}"? This action cannot be undone.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 gap-2">
                            {deleteDialog.userCount > 0 ? (
                                <Button onClick={() => setDeleteDialog({ isOpen: false, role: null, userCount: 0 })}>OK</Button>
                            ) : (
                                <>
                                    <Button variant="secondary" onClick={() => setDeleteDialog({ isOpen: false, role: null, userCount: 0 })}>Cancel</Button>
                                    <Button variant="danger" onClick={handleConfirmDelete} isLoading={loading.action}>Confirm Delete</Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RolesList;
