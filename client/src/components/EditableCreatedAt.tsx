import React, { useState, useRef } from 'react';
import { DatePicker, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { GuildMember } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import dayjs from 'dayjs';

// Editable created at component
interface EditableCreatedAtProps {
  createdAt: string;
  record: GuildMember;
  onUpdate: (id: number, member: GuildMember) => Promise<void>;
}

const EditableCreatedAt: React.FC<EditableCreatedAtProps> = ({ createdAt, record, onUpdate }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(createdAt);
  const datePickerRef = useRef<any>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(createdAt);
    setTimeout(() => {
      datePickerRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (editValue !== createdAt) {
      try {
        const memberId = record.id;
        if (!memberId) {
          throw new Error(t('guildMember.messages.invalidMemberId'));
        }
        await onUpdate(memberId, { ...record, createdAt: editValue });
        setIsEditing(false);
        message.success(t('guildMember.messages.createdAtUpdateSuccess'));
      } catch (error) {
        console.error('Failed to update created at:', error);
        setEditValue(createdAt); // Restore original value
        message.error(t('guildMember.messages.createdAtUpdateFailed'));
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(createdAt);
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <DatePicker
          ref={datePickerRef}
          value={editValue ? dayjs(editValue) : null}
          onChange={(date) => {
            const dateString = date ? date.format('YYYY-MM-DD') : '';
            setEditValue(dateString);
          }}
          placeholder={t('guildMember.form.placeholders.createdAt')}
          format="YYYY-MM-DD"
          style={{ width: '120px' }}
          size="small"
        />
        <button
          onClick={handleSave}
          style={{
            padding: '2px 6px',
            fontSize: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            color: '#1890ff'
          }}
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          style={{
            padding: '2px 6px',
            fontSize: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            color: '#999'
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  const displayValue = createdAt ? dayjs(createdAt).format('M/D/YY') : '-';

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 4, 
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onClick={handleEdit}
      title={createdAt ? dayjs(createdAt).format('YYYY-MM-DD') : ''}
    >
      <span style={{ color: '#333', fontSize: '13px', fontWeight: '500' }}>
        {displayValue}
      </span>
      <EditOutlined style={{ fontSize: '10px', color: '#999', opacity: 0.6 }} />
    </div>
  );
};

export default EditableCreatedAt;