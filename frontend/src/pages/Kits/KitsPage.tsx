/**
 * Kits Page Component
 *
 * Thin wrapper page component for kit management following MachShop patterns.
 * Simply renders the KitsList component and handles any page-level concerns.
 */

import React from 'react';
import { KitsList } from '../../components/Kits/KitsList';
import { KitForm } from '../../components/Kits/KitForm';
import { useKitStore } from '../../store/kitStore';

export const KitsPage: React.FC = () => {
  // Get modal states from store
  const {
    selectedKit,
    modals,
    closeModal
  } = useKitStore();

  return (
    <>
      {/* Main Kits List */}
      <KitsList />

      {/* Create Kit Modal */}
      <KitForm
        visible={modals.createKit}
        onCancel={() => closeModal('createKit')}
        mode="create"
      />

      {/* Edit Kit Modal */}
      <KitForm
        visible={modals.editKit}
        onCancel={() => closeModal('editKit')}
        kit={selectedKit}
        mode="edit"
      />

      {/* TODO: Add other modals as needed */}
      {/* View Kit Modal */}
      {/* Generate Kits Modal */}
      {/* Assign Staging Modal */}
      {/* Scan Barcode Modal */}
    </>
  );
};

export default KitsPage;