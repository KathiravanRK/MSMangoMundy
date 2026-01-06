import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// UI Components
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSuccess, product }) => {
  const [formState, setFormState] = useState({ productName: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (product) {
      setFormState({
        productName: product.productName,
        displayName: product.displayName || '',
      });
    } else {
      setFormState({ productName: '', displayName: '' });
    }
    setError(null);
  }, [product, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("You must be logged in to perform this action.");
        return;
    };
    if (!formState.productName) {
        setError('Product Name is required.');
        return;
    }
    
    setLoading(true);
    setError(null);

    try {
        if (product) {
            await api.updateProduct({ ...formState, id: product.id }, user);
        } else {
            await api.addProduct(formState, user);
        }
        onSuccess();
    } catch (err) {
        setError("Failed to save product. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? "Edit Product" : "Add New Product"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} onClose={() => setError(null)} />}
        <Input
          label="Product Name"
          id="productName"
          name="productName"
          value={formState.productName}
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
        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>{product ? 'Update Product' : 'Create Product'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductForm;
