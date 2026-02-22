'use client';
import { useState } from 'react';
import styles from './MachineSelector.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';
import { TbDeviceDesktop, TbWallet, TbBuildingStore } from 'react-icons/tb';

export default function MachineSelector({ 
  machines, 
  selectedMachineId, 
  onMachineChange, 
  selectedMachine 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMachines = machines.filter(machine =>
    machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <TbDeviceDesktop className={styles.labelIcon} />
        اختر الماكينة
      </label>
      <select
        value={selectedMachineId}
        onChange={(e) => {
          onMachineChange(e.target.value);
          setSearchTerm('');
        }}
        className={styles.select}
      >
        <option value="">-- اختر الماكينة --</option>
        {filteredMachines
          .filter(m => m.isActive !== false)
          .map(machine => (
            <option key={machine.id} value={machine.id}>
              {machine.name} ({machine.code}) - رصيد: {Number(machine.balance || 0).toLocaleString('en-US')}
            </option>
          ))}
      </select>

      {selectedMachine && (
        <div className={styles.machineInfo}>
          <div className={styles.machineHeader}>
            <h4 className={styles.machineName}>{selectedMachine.name}</h4>
            <StatusBadge status={selectedMachine.isActive !== false ? 'safe' : 'blocked'}>
              {selectedMachine.isActive !== false ? 'نشط' : 'معطل'}
            </StatusBadge>
          </div>
          <div className={styles.machineDetails}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <TbBuildingStore className={styles.detailIcon} />
                الكود:
              </span>
              <span className={styles.detailValue}>
                {selectedMachine.code}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>
                <TbWallet className={styles.detailIcon} />
                الرصيد:
              </span>
              <span className={styles.detailValue}>
                {Number(selectedMachine.balance || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

