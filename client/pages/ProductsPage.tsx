import React from 'react';
import Page from '../components/ui/Page';
import ProductsList from '../features/products/ProductsList';

const ProductsPage: React.FC = () => {
  return (
    <Page>
      <ProductsList />
    </Page>
  );
};

export default ProductsPage;
