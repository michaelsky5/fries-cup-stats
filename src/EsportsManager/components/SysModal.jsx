import React from 'react';
import styles from './SysModal.module.css';

export default function SysModal({ modal, onClose }) {
  if (!modal) return null;

  const { type, title, message, onConfirm, onCancel } = modal;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className={styles.sysModalOverlay}>
      <div className={styles.sysModalBox}>
        <div className={styles.sysModalHeader}>
          <span className={styles.sysModalTitle}>{title}</span>
        </div>
        <div className={styles.sysModalBody}>
          {message}
        </div>
        <div className={styles.sysModalFooter}>
          {type === 'confirm' && (
            <button className={styles.btnModalCancel} onClick={handleCancel}>CANCEL</button>
          )}
          <button className={styles.btnModalConfirm} onClick={handleConfirm}>ACKNOWLEDGE</button>
        </div>
      </div>
    </div>
  );
}