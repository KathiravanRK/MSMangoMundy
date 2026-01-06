import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Feature } from '../../types';
import * as api from '../../services/api';
import Modal from '../../components/ui/Modal';
import { ICONS } from '../../constants';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const initialFormState = { name: '', roleId: '', contactNumber: '', password: '' };

const UsersList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formState, setFormState] = useState(initialFormState);
    const { user: actor } = useAuth();
    const { canUpdate, canDelete, canCreate } = usePermissions();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([api.fetchUsers(), api.fetchRoles()]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenModal = (user: User | null) => {
        setEditingUser(user);
        if (user) {
            setFormState({ name: user.name, roleId: user.roleId, contactNumber: user.contactNumber, password: '' });
        } else {
            setFormState(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormState(initialFormState);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actor) return;
        if (!formState.name || !formState.roleId || !formState.contactNumber) {
            alert('User Name, Contact Number, and Role are required.');
            return;
        }
        if (!editingUser && !formState.password) {
            alert('Password is required for new users.');
            return;
        }

        setLoading(true);
        try {
            if (editingUser) {
                const updatedData: User = {
                    ...editingUser,
                    name: formState.name,
                    roleId: formState.roleId,
                    contactNumber: formState.contactNumber,
                };
                if (formState.password) {
                    updatedData.password = formState.password;
                }
                await api.updateUser(updatedData, actor);
            } else {
                await api.addUser(formState, actor);
            }
            loadData();
            handleCloseModal();
        } catch (error: any) {
            console.error("Failed to save user:", error);
            alert(`Failed to save user: ${error.message}`);
            setLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!actor) return;
        if (user.role?.name === 'Admin') {
            alert('Admin user cannot be deleted.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete the user "${user.name}"?`)) {
            setLoading(true);
            try {
                await api.deleteUser(user.id, actor);
                loadData();
            } catch (error) {
                console.error("Failed to delete user:", error);
                setLoading(false);
            }
        }
    };

    const columns: Column<User>[] = useMemo(() => [
        { key: 'name', header: 'Name', accessor: 'name', sortable: true },
        { key: 'contactNumber', header: 'Contact (Login ID)', accessor: 'contactNumber', sortable: true },
        {
            key: 'role',
            header: 'Role',
            accessor: (u) => (
                <span className="px-2.5 py-1 text-xs font-bold leading-tight text-primary bg-primary/10 rounded-full border border-primary/20">
                    {u.role?.name || 'Unassigned'}
                </span>
            ),
            sortable: true,
            sortAccessor: (u) => u.role?.name || ''
        },
        {
            key: 'actions',
            header: 'Actions',
            accessor: (u) => (
                <div className="flex items-center gap-3">
                    {canUpdate(Feature.Users) && (
                        <button onClick={() => handleOpenModal(u)} className="text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                            <span className="scale-75">{ICONS.edit}</span> Edit
                        </button>
                    )}
                    {canDelete(Feature.Users) && (
                        <button onClick={() => handleDelete(u)} className="text-danger hover:text-danger-dark flex items-center gap-1 transition-colors">
                            <span className="scale-75">{ICONS.trash}</span> Delete
                        </button>
                    )}
                </div>
            )
        }
    ], [canUpdate, canDelete]);

    const [visibleCols, setVisibleCols] = useLocalStorage<string[]>('table-cols-users-list', columns.map(c => c.key));

    const renderMobileCard = (u: User) => (
        <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-dark text-lg">{u.name}</p>
                    <p className="text-sm text-muted font-medium">{u.contactNumber}</p>
                </div>
                <span className="px-2 py-1 text-xs font-bold text-primary bg-primary/10 rounded-full border border-primary/20">
                    {u.role?.name || 'Unassigned'}
                </span>
            </div>
            <div className="flex justify-end items-center gap-4 pt-3 border-t border-border-color">
                {canUpdate(Feature.Users) && (
                    <button onClick={() => handleOpenModal(u)} className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-semibold">
                        {ICONS.edit} Edit
                    </button>
                )}
                {canDelete(Feature.Users) && (
                    <button onClick={() => handleDelete(u)} className="text-danger hover:text-danger-dark flex items-center gap-1 text-sm font-semibold">
                        {ICONS.trash} Delete
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex justify-between items-center bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-sm">
                <h1 className="text-3xl font-black text-on-surface tracking-tight font-outfit">Users</h1>
                {canCreate(Feature.Users) && (
                    <Button onClick={() => handleOpenModal(null)} className="shadow-glow-primary" icon={ICONS.plus}>
                        Add User
                    </Button>
                )}
            </div>

            <SortableTable
                columns={columns}
                data={users}
                tableId="users-list"
                loading={loading}
                visibleColumns={visibleCols}
                onColumnToggle={(key) => setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
                renderMobileCard={renderMobileCard}
                searchPlaceholder="Search users..."
            />

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? "Edit User" : "Create New User"}>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label htmlFor="userName" className="block text-sm font-bold text-muted ml-1">User Name</label>
                        <input
                            type="text"
                            id="userName"
                            value={formState.name}
                            onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-border-color rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="contactNumber" className="block text-sm font-bold text-muted ml-1">Contact Number (Login ID)</label>
                        <input
                            type="text"
                            id="contactNumber"
                            value={formState.contactNumber}
                            onChange={(e) => setFormState(prev => ({ ...prev, contactNumber: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-border-color rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="password" className="block text-sm font-bold text-muted ml-1">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formState.password}
                            placeholder={editingUser ? "Leave blank to keep unchanged" : "••••••••"}
                            onChange={(e) => setFormState(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 border border-border-color rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            required={!editingUser}
                        />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="roleId" className="block text-sm font-bold text-muted ml-1">Role</label>
                        <SearchableSelect
                            options={roles.map(r => ({ value: r.id, label: r.name }))}
                            value={formState.roleId || null}
                            onChange={(val) => setFormState(prev => ({ ...prev, roleId: val || '' }))}
                            placeholder="Select a role"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t font-outfit">
                        <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={loading}>
                            {editingUser ? 'Update User' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UsersList;
