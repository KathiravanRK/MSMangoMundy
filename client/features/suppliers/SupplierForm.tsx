import React, { useState, useEffect } from 'react';
import { Supplier } from '../../types';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// UI Components
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ isOpen, onClose, onSuccess, supplier }) => {
  const [formState, setFormState] = useState({ supplierName: '', displayName: '', contactNumber: '', place: '', bankAccountDetails: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (supplier) {
      setFormState({
        supplierName: supplier.supplierName,
        displayName: supplier.displayName || '',
        contactNumber: supplier.contactNumber,
        place: supplier.place || '',
        bankAccountDetails: supplier.bankAccountDetails || '',
      });
    } else {
      setFormState({ supplierName: '', displayName: '', contactNumber: '', place: '', bankAccountDetails: '' });
    }
    setError(null);
  }, [supplier, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("You must be logged in to perform this action.");
        return;
    };
    if (!formState.supplierName || !formState.contactNumber) {
        setError('Supplier Name and Contact Number are required.');
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
        if (supplier) {
            await api.updateSupplier({ ...formState, id: supplier.id }, user);
        } else {
            await api.addSupplier(formState, user);
        }
        onSuccess();
    } catch (err) {
        setError("Failed to save supplier. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplier ? "Edit Supplier" : "Add New Supplier"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} onClose={() => setError(null)} />}
        <Input
          label="Supplier Name"
          id="supplierName"
          name="supplierName"
          value={formState.supplierName}
          onChange={handleInputChange}
          required
        />
        <Input
          label="Display Name (Optional)"
          id="displayName"
          name="displayName"
          value={formState.displayName}
          onChange={handleInputChange}
        />
        <Input
          label="Contact Number"
          id="contactNumber"
          name="contactNumber"
          type="tel"
          pattern="[0-9\-+\s()]*"
          title="Please enter a valid contact number."
          value={formState.contactNumber}
          onChange={handleInputChange}
          required
        />
        <Input
          label="Place"
          id="place"
          name="place"
          value={formState.place}
          onChange={handleInputChange}
        />
        <div>
          <label htmlFor="bankAccountDetails" className="block text-sm font-medium text-muted mb-1">Bank Account Details</label>
          <textarea
            id="bankAccountDetails"
            name="bankAccountDetails"
            value={formState.bankAccountDetails}
            onChange={handleInputChange}
            rows={4}
            className="block w-full px-3 py-2 border border-border-color rounded-md shadow-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="e.g.&#10;Bank Name: State Bank of India&#10;Account No: 1234567890&#10;IFSC: SBIN0001234"
          />
        </div>
        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>{supplier ? 'Update Supplier' : 'Create Supplier'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierForm;
