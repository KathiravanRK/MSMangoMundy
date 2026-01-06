import React, { useState, useEffect } from 'react';
import { Buyer } from '../../types';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// UI Components
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

interface BuyerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  buyer: Buyer | null;
}

const BuyerForm: React.FC<BuyerFormProps> = ({ isOpen, onClose, onSuccess, buyer }) => {
  const [formState, setFormState] = useState({ buyerName: '', displayName: '', contactNumber: '', place: '', alias: '', tokenNumber: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDisplayNameDirty, setIsDisplayNameDirty] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (buyer) {
      setFormState({
        buyerName: buyer.buyerName,
        displayName: buyer.displayName || buyer.buyerName,
        contactNumber: buyer.contactNumber,
        place: buyer.place || '',
        alias: buyer.alias || '',
        tokenNumber: buyer.tokenNumber || '',
        description: buyer.description || '',
      });
      setIsDisplayNameDirty(true); // For existing buyers, it's always "dirty"
    } else {
      setFormState({ buyerName: '', displayName: '', contactNumber: '', place: '', alias: '', tokenNumber: '', description: '' });
      setIsDisplayNameDirty(false); // For new buyers, allow autofill
    }
    setError(null);
  }, [buyer, isOpen]);

  useEffect(() => {
    if (!buyer && !isDisplayNameDirty) {
        setFormState(prev => ({...prev, displayName: prev.buyerName}));
    }
  }, [formState.buyerName, isDisplayNameDirty, buyer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'displayName') {
        setIsDisplayNameDirty(true);
    }
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("You must be logged in to perform this action.");
        return;
    };
    if (!formState.buyerName || !formState.contactNumber) {
        setError('Buyer Name and Contact Number are required.');
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
        if (buyer) {
            await api.updateBuyer({ ...formState, id: buyer.id }, user);
        } else {
            await api.addBuyer(formState, user);
        }
        onSuccess();
    } catch (err) {
        setError("Failed to save buyer. Please try again.");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={buyer ? "Edit Buyer" : "Add New Buyer"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} onClose={() => setError(null)} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Buyer Name (Legal Name)"
              id="buyerName"
              name="buyerName"
              value={formState.buyerName}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Display Name"
              id="displayName"
              name="displayName"
              value={formState.displayName}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Alias (Optional)"
              id="alias"
              name="alias"
              value={formState.alias}
              onChange={handleInputChange}
            />
            <Input
              label="Token Number (Optional)"
              id="tokenNumber"
              name="tokenNumber"
              value={formState.tokenNumber}
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
        </div>
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted mb-1">Description / Notes</label>
            <textarea
                id="description"
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-3 py-2 border border-border-color rounded-md shadow-sm bg-surface placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
        </div>
        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>{buyer ? 'Update Buyer' : 'Create Buyer'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default BuyerForm;
